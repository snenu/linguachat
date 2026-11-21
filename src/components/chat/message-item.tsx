"use client";

import {
  AlertCircle,
  BookmarkPlus,
  CheckCheck,
  ChevronDown,
  Handshake,
  Languages,
  Lightbulb,
  Mic,
  PenLine,
  Reply,
  RotateCw,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage } from "@/lib/client/api";
import { speak } from "@/lib/client/speech";
import { segmentWords } from "@/lib/client/speech";
import { MISTAKE_LABELS, type MistakeCategory } from "@/lib/languages";
import type { ChatMessage, Reaction } from "@/lib/nexconn/model";
import { QUICK_REACTIONS } from "./use-reactions";
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
  /** Toggle my reaction (Nexconn message reactions). */
  onReact?: (messageId: string, reactionId: string) => void;
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

// ---- Correction diff ----------------------------------------------------------------------------

interface Tok {
  t: string;
  lead: string;
}

/** Word-like tokens with the whitespace that precedes each one (CJK splits via Intl.Segmenter). */
function tokenize(s: string): Tok[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  const parts = Seg
    ? [...new Seg(undefined, { granularity: "word" }).segment(s)].map((x) => x.segment)
    : s.split(/(\s+|[.,!?;:¡¿"“”()])/).filter(Boolean);
  const out: Tok[] = [];
  let lead = "";
  for (const p of parts) {
    if (/^\s+$/.test(p)) {
      lead += p;
      continue;
    }
    out.push({ t: p, lead });
    lead = "";
  }
  return out;
}

type Piece = { kind: "same"; text: string } | { kind: "change"; lead: string; removed: string; added: string };

/** Longest-common-subsequence diff over tokens, grouped into unchanged text and change runs. */
function diffPieces(original: string, corrected: string): Piece[] | null {
  const a = tokenize(original);
  const b = tokenize(corrected);
  if (!a.length || !b.length || a.length * b.length > 90_000) return null;
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i].t === b[j].t ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const words = (toks: Tok[]) => toks.filter((x) => /\p{L}|\p{N}/u.test(x.t)).length;
  if (dp[0][0] === 0 || words(a) === 0) return null;

  const pieces: Piece[] = [];
  let run: { lead: string; removed: string; added: string } | null = null;
  let same = 0;
  const flush = () => {
    if (run) pieces.push({ kind: "change", ...run });
    run = null;
  };
  const change = (tok: Tok, side: "removed" | "added") => {
    if (!run) run = { lead: tok.lead, removed: "", added: "" };
    run[side] += run[side] ? tok.lead + tok.t : tok.t;
  };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i].t === b[j].t) {
      flush();
      if (/\p{L}|\p{N}/u.test(b[j].t)) same++;
      pieces.push({ kind: "same", text: b[j].lead + b[j].t });
      i++;
      j++;
    } else if (j >= m || (i < n && dp[i + 1][j] >= dp[i][j + 1])) change(a[i++], "removed");
    else change(b[j++], "added");
  }
  flush();
  // Mostly rewritten: a word mosaic would be harder to read than the two sentences.
  if (same / Math.max(words(a), words(b), 1) < 0.35) return null;
  return pieces;
}

/** The mistake struck through in red, the fix written in the coach's pen; only the changed words are marked. */
export function CorrectionDiff({ original, corrected }: { original: string; corrected: string }) {
  const pieces = original.trim() === corrected.trim() ? null : diffPieces(original, corrected);
  if (!pieces) {
    return (
      <p className="leading-relaxed">
        <span className="strike">{original}</span> <span className="corrected">{corrected}</span>
      </p>
    );
  }
  const gap = /\s/.test(original) ? " " : "";
  return (
    <p className="leading-relaxed">
      {pieces.map((p, i) =>
        p.kind === "same" ? (
          <span key={i}>{p.text}</span>
        ) : (
          <span key={i}>
            {p.lead}
            {p.removed && <span className="strike">{p.removed}</span>}
            {p.removed && p.added && gap}
            {p.added && <span className="corrected">{p.added}</span>}
          </span>
        ),
      )}
    </p>
  );
}

// ---- Pieces --------------------------------------------------------------------------------------

function CoachNote({ meta, original, label = "Coach note", out }: { meta: AiCorrectionMeta; original: string; label?: string; out: boolean }) {
  const [open, setOpen] = useState(false);
  const category = MISTAKE_LABELS[(meta.category as MistakeCategory) ?? "other"]?.toLowerCase() ?? "suggestion";
  return (
    <div className={`mt-1.5 flex max-w-full flex-col ${out ? "items-end" : "items-start"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-[background-color,border-color,color] ${
          open ? "border-accent bg-accent text-white" : "border-accent-line bg-surface text-accent-ink hover:border-accent hover:bg-accent-wash"
        }`}
      >
        <PenLine size={12} aria-hidden="true" />
        {label}: {category}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="animate-pop-in mt-1.5 w-full max-w-md rounded-xl border border-accent-line bg-surface px-3.5 py-3 text-left text-sm shadow-sm">
          <div className="text-[0.95rem] text-ink">
            {original ? <CorrectionDiff original={original} corrected={meta.corrected} /> : <p className="corrected">{meta.corrected}</p>}
          </div>
          {meta.explanation && <p className="mt-2 border-t border-line pt-2 text-ink-2">{meta.explanation}</p>}
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
            className="rounded-[4px] underline decoration-accent/50 decoration-dotted decoration-[1.5px] underline-offset-[4px] transition-colors hover:bg-marker/50 hover:decoration-transparent"
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

/** A thin horizontal "voice" visual: deterministic bar heights from the message key. */
function Bars({ seed, light }: { seed: string; light: boolean }) {
  let h = 7;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bars = Array.from({ length: 22 }, (_, i) => 5 + ((h >>> i % 24) + i * 7) % 15);
  return (
    <span className="flex h-6 items-center gap-[3px]" aria-hidden="true">
      {bars.map((b, i) => (
        <span key={i} className={`w-[3px] rounded-full ${light ? "bg-white/75" : "bg-accent/60"}`} style={{ height: b }} />
      ))}
    </span>
  );
}

// ---- Message -------------------------------------------------------------------------------------

export function MessageItem({
  m,
  text,
  senderName,
  senderAvatar,
  showSender,
  showMeta = true,
  isBot,
  read,
  lang,
  actions,
  canCorrect,
  coachChecking,
  reactions = [],
}: {
  m: ChatMessage;
  text: string;
  senderName: string;
  senderAvatar?: string | null;
  showSender: boolean;
  /** Last message of a run from the same sender: shows the time and read state. */
  showMeta?: boolean;
  isBot: boolean;
  read: boolean;
  lang: string | null;
  actions: MessageActions;
  canCorrect: boolean;
  coachChecking: boolean;
  reactions?: Reaction[];
}) {
  const [selected, setSelected] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [tError, setTError] = useState<string | null>(null);

  // ---- system-like custom messages -----------------------------------------------------------
  if (m.type === MSG.notice) {
    const c = m.content as unknown as NoticeContent;
    return (
      <div className="my-4 flex justify-center">
        <div className="flex max-w-lg items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marker-wash text-ink" aria-hidden="true">
            <Handshake size={16} />
          </span>
          <p className="text-sm text-ink-2">{c.text}</p>
        </div>
      </div>
    );
  }
  if (m.type === MSG.roomPrompt) {
    const c = m.content as unknown as RoomPromptContent;
    return (
      <div className="my-4 rounded-xl border border-marker/60 bg-surface p-4 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-semibold text-ink-2">
          <Lightbulb size={14} className="text-marker" fill="var(--marker)" aria-hidden="true" /> Today&apos;s conversation prompt
        </p>
        <p className="mt-2 font-pen text-lg leading-snug text-ink" lang={c.language}>
          {c.prompt}
        </p>
        {c.hint && (
          <p className="mt-1.5 text-sm text-ink-2" lang={c.language}>
            Useful: <span className="font-semibold text-ink">{c.hint}</span>
          </p>
        )}
        {actions.onUseHint && (
          <button
            type="button"
            onClick={() => actions.onReply(m)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent-ink"
          >
            <Reply size={14} aria-hidden="true" /> Reply to the prompt
          </button>
        )}
      </div>
    );
  }
  if (m.type === MSG.tutorTip) {
    const c = m.content as unknown as TutorTipContent;
    const scene = c.kind === "scene";
    return (
      <div className={`my-4 overflow-hidden rounded-xl border shadow-sm ${scene ? "border-line bg-surface" : "border-marker/60 bg-marker-wash/60"}`}>
        {scene && <div className="h-1.5 bg-accent" aria-hidden="true" />}
        <div className="p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-ink-2">
            {scene ? <Sparkles size={14} className="text-accent" aria-hidden="true" /> : <Lightbulb size={14} aria-hidden="true" />}
            {scene ? "New scene" : "Tutor tip"}
          </p>
          <p className="mt-1.5 font-display text-lg font-bold text-ink">{c.title}</p>
          {scene ? (
            <>
              <p className="mt-1 text-ink">{c.items[0]}</p>
              {c.items[1] && <p className="mt-1.5 text-sm text-ink-3">{c.items[1]}</p>}
            </>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {c.items.map((item) => {
                const phrase = item.replace(/\s*\([^)]*\)\s*$/, "");
                return (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => actions.onUseHint?.(phrase)}
                      className="group/hint flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm text-ink transition-[border-color,box-shadow] hover:border-accent hover:shadow-sm"
                      lang={lang ?? undefined}
                    >
                      <span>{item}</span>
                      <span className="shrink-0 text-xs font-semibold text-accent-ink opacity-0 transition-opacity group-hover/hint:opacity-100">Use</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
  const failed = m.state === "failed";

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

  // Bubble corners: the first message of a run gets the "tail" corner next to the avatar.
  const corner = showSender ? (out ? "rounded-tr-md" : "rounded-tl-md") : "";

  let body: React.ReactNode;
  if (m.type === MSG.correction) {
    const c = m.content as unknown as CorrectionCardContent;
    body = (
      <div className={`w-[min(28rem,100%)] overflow-hidden rounded-xl border bg-surface shadow-sm ${out ? "border-line-strong" : "border-red/30"}`}>
        <div className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold ${out ? "bg-wash text-ink-2" : "bg-red-wash text-red-ink"}`}>
          <PenLine size={13} aria-hidden="true" /> {out ? "You sent a correction" : `${senderName} corrected you`}
        </div>
        <div className="px-4 pt-3 pb-3.5">
          <div className="text-[0.97rem] text-ink" lang={c.language}>
            <CorrectionDiff original={c.original} corrected={c.corrected} />
          </div>
          {c.note && <p className="mt-2.5 border-l-2 border-marker pl-2.5 text-sm text-ink-2">{c.note}</p>}
        </div>
      </div>
    );
  } else if (m.type === MSG.vocabCard) {
    const c = m.content as unknown as VocabCardContent;
    body = (
      <div className="w-[min(22rem,100%)] rounded-xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold text-ink-3">{out ? "You shared a word" : `${senderName} shared a word`}</p>
        <p className="mt-1.5 font-pen text-2xl leading-tight font-semibold text-ink" lang={c.language}>
          <span className="marker px-0.5">{c.term}</span>
        </p>
        {c.reading && <p className="mt-0.5 text-sm text-ink-3">{c.reading}</p>}
        <p className="mt-1.5 text-ink">{c.meaning}</p>
        {c.example && (
          <p className="mt-2 border-l-2 border-accent-line pl-2.5 text-sm text-ink-2 italic" lang={c.language}>
            {c.example}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => speak(c.term, c.language)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3 text-sm font-semibold text-ink transition-colors hover:border-ink-3"
          >
            <Volume2 size={14} aria-hidden="true" /> Listen
          </button>
          {!out && actions.onSaveCard && (
            <button
              type="button"
              onClick={() => actions.onSaveCard?.(c)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-sm font-semibold text-white transition-colors hover:bg-night"
            >
              <BookmarkPlus size={14} aria-hidden="true" /> Save to my words
            </button>
          )}
        </div>
      </div>
    );
  } else if (m.type === MSG.hdVoice) {
    const c = m.content as { remoteUrl?: string; duration?: number };
    body = (
      <div className={`rounded-2xl px-3 py-2.5 shadow-sm ${corner} ${out ? "bg-accent text-white" : "border border-line bg-surface text-ink"}`}>
        <p className={`flex items-center gap-2 text-xs font-semibold ${out ? "text-white/80" : "text-ink-3"}`}>
          <Mic size={13} aria-hidden="true" /> Voice message, {c.duration ?? 0}s
        </p>
        {c.remoteUrl ? (
          <audio
            controls
            preload="none"
            src={c.remoteUrl}
            className="mt-2 h-9 w-60 max-w-full rounded-full"
            aria-label={`Voice message, ${c.duration ?? 0} seconds`}
          />
        ) : (
          <span className="mt-2 flex items-center gap-2.5 text-sm">
            <Bars seed={m.key} light={out} />
            <Spinner size={14} />
            <span className="sr-only">Uploading voice…</span>
          </span>
        )}
      </div>
    );
  } else {
    body = (
      <div
        className={`rounded-2xl px-3.5 py-2.5 text-[0.97rem] leading-relaxed break-words whitespace-pre-wrap transition-shadow ${corner} ${
          out
            ? `bg-accent text-white shadow-sm ${failed ? "opacity-70" : ""}`
            : isBot
              ? "border border-accent-line bg-surface text-ink shadow-sm"
              : "border border-line bg-surface text-ink shadow-sm"
        } ${selected ? (out ? "ring-4 ring-accent/20" : "ring-4 ring-accent/10") : ""}`}
        lang={lang ?? undefined}
      >
        {quote && (
          <p className={`mb-2 rounded-lg border-l-[3px] px-2.5 py-1.5 text-sm ${out ? "border-white/60 bg-white/12 text-white/85" : "border-accent bg-accent-wash text-ink-2"}`}>
            {quote}
          </p>
        )}
        {selected && !out && isTextual ? (
          <Tappable text={text} lang={lang} onWord={(w) => actions.onWord(w, text)} />
        ) : (
          text || (
            <span className="flex gap-1 py-1.5" aria-label="Writing">
              {[0, 150, 300].map((d) => (
                <span key={d} className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-3" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
          )
        )}
      </div>
    );
  }

  const metaVisible = showMeta || selected || m.state !== "sent" || (out && read);

  return (
    <div className={`group flex gap-2.5 ${out ? "flex-row-reverse" : ""} ${showSender ? "mt-4" : "mt-1"}`}>
      {!out && (
        <div className="w-8 shrink-0 pt-5">
          {showSender && <Avatar name={senderName} src={senderAvatar} size={32} bot={isBot} />}
        </div>
      )}
      <div className={`flex max-w-[86%] min-w-0 flex-col sm:max-w-[72%] ${out ? "items-end" : "items-start"}`}>
        {showSender && !out && <p className="mb-1 px-1 text-xs font-semibold text-ink-2">{senderName}</p>}
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
          className={`max-w-full rounded-2xl text-left ${isTextual ? "cursor-pointer" : "cursor-default"}`}
        >
          {body}
        </div>

        {reactions.length > 0 && m.id && (
          <div className={`relative z-[1] -mt-1.5 flex flex-wrap gap-1 px-1.5 ${out ? "justify-end" : "justify-start"}`}>
            {[...reactions]
              .sort((a, b) => b.count - a.count)
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => actions.onReact?.(m.id!, r.id)}
                  aria-pressed={r.mine}
                  aria-label={`${r.id} ${r.count}${r.mine ? ", including you" : ""}`}
                  className={`animate-pop-in inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs shadow-sm transition-[background-color,border-color,transform] active:scale-90 ${
                    r.mine ? "border-accent-line bg-accent-wash font-semibold text-accent-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong"
                  }`}
                >
                  <span aria-hidden="true">{r.id}</span>
                  <span className="tabular-nums">{r.count}</span>
                </button>
              ))}
          </div>
        )}

        {voice && (
          <div className="animate-ink-in mt-1.5 w-[min(24rem,100%)] rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-sm">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-3">
              <Mic size={12} aria-hidden="true" /> Transcript
            </p>
            <p className="mt-1 text-ink" lang={lang ?? undefined}>
              {voice.transcript}
            </p>
            {voice.corrected && (
              <div className="mt-2 border-t border-line pt-2">
                <div className="text-ink">
                  <CorrectionDiff original={voice.transcript} corrected={voice.corrected} />
                </div>
                {voice.explanation && <p className="mt-1 text-ink-2">{voice.explanation}</p>}
              </div>
            )}
          </div>
        )}
        {m.type === MSG.hdVoice && !voice && m.id && actions.onTranscribe && (
          <button
            type="button"
            onClick={() => actions.onTranscribe?.(m)}
            className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-accent-ink hover:bg-accent-wash"
          >
            <Sparkles size={12} aria-hidden="true" /> Show transcript
          </button>
        )}
        {aic && !aic.ok && <CoachNote meta={aic} original={text} out={out} label={out ? "Coach note" : `Coach note for ${senderName.split(" ")[0]}`} />}
        {out && coachChecking && !aic && (
          <p className="mt-1.5 flex items-center gap-1.5 rounded-full bg-accent-wash px-2.5 py-1 text-xs font-semibold text-accent-ink">
            <PenLine size={12} className="animate-pulse" aria-hidden="true" /> Coach is reading
          </p>
        )}

        {translation && (
          <p className="animate-ink-in mt-1.5 flex max-w-full items-start gap-2 rounded-xl border border-line bg-wash px-3 py-2 text-sm text-ink">
            <Languages size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <span>
              <span className="sr-only">Translation: </span>
              {translation}
            </span>
          </p>
        )}
        {tError && <p className="mt-1 text-xs text-red-ink">{tError}</p>}

        {(selected || translating) && isTextual && (
          <div
            className={`animate-pop-in mt-1.5 flex flex-wrap items-center gap-0.5 rounded-full border border-line bg-surface p-1 shadow-md ${out ? "self-end" : "self-start"}`}
            role="toolbar"
            aria-label="Message actions"
          >
            {m.id && actions.onReact && (
              <span className="flex items-center gap-0.5 border-r border-line pr-1" role="group" aria-label="React">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      actions.onReact?.(m.id!, emoji);
                      setSelected(false);
                    }}
                    aria-label={`React ${emoji}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-[background-color,transform] hover:scale-110 hover:bg-wash active:scale-90 ${
                      reactions.some((r) => r.id === emoji && r.mine) ? "bg-accent-wash" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </span>
            )}
            <ActionBtn icon={<Reply size={14} />} label="Reply" onClick={() => actions.onReply(m)} />
            <ActionBtn icon={translating ? <Spinner size={13} /> : <Languages size={14} />} label={translation ? "Hide translation" : "Translate"} onClick={translate} />
            <ActionBtn icon={<Volume2 size={14} />} label="Listen" onClick={() => speak(text, lang)} />
            {canCorrect && !out && actions.onCorrect && <ActionBtn icon={<PenLine size={14} />} label="Correct" onClick={() => actions.onCorrect?.(m, text)} />}
          </div>
        )}
        {selected && isTextual && !out && <p className="mt-1 px-1 text-xs text-ink-3">Tap a word to look it up</p>}

        {metaVisible && (
          <div className={`mt-1 flex items-center gap-1.5 px-1 text-[0.7rem] text-ink-3 ${out ? "flex-row-reverse" : ""}`}>
            {m.state === "sending" ? (
              <span className="flex items-center gap-1">
                <Spinner size={10} /> Sending…
              </span>
            ) : failed ? (
              <span className="flex flex-wrap items-center gap-1.5 text-red-ink">
                <AlertCircle size={12} aria-hidden="true" /> {m.error ?? "Not sent"}
                {actions.onRetry && (
                  <button
                    type="button"
                    onClick={() => actions.onRetry?.(m)}
                    className="inline-flex items-center gap-1 rounded-full bg-red px-2 py-0.5 font-semibold text-white hover:bg-red-ink"
                  >
                    <RotateCw size={11} aria-hidden="true" /> Retry
                  </button>
                )}
                {actions.onDiscard && (
                  <button
                    type="button"
                    onClick={() => actions.onDiscard?.(m)}
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold hover:bg-red-wash"
                  >
                    <Trash2 size={11} aria-hidden="true" /> Delete
                  </button>
                )}
              </span>
            ) : (
              <>
                <time dateTime={new Date(m.sentTime).toISOString()}>{time(m.sentTime)}</time>
                {out && read && (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-accent-ink">
                    <CheckCheck size={12} aria-hidden="true" /> Read
                  </span>
                )}
              </>
            )}
          </div>
        )}
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
      className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-2 transition-colors hover:bg-accent-wash hover:text-accent-ink active:scale-95"
    >
      {icon}
      {label}
    </button>
  );
}
