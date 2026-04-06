import { GoogleGenAI } from "@google/genai";
import { PostCategory, ALL_TAGS } from "./post.enum";
import { retry } from "./ai.retry";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const TIMEOUT_MS = 25000;

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI_TIMEOUT")), TIMEOUT_MS);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

/**
 * Gemini sometimes wraps JSON in markdown or adds text.
 * This safely extracts the first JSON object found.
 */
const safeParseJSON = (text: string) => {
  try {
    // remove markdown
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // find first JSON object in string
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    const jsonString = cleaned.substring(firstBrace, lastBrace + 1);

    return JSON.parse(jsonString);
  } catch (err) {
    throw new Error("INVALID_JSON_FROM_AI");
  }
};

const fallbackResult = {
  category: PostCategory.RELAXATION,
  tags: ["general", "travel"],
};

/* -------------------------------------------------------------------------- */
/*                              MAIN AI FUNCTION                              */
/* -------------------------------------------------------------------------- */

export const categorizePost = async (content: string) => {
  if (!content || content.trim().length < 5) return fallbackResult;

  try {
    const result = await retry(async () => {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-2.5-flash",

          contents: `
You are a classifier for a Maldives travel social app.

Return ONLY valid JSON.
No explanation.
No markdown.
No extra text.

Choose ONE category and 2-5 relevant tags.

Allowed Categories:
${Object.values(PostCategory).join(", ")}

Allowed Tags:
${ALL_TAGS.join(", ")}

Post:
"${content}"

Output EXACTLY in this format:
{"category":"CATEGORY_NAME","tags":["tag1","tag2"]}
`,

          config: {
            temperature: 0.2, // more deterministic
            responseMimeType: "application/json",
          },
        })
      );

      const text =
        response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      console.log("🤖 AI RAW RESPONSE:", text);

      if (!text) throw new Error("EMPTY_AI_RESPONSE");

      const parsed = safeParseJSON(text);

      /* ------------------------------------------------------------------ */
      /*                          VALIDATE CATEGORY                          */
      /* ------------------------------------------------------------------ */

      if (!Object.values(PostCategory).includes(parsed.category)) {
        parsed.category = fallbackResult.category;
      }

      /* ------------------------------------------------------------------ */
      /*                            VALIDATE TAGS                            */
      /* ------------------------------------------------------------------ */

      let validTags: string[] = [];

      if (Array.isArray(parsed.tags)) {
        validTags = parsed.tags.filter((tag: string) =>
          ALL_TAGS.includes(tag as any)
        );
      }

      // dedupe
      validTags = Array.from(new Set(validTags));

      // ensure minimum tags
      if (validTags.length === 0) validTags = fallbackResult.tags;
      if (validTags.length > 5) validTags = validTags.slice(0, 5);

      return {
        category: parsed.category,
        tags: validTags,
      };
    });

    return result;
  } catch (err) {
    console.error("❌ AI ERROR:", err);
    return fallbackResult;
  }
};