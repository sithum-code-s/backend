import { GoogleGenAI } from "@google/genai";
import { retry } from "./ai.retry";
import type { GenerateAddOnsDto } from "./ai.dtos";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const TIMEOUT_MS = 25000;

const withTimeout = async <T>(promise: Promise<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI_TIMEOUT")), TIMEOUT_MS);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const extractJSON = (text: string) => {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("INVALID_JSON_FROM_AI");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
};

export interface GenerateAddOnsInput extends GenerateAddOnsDto {
  itineraries?: { dayNumber: number; title?: string; description?: string }[];
}

export interface GenerateAddOnsOutput {
  inclusions: { description: string }[];
  exclusions: { description: string; additionalPrice: number }[];
}

const normalizeNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed * 100) / 100;
};

const normalizeCappedNumber = (value: unknown, fallback: number, cap?: number) => {
  const normalized = normalizeNumber(value, fallback);
  if (typeof cap !== 'number' || !Number.isFinite(cap)) {
    return normalized;
  }

  return Math.min(normalized, Math.max(0, Math.round(cap * 100) / 100));
};

const normalizeOutput = (raw: any): GenerateAddOnsOutput => {
  const inclusions = Array.isArray(raw?.inclusions)
    ? raw.inclusions
        .map((item: any) => ({
          description: String(item?.description || "").trim(),
        }))
        .filter((item: { description: string }) => item.description)
    : [];

  const exclusions = Array.isArray(raw?.exclusions)
    ? raw.exclusions
        .map((item: any) => ({
          description: String(item?.description || "").trim(),
          additionalPrice: normalizeNumber(item?.additionalPrice, 0),
        }))
        .filter((item: { description: string }) => item.description)
    : [];

  return {
    inclusions,
    exclusions,
  };
};

export const generateAddOnsAI = async (
  input: GenerateAddOnsInput
): Promise<GenerateAddOnsOutput> => {
  try {
    const priceCap =
      typeof input.displayedPrice === 'number'
        ? input.displayedPrice
        : typeof input.dealPrice === 'number'
        ? input.dealPrice
        : undefined;
    const itineraryContext = (input.itineraries || [])
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((item) => `Day ${item.dayNumber}: ${item.title || `Day ${item.dayNumber}`} - ${item.description || ""}`)
      .join("\n");
    const itinerarySection = itineraryContext
      ? `\nItinerary context:\n${itineraryContext}\n`
      : "";

    const result = await retry(async () => {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `
You are a travel package pricing expert.

Return ONLY JSON in this format:
{
  "inclusions":[{"description":""}],
  "exclusions":[{"description":"","additionalPrice":0}]
}

Trip info:
Deal name: ${input.title}
Location: ${input.location}
Days: ${input.durationDays}
Deal price: ${input.dealPrice ?? "N/A"}
Displayed price: ${input.displayedPrice ?? "N/A"}
Description: ${input.description || ""}
Notes: ${input.notes || ""}
${itinerarySection}

Rules:
- Generate inclusions the traveler gets without extra cost. Do not include prices for inclusions.
- Generate exclusions that are optional add-ons or items not included, with realistic extra prices.
- Exclusion prices must never exceed the deal's displayed price when present, otherwise the deal price.
- Keep descriptions practical and specific to the deal and itinerary.
- Output only valid JSON.
          `,
          config: {
            temperature: 0.4,
            responseMimeType: "application/json",
          },
        })
      );

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text.trim()) {
        throw new Error("EMPTY_AI_RESPONSE");
      }

      return extractJSON(text);
    });

    const normalized = normalizeOutput(result);

    return {
      inclusions: normalized.inclusions,
      exclusions: normalized.exclusions.map((item) => ({
        description: item.description,
        additionalPrice: normalizeCappedNumber(item.additionalPrice, 0, priceCap),
      })),
    };
  } catch (error) {
    console.error("AI add-ons error:", error);
    throw new Error("Failed to generate add-ons");
  }
};
