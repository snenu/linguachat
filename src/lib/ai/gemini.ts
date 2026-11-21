import "server-only";
import { GoogleGenAI, type Schema } from "@google/genai";
import { env } from "@/lib/server/env";
import { HttpError } from "@/lib/server/http";

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!env.geminiKey) throw new HttpError(503, "The AI coach isn't configured yet.", "ai_unavailable");
  client ??= new GoogleGenAI({ apiKey: env.geminiKey });
  return client;
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429 || status === 500 || status === 503 || status === 504) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /ECONNRESET|ENOTFOUND|ETIMEDOUT|fetch failed|aborted|timeout|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

interface GenerateOptions {
  system: string;
  parts: Part[];
  schema?: Schema;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

/**
 * Calls Gemini with retries (exponential backoff on 429/5xx/network) across the configured
 * model chain (GEMINI_MODEL then GEMINI_FALLBACK_MODEL). Returns the raw text.
 */
async function generate(opts: GenerateOptions): Promise<string> {
  const models = env.geminiModels;
  if (models.length === 0) throw new HttpError(503, "The AI coach isn't configured yet.", "ai_unavailable");
  let lastErr: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai().models.generateContent({
          model,
          contents: [{ role: "user", parts: opts.parts }],
          config: {
            systemInstruction: opts.system,
            maxOutputTokens: opts.maxOutputTokens ?? 600,
            temperature: opts.temperature ?? 0.4,
            abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
            ...(opts.schema ? { responseMimeType: "application/json", responseSchema: opts.schema } : {}),
          },
        });
        const text = res.text ?? "";
        if (!text.trim()) throw Object.assign(new Error("empty response"), { status: 503 });
        return text;
      } catch (err) {
        lastErr = err;
        if (!isRetryable(err)) break;
        await sleep(400 * 2 ** attempt + Math.random() * 200);
      }
    }
  }
  console.error("[gemini] all models failed", lastErr instanceof Error ? lastErr.message.slice(0, 200) : lastErr);
  throw new HttpError(503, "The coach is busy right now. Try again in a moment.", "ai_busy");
}

export async function generateJson<T>(opts: GenerateOptions & { schema: Schema }): Promise<T> {
  const text = await generate(opts);
  try {
    return JSON.parse(text) as T;
  } catch {
    // Some models wrap JSON in fences; strip and retry parse once.
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new HttpError(503, "The coach is busy right now. Try again in a moment.", "ai_bad_output");
    }
  }
}

export async function generateText(opts: GenerateOptions): Promise<string> {
  return (await generate(opts)).trim();
}

/**
 * Streams text from Gemini, yielding chunks. Falls back across models only before the first
 * chunk arrives (after that, a failure ends the stream with what was produced).
 */
export async function* streamText(opts: GenerateOptions): AsyncGenerator<string> {
  const models = env.geminiModels;
  let lastErr: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let yielded = false;
      try {
        const stream = await ai().models.generateContentStream({
          model,
          contents: [{ role: "user", parts: opts.parts }],
          config: {
            systemInstruction: opts.system,
            maxOutputTokens: opts.maxOutputTokens ?? 500,
            temperature: opts.temperature ?? 0.7,
            abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
          },
        });
        for await (const chunk of stream) {
          const t = chunk.text;
          if (t) {
            yielded = true;
            yield t;
          }
        }
        if (yielded) return;
        throw Object.assign(new Error("empty stream"), { status: 503 });
      } catch (err) {
        if (yielded) return;
        lastErr = err;
        if (!isRetryable(err)) break;
        await sleep(400 * 2 ** attempt);
      }
    }
  }
  console.error("[gemini] stream failed", lastErr instanceof Error ? lastErr.message.slice(0, 200) : lastErr);
  throw new HttpError(503, "The tutor is busy right now. Try again in a moment.", "ai_busy");
}
