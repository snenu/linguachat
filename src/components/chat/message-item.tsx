"use client";

import { AlertCircle, BookmarkPlus, CheckCheck, ChevronDown, Languages, Lightbulb, PenLine, Reply, Volume2 } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage } from "@/lib/client/api";
import { speak } from "@/lib/client/speech";
import { segmentWords } from "@/lib/client/speech";
import { MISTAKE_LABELS, type MistakeCategory } from "@/lib/languages";
import type { ChatMessage } from "@/lib/nexconn/model";
import {
  META,
  MSG,
  type AiCorrectionMeta,
  type CorrectionCardContent,
  type NoticeContent,
  type RoomPromptContent,
  type TutorTipContent,
  type VocabCardContent,
  type VoiceMeta,
} from "@/lib/nexconn/types";

export interface MessageActions {
  onReply: (m: ChatMessage) => void;
  onWord: (word: string, sentence: string) => void;
  onCorrect?: (m: ChatMessage, text: string) => void;
  onSaveCard?: (card: VocabCardContent) => void;
  onUseHint?: (text: string) => void;
  onRetry?: (m: ChatMessage) => void;
  onDiscard?: (m: ChatMessage) => void;
  onTranscribe?: (m: ChatMessage) => void;
}

function parseMeta<T>(m: ChatMessage, key: string): T | null {
  const raw = m.metadata[key];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function time(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Strike-through original next to the corrected version (the core visual of LinguaChat). */
export function CorrectionDiff({ original, corrected }: { original: string; corrected: string }) {
  return (
    <p className="leading-relaxed">
      <span className="strike">{original}</span> <span className="corrected">{corrected}</span>
    </p>
  );
}

function CoachNote({ meta, label = "Coach note" }: { meta: AiCorrectionMeta; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5 max-w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-xs font-semibold text-accent-ink hover:bg-accent-wash"
      >
        <PenLine size={13} aria-hidden="true" />
        {label}: {MISTAKE_LABELS[(meta.category as MistakeCategory) ?? "other"]?.toLowerCase() ?? "suggestion"}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="animate-ink-in mt-1 rounded-md border border-accent/30 bg-accent-wash px-3 py-2 text-sm text-ink">
          <p className="corrected text-[0.95rem]">{meta.corrected}</p>
          {meta.explanation && <p className="mt-1 text-ink-2">{meta.explanation}</p>}
        </div>
      )}
    </div>
  );
}

function Tappable({ text, lang, onWord }: { text: string; lang?: string | null; onWord: (w: string) => void }) {
  return (
    <>
      {segmentWords(text, lang).map((s, i) =>
        s.word ? (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWord(s.text);
            }}
            className="rounded-[3px] underline decoration-dotted decoration-1 underline-offset-[3px] hover:bg-marker/60"
          >
            {s.text}
          </button>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

export function MessageItem({
  m,
  text,
  senderName,
  senderAvatar,
  showSender,
  isBot,
  read,
  lang,
  actions,
  canCorrect,
  coachChecking,
}: {
  m: ChatMessage;
  text: string;
  senderName: string;
  senderAvatar?: string | null;
  showSender: boolean;
  isBot: boolean;
  read: boolean;
  lang: string | null;
  actions: MessageActions;
  canCorrect: boolean;
  coachChecking: boolean;
}) {
  const [selected, setSelected] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [tError, setTError] = useState<string | null>(null);

  // ---- system-like custom messages -----------------------------------------------------------
  if (m.type === MSG.notice) {
    const c = m.content as unknown as NoticeContent;
    return (
      <div className="my-3 flex justify-center">
        <p className="max-w-lg rounded-md border border-line bg-surface px-4 py-2.5 text-center text-sm text-ink-2">{c.text}</p>
      </div>
    );
  }
  if (m.type === MSG.roomPrompt) {
    const c = m.content as unknown as RoomPromptContent;
    return (
      <div className="my-3 rounded-lg border border-ink bg-surface p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-ink-2">
          <Lightbulb size={14} aria-hidden="true" /> Today&apos;s conversation prompt
        </p>
        <p className="mt-2 font-pen text-lg text-ink" lang={c.language}>
          {c.prompt}
        </p>
        {c.hint && (
          <p className="mt-1.5 text-sm text-ink-2" lang={c.language}>
            Useful: {c.hint}
          </p>
        )}
        {actions.onUseHint && (
          <button type="button" onClick={() => actions.onReply(m)} className="mt-3 text-sm font-semibold text-accent-ink underline underline-offset-2">
            Reply to the prompt
          </button>
        )}
      </div>
    );
  }
  if (m.type === MSG.tutorTip) {
    const c = m.content as unknown as TutorTipContent;
    return (
      <div className={`my-3 rounded-lg border p-4 ${c.kind === "scene" ? "border-ink bg-surface" : "border-accent/40 bg-accent-wash"}`}>
        <p className="flex items-center gap-2 text-xs font-semibold text-ink-2">
          <Lightbulb size={14} aria-hidden="true" /> {c.kind === "scene" ? "New scene" : "Tutor tip"}
        </p>
        <p className="mt-1.5 font-display text-lg font-semibold text-ink">{c.title}</p>
        {c.kind === "scene" ? (
          <>
            <p className="mt-1 text-ink">{c.items[0]}</p>
            {c.items[1] && <p className="mt-1 text-sm text-ink-3">{c.items[1]}</p>}
          </>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {c.items.map((item) => {
              const phrase = item.replace(/\s*\([^)]*\)\s*$/, "");
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => actions.onUseHint?.(phrase)}
                    className="w-full rounded-md border border-line bg-surface px-3 py-2 text-left text-sm text-ink hover:border-accent"
                    lang={lang ?? undefined}
                  >
                    {item}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // ---- regular messages ----------------------------------------------------------------------
  const out = m.outgoing;
  const aic = parseMeta<AiCorrectionMeta>(m, META.aiCorrection);
  const voice = parseMeta<VoiceMeta>(m, META.voice);
  const quote = (() => {
    if (m.type !== MSG.reference) return null;
    const extra = (m.content as { extra?: string }).extra;
    try {
      return extra ? (JSON.parse(extra) as { q?: string }).q ?? null : null;
    } catch {
      return null;
    }
  })();
  const isTextual = m.type === MSG.text || m.type === MSG.reference || m.type === MSG.stream;

  async function translate() {
    if (translation || translating || !text) {
      setTranslation((t) => (t ? null : t));
      return;
    }
    setTranslating(true);
    setTError(null);
    try {
      const r = await api<{ translation: string }>("/api/ai/translate", { body: { text } });
      setTranslation(r.translation);
    } catch (err) {
      setTError(errorMessage(err));
    } finally {
      setTranslating(false);
    }
  }

  let body: React.ReactNode;
  if (m.type === MSG.correction) {
    const c = m.content as unknown as CorrectionCardContent;
    body = (
      <div className={`rounded-lg border px-4 py-3 ${out ? "border-line-strong bg-surface" : "border-accent/40 bg-accent-wash"}`}>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
          <PenLine size={13} aria-hidden="true" /> {out ? "You sent a correction" : `${senderName} corrected you`}
        </p>
        <div className="mt-1.5 text-[0.95rem] text-ink" lang={c.language}>
          <CorrectionDiff original={c.original} corrected={c.corrected} />
        </div>
        {c.note && <p className="mt-1.5 text-sm text-ink-2">{c.note}</p>}
      </div>
    );
  } else if (m.type === MSG.vocabCard) {
    const c = m.content as unknown as VocabCardContent;
    body = (
      <div className="rounded-lg border border-line-strong bg-surface px-4 py-3">
        <p className="text-xs font-semibold text-ink-2">{out ? "You shared a word" : `${senderName} shared a word`}</p>
        <p className="mt-1 font-pen text-xl font-semibold text-ink" lang={c.language}>
          <span className="marker">{c.term}</span> {c.reading && <span className="text-sm font-normal text-ink-3">{c.reading}</span>}
        </p>
        <p className="text-ink">{c.meaning}</p>
        {c.example && (
          <p className="mt-1 text-sm text-ink-2 italic" lang={c.language}>
            {c.example}
          </p>
        )}
        <div className="mt-2 flex gap-3">
          <button type="button" onClick={() => speak(c.term, c.language)} className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
            <Volume2 size={14} /> Listen
          </button>
          {!out && actions.onSaveCard && (
            <button type="button" onClick={() => actions.onSaveCard?.(c)} className="inline-flex items-center gap-1 text-sm font-semibold text-accent-ink">
              <BookmarkPlus size={14} /> Save to my words
            </button>
          )}
        </div>
      </div>
    );
  } else if (m.type === MSG.hdVoice) {
    const c = m.content as { remoteUrl?: string; duration?: number };
    body = (
      <div className={`rounded-lg px-3 py-2.5 ${out ? "bg-ink text-surface" : "border border-line bg-surface text-ink"}`}>
        {c.remoteUrl ? (
          <audio controls preload="none" src={c.remoteUrl} className="h-9 w-56 max-w-full" aria-label={`Voice message, ${c.duration ?? 0} seconds`} />
        ) : (
          <span className="flex items-center gap-2 text-sm">
            <Spinner size={14} /> Uploading voice…
          </span>
        )}
        <p className={`mt-1 text-xs ${out ? "text-surface/70" : "text-ink-3"}`}>Voice · {c.duration ?? 0}s</p>
      </div>
    );
  } else {
    body = (
      <div
        className={`rounded-lg px-3.5 py-2.5 text-[0.97rem] leading-relaxed break-words whitespace-pre-wrap ${
          out ? "rounded-br-sm bg-ink text-surface" : isBot ? "rounded-bl-sm border border-accent/30 bg-surface text-ink" : "rounded-bl-sm border border-line bg-surface text-ink"
        }`}
        lang={lang ?? undefined}
      >
        {quote && (
          <p className={`mb-1.5 border-l-2 pl-2 text-sm ${out ? "border-surface/40 text-surface/75" : "border-line-strong text-ink-2"}`}>{quote}</p>
        )}
        {selected && !out && isTextual ? <Tappable text={text} lang={lang} onWord={(w) => actions.onWord(w, text)} /> : text || <Spinner size={14} />}
      </div>
    );
  }

  return (
    <div className={`group flex gap-2.5 ${out ? "flex-row-reverse" : ""} ${showSender ? "mt-3" : "mt-1"}`}>
      {!out && (
        <div className="w-8 shrink-0">{showSender && <Avatar name={senderName} src={senderAvatar} size={32} bot={isBot} />}</div>
      )}
      <div className={`flex max-w-[85%] min-w-0 flex-col sm:max-w-[70%] ${out ? "items-end" : "items-start"}`}>
        {showSender && !out && <p className="mb-0.5 text-xs font-semibold text-ink-2">{senderName}</p>}
        <div
          role={isTextual ? "button" : undefined}
          tabIndex={isTextual ? 0 : undefined}
          aria-label={isTextual ? "Message. Activate for actions" : undefined}
          aria-expanded={isTextual ? selected : undefined}
          onClick={() => isTextual && setSelected((s) => !s)}
          onKeyDown={(e) => {
            if (isTextual && (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
              e.preventDefault();
              setSelected((s) => !s);
            }
          }}
          className="max-w-full cursor-default text-left"
        >
          {body}
        </div>

        {voice && (
          <div className="mt-1.5 max-w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
            <p className="text-xs font-semibold text-ink-2">Transcript</p>
            <p className="text-ink" lang={lang ?? undefined}>
              {voice.transcript}
            </p>
            {voice.corrected && (
              <div className="mt-1.5 border-t border-line pt-1.5">
                <p className="corrected">{voice.corrected}</p>
                {voice.explanation && <p className="mt-0.5 text-ink-2">{voice.explanation}</p>}
              </div>
            )}
          </div>
        )}
        {m.type === MSG.hdVoice && !voice && m.id && actions.onTranscribe && (
          <button type="button" onClick={() => actions.onTranscribe?.(m)} className="mt-1 text-xs font-semibold text-accent-ink underline underline-offset-2">
            Show transcript
          </button>
        )}
        {aic && !aic.ok && <CoachNote meta={aic} label={out ? "Coach note" : `Coach note for ${senderName.split(" ")[0]}`} />}
        {out && coachChecking && !aic && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3">
            <Spinner size={11} /> Coach is reading
          </p>
        )}

        {translation && (
          <p className="animate-ink-in mt-1.5 max-w-full rounded-md bg-wash px-3 py-2 text-sm text-ink">
            <span className="sr-only">Translation: </span>
            {translation}
          </p>
        )}
        {tError && <p className="mt-1 text-xs text-ink">{tError}</p>}

        {(selected || translating) && isTextual && (
          <div className="animate-ink-in mt-1 flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Message actions">
            <ActionBtn icon={<Reply size={14} />} label="Reply" onClick={() => actions.onReply(m)} />
            <ActionBtn icon={translating ? <Spinner size={13} /> : <Languages size={14} />} label={translation ? "Hide translation" : "Translate"} onClick={translate} />
            <ActionBtn icon={<Volume2 size={14} />} label="Listen" onClick={() => speak(text, lang)} />
            {canCorrect && !out && actions.onCorrect && <ActionBtn icon={<PenLine size={14} />} label="Correct" onClick={() => actions.onCorrect?.(m, text)} />}
            {!out && <span className="px-1.5 text-xs text-ink-3">Tap a word to look it up</span>}
          </div>
        )}

        <div className={`mt-0.5 flex items-center gap-1.5 text-[0.7rem] text-ink-3 ${out ? "flex-row-reverse" : ""}`}>
          {m.state === "sending" ? (
            <span>Sending…</span>
          ) : m.state === "failed" ? (
            <span className="flex items-center gap-1.5 text-ink">
              <AlertCircle size={12} /> {m.error ?? "Not sent"}
              {actions.onRetry && (
                <button type="button" onClick={() => actions.onRetry?.(m)} className="font-semibold underline">
                  Retry
                </button>
              )}
              {actions.onDiscard && (
                <button type="button" onClick={() => actions.onDiscard?.(m)} className="underline">
                  Delete
                </button>
              )}
            </span>
          ) : (
            <>
              <time dateTime={new Date(m.sentTime).toISOString()}>{time(m.sentTime)}</time>
              {out && read && (
                <span className="inline-flex items-center gap-0.5 text-accent-ink">
                  <CheckCheck size={12} aria-hidden="true" /> Read
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs font-semibold text-ink-2 hover:bg-wash hover:text-ink"
    >
      {icon}
      {label}
    </button>
  );
}
