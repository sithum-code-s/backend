import { GoogleGenAI } from "@google/genai";
import { retry } from "./ai.retry";

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

export interface GenerateItineraryInput {
  title: string;
  description?: string;
  location: string;
  durationDays: number;
  generationDay?: number;
  previousItineraries?: { dayNumber: number; title: string; description?: string }[];
  futureItineraries?: { dayNumber: number; title: string; description?: string }[];
  travelerType: string;
  travelStyle: string;
  accommodationLevel: string;
  highlights: string;
  pace: "relaxed" | "balanced" | "packed";
  notes?: string;
}

export interface GenerateItineraryOutput {
  itineraries: { dayNumber: number; title: string; description: string }[];
}

const normalizeOutput = (
  raw: any,
  fallbackDays: number,
  generationDay?: number
): GenerateItineraryOutput => {
  const itineraries = Array.isArray(raw?.itineraries)
    ? raw.itineraries
        .map((item: any, index: number) => ({
          dayNumber: Number(item?.dayNumber) > 0 ? Number(item.dayNumber) : index + 1,
          title: String(item?.title || `Day ${index + 1}`),
          description: String(item?.description || ""),
        }))
        .slice(0, Math.max(1, fallbackDays))
    : [];

  let safeItineraries = itineraries.length
    ? itineraries
    : Array.from({ length: Math.max(1, fallbackDays) }, (_, index) => ({
        dayNumber: index + 1,
        title: `Day ${index + 1}`,
        description: "AI could not generate this day. Please add details manually.",
      }));

  if (generationDay && generationDay > 0) {
    const matchedDay =
      safeItineraries.find((item: { dayNumber: number; title: string; description: string }) => item.dayNumber === generationDay) || safeItineraries[0] || {
        dayNumber: generationDay,
        title: `Day ${generationDay}`,
        description: "AI could not generate this day. Please add details manually.",
      };

    safeItineraries = [
      {
        dayNumber: generationDay,
        title: matchedDay.title,
        description: matchedDay.description,
      },
    ];
  }

  return {
    itineraries: safeItineraries,
  };
};

export const generateItineraryAI = async (
  input: GenerateItineraryInput
): Promise<GenerateItineraryOutput> => {
  try {
    const previousDaysContext = (input.previousItineraries || [])
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((item) => `Day ${item.dayNumber}: ${item.title} - ${item.description || ""}`)
      .join("\n");

    const futureDaysContext = (input.futureItineraries || [])
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((item) => `Day ${item.dayNumber}: ${item.title} - ${item.description || ""}`)
      .join("\n");

    const dayContextRule = input.generationDay
      ? input.generationDay === 1
        ? "This is the first day edit: prioritize future days context only."
        : input.generationDay === input.durationDays
        ? "This is the last day edit: prioritize previous days context only."
        : "This is a middle day edit: use both previous and future day contexts."
      : "No specific day requested: generate full itinerary.";

    const daySpecificInstruction = input.generationDay
      ? `Generate only Day ${input.generationDay} in the itineraries array. Keep continuity and avoid conflicts with provided context days.`
      : `Generate full itinerary for all ${input.durationDays} days.`;

    const result = await retry(async () => {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `
You are a travel expert creating day-by-day travel itineraries.

Return ONLY JSON in this format:
{
  "itineraries":[{"dayNumber":1,"title":"","description":""}]
}

Trip info:
Deal name: ${input.title}
Location: ${input.location}
Days: ${input.durationDays}
Description: ${input.description || ""}

Traveler type: ${input.travelerType}
Travel style: ${input.travelStyle}
Accommodation level: ${input.accommodationLevel}
Trip pace: ${input.pace}
Highlights from merchant: ${input.highlights}
Notes: ${input.notes || ""}
Current day to generate: ${input.generationDay || "all days"}
Previously generated days:\n${previousDaysContext || "None"}
Already written future days:\n${futureDaysContext || "None"}

Make itinerary realistic, chronological, and appealing for customers.
${daySpecificInstruction}
${dayContextRule}
          `,
          config: {
            temperature: 0.35,
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

    return normalizeOutput(result, input.durationDays, input.generationDay);
  } catch (error) {
    console.error("AI itinerary error:", error);
    throw new Error("Failed to generate itinerary");
  }
};
