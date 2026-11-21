import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { TutorTurn } from "@/lib/ai/coach";
import { sendDirect, streamDirectChunk } from "@/lib/nexconn/server";
import { MSG, type SignalContent } from "@/lib/nexconn/types";
import { HttpError } from "./http";

/**
 * Pipes a Gemini text stream into a Nexconn RC:StreamMsg from the tutor bot, so the learner sees
 * the reply grow in real time. Chunks are batched (~250 ms) to stay well within rate limits.
 * The most recent piece is always held back so the final chunk (complete: true) carries text.
 */
export async function streamReplyToNexconn(opts: {
  botId: string;
  toUserId: string;
  source: AsyncGenerator<string>;
  sessionId: string;
}): Promise<{ text: string; messageId: string | null }> {
  let seq = 1;
  let messageId: string | undefined;
  let pending = "";
  let full = "";
  let lastSend = 0;

  const send = async (text: string, complete: boolean) => {
    const first = !messageId;
    messageId = await streamDirectChunk({
      fromUserId: opts.botId,
      toUserId: opts.toUserId,
      text,
      seq,
      complete,
      messageId,
      extra: { sessionId: opts.sessionId },
    });
    seq++;
    lastSend = Date.now();
    // Stream messages are not pushed to Web clients live, so tell the learner's client which
    // message to pull (it then calls requestStreamMessage and receives the chunks as they grow).
    if (first && messageId) {
      await sendDirect({
        fromUserId: opts.botId,
        toUserIds: [opts.toUserId],
        messageType: MSG.signal,
        content: { kind: "stream", messageId } satisfies SignalContent,
        persist: false,
      }).catch(() => undefined);
    }
  };

  try {
    for await (const chunk of opts.source) {
      full += chunk;
      pending += chunk;
      const now = Date.now();
      if (!messageId && pending.length >= 12) {
        await send(pending, false);
        pending = "";
      } else if (messageId && now - lastSend > 250 && pending.length > 24) {
        await send(pending, false);
        pending = "";
      }
    }
  } catch (err) {
    if (!messageId) throw err instanceof HttpError ? err : new HttpError(503, "The tutor is busy right now. Try again in a moment.", "ai_busy");
    pending += pending ? "" : "…";
  }
  if (!full.trim()) throw new HttpError(503, "The tutor is busy right now. Try again in a moment.", "ai_busy");
  await send(pending || " ", true);
  return { text: full.trim(), messageId: messageId ?? null };
}

export async function sessionHistory(sessionId: string): Promise<TutorTurn[]> {
  const rows = await db
    .select({ role: schema.tutorTurns.role, text: schema.tutorTurns.text })
    .from(schema.tutorTurns)
    .where(eq(schema.tutorTurns.sessionId, sessionId))
    .orderBy(asc(schema.tutorTurns.id));
  return rows;
}

export async function ownedSession(userId: string, sessionId: string) {
  const [s] = await db
    .select()
    .from(schema.tutorSessions)
    .where(and(eq(schema.tutorSessions.id, sessionId), eq(schema.tutorSessions.userId, userId)))
    .limit(1);
  if (!s) throw new HttpError(404, "Practice session not found", "not_found");
  return s;
}

/** Learner-facing description of each built-in scene (the AI brief is written for the tutor). */
export const LEARNER_SCENES: Record<string, string> = {
  cafe: "You're a customer at a busy café. Order something to drink and eat, and ask about the menu.",
  interview: "You're interviewing for a job you want. Introduce yourself and answer the manager's questions.",
  travel: "You're travelling. Ask a local for directions, tickets and recommendations.",
  doctor: "You're at the doctor's. Describe how you feel and answer their questions.",
  smalltalk: "You've just met someone at a party. Chat about hobbies, work and weekend plans.",
};
