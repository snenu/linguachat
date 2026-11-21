import { correctSentence, transcribeAudio } from "@/lib/ai/coach";
import { setMessageMetadata } from "@/lib/nexconn/server";
import { META, type VoiceMeta } from "@/lib/nexconn/types";
import { assertDirectAccess, assertRoomMember, logActivity } from "@/lib/server/domain";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { logMistake } from "@/lib/server/mistakes";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { voiceSchema } from "@/lib/validation";

export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024;

function assertSafeUrl(raw: string): URL {
  const url = new URL(raw);
  const host = url.hostname;
  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":");
  if (url.protocol !== "https:" || isIp || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new HttpError(400, "Unsupported audio location", "invalid_input");
  }
  return url;
}

function sniffMime(buf: Uint8Array, header: string | null): string {
  const ascii = (s: number, e: number) => String.fromCharCode(...buf.slice(s, e));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "audio/wav";
  if (ascii(0, 4) === "OggS") return "audio/ogg";
  if (ascii(0, 4) === "fLaC") return "audio/flac";
  if (ascii(0, 3) === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return "audio/mp3";
  if (ascii(4, 8) === "ftyp") return "audio/mp4";
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "audio/webm";
  return header?.startsWith("audio/") ? header.split(";")[0] : "audio/wav";
}

/**
 * Transcribes an HD voice message with Gemini. For the sender's own voice in the target language
 * it also corrects it. The result is attached to the Nexconn message as metadata.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, voiceSchema);
  if (input.channelType === "direct") await assertDirectAccess(me, input.channelId);
  else await assertRoomMember(me, input.channelId);
  await rateLimit(`voice:${me.id}`, 60, 3600, "That's a lot of voice messages this hour. Try again shortly.");

  const url = assertSafeUrl(input.remoteUrl);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res || !res.ok) throw new HttpError(502, "Couldn't download the voice message. Try again.", "download_failed");
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) throw new HttpError(413, "Voice message is too long to transcribe", "too_large");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new HttpError(413, "Voice message is too long to transcribe", "too_large");

  const mimeType = sniffMime(buf, res.headers.get("content-type"));
  const { transcript, language } = await transcribeAudio(
    { data: Buffer.from(buf).toString("base64"), mimeType },
    input.own ? me.targetLanguage : me.nativeLanguages[0] ?? me.targetLanguage,
  );
  if (!transcript) {
    return json({ transcript: "", corrected: null, explanation: null, attached: false });
  }

  const meta: VoiceMeta = { transcript: transcript.slice(0, 1500) };
  if (input.own) {
    const ctx = { targetLanguage: me.targetLanguage, nativeLanguage: me.nativeLanguages[0] ?? "en", level: me.targetLevel };
    const correction = await correctSentence(transcript, ctx).catch(() => null);
    const inTarget = correction?.inTargetLanguage || language === me.targetLanguage;
    await logActivity(me, "voice", me.targetLanguage, input.messageId);
    if (inTarget) await logActivity(me, "message_target", me.targetLanguage, input.messageId);
    if (correction && inTarget && !correction.ok) {
      meta.corrected = correction.corrected.slice(0, 1200);
      meta.explanation = correction.explanation.slice(0, 400);
      meta.category = correction.category;
      await logMistake({
        userId: me.id,
        language: me.targetLanguage,
        original: transcript,
        correction,
        source: "voice",
        messageId: input.messageId,
      });
    }
  }

  let attached = false;
  try {
    await setMessageMetadata({
      messageId: input.messageId,
      operatorUserId: me.nexconnId,
      channelType: input.channelType === "direct" ? 1 : 3,
      channelId: input.channelId,
      metadata: { [META.voice]: JSON.stringify(meta) },
    });
    attached = true;
  } catch (err) {
    console.warn("[voice] metadata failed", err instanceof Error ? err.message : err);
  }
  return json({ ...meta, language, attached });
});
