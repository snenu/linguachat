"use client";

import { Check, Mic, PenLine, Reply, SendHorizontal, SpellCheck, Square, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import { VoiceRecorder } from "@/lib/client/recorder";
import type { Correction } from "@/lib/client/types";
import type { ChatMessage } from "@/lib/nexconn/model";
import { CorrectionDiff } from "./message-item";

export function Composer({
  draft,
  setDraft,
  onSendText,
  onSendVoice,
  onTyping,
  replyTo,
  replyText,
  onCancelReply,
  previous,
  disabled,
  placeholder,
  extra,
  allowVoice = true,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onSendText: (text: string) => void;
  onSendVoice?: (file: File, duration: number) => void;
  onTyping?: () => void;
  replyTo: ChatMessage | null;
  replyText: string;
  onCancelReply: () => void;
  previous: string;
  disabled: boolean;
  placeholder: string;
  extra?: ReactNode;
  allowVoice?: boolean;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<{ text: string; result: Correction } | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<VoiceRecorder | null>(null);
  const lastTyping = useRef(0);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      const s = recorder.current?.elapsed() ?? 0;
      setElapsed(s);
      if (s >= 60) void stopRecording();
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  function send(text = draft) {
    const t = text.trim();
    if (!t || disabled) return;
    onSendText(t);
    setDraft("");
    setCheck(null);
    inputRef.current?.focus();
  }

  async function runCheck() {
    const t = draft.trim();
    if (!t) return;
    setChecking(true);
    try {
      const result = await api<Correction>("/api/ai/check", { body: { text: t, previous: previous || undefined } });
      setCheck({ text: t, result });
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setChecking(false);
    }
  }

  async function startRecording() {
    if (!VoiceRecorder.supported()) {
      toast("Voice recording isn't supported in this browser.", "error");
      return;
    }
    try {
      recorder.current = new VoiceRecorder();
      await recorder.current.start();
      setElapsed(0);
      setRecording(true);
    } catch {
      toast("Allow microphone access to record a voice message.", "error");
    }
  }

  async function stopRecording() {
    const r = recorder.current;
    if (!r) return;
    setRecording(false);
    try {
      const { file, duration } = await r.stop();
      if (duration < 0.6) {
        toast("That was too short. Hold on a little longer.", "info");
        return;
      }
      onSendVoice?.(file, duration);
    } catch {
      toast("Couldn't process the recording. Try again.", "error");
    } finally {
      recorder.current = null;
    }
  }

  function cancelRecording() {
    recorder.current?.cancel();
    recorder.current = null;
    setRecording(false);
  }

  return (
    <div className="border-t border-line bg-surface px-3 pt-2.5 pb-3 sm:px-4">
      {check && (
        <div
          className={`animate-pop-in mb-2.5 rounded-xl border p-3.5 shadow-sm ${check.result.ok ? "border-mint/30 bg-mint-wash" : "border-accent-line bg-accent-wash"}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-2">
            <p className={`flex items-center gap-1.5 text-xs font-semibold ${check.result.ok ? "text-mint" : "text-accent-ink"}`}>
              {check.result.ok ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <PenLine size={13} aria-hidden="true" />}
              {check.result.ok ? "Coach check" : "Suggested correction"}
            </p>
            <button type="button" onClick={() => setCheck(null)} aria-label="Dismiss check" className="-m-1 rounded-full p-1 text-ink-3 hover:bg-surface hover:text-ink">
              <X size={15} />
            </button>
          </div>
          {check.result.ok ? (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-ink">
                {check.result.inTargetLanguage ? "Looks natural. Send it!" : "This doesn't look like the language you're learning, so there's nothing to correct."}
              </p>
              <Button size="sm" onClick={() => send(check.text)} icon={<SendHorizontal size={14} />}>
                Send
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-1.5 text-[0.97rem] text-ink">
                <CorrectionDiff original={check.text} corrected={check.result.corrected} />
              </div>
              {check.result.explanation && <p className="mt-1.5 text-sm text-ink-2">{check.result.explanation}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => send(check.result.corrected)}>
                  Send corrected
                </Button>
                <Button size="sm" variant="secondary" onClick={() => (setDraft(check.result.corrected), setCheck(null))}>
                  Edit corrected
                </Button>
                <Button size="sm" variant="quiet" onClick={() => send(check.text)}>
                  Send mine
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {replyTo && (
        <div className="animate-ink-in mb-2 flex items-center justify-between gap-2 rounded-lg border-l-[3px] border-accent bg-accent-wash px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <Reply size={14} className="shrink-0 text-accent" aria-hidden="true" />
            <span className="min-w-0 truncate text-ink-2">
              Replying to: <span className="text-ink">{replyText || "message"}</span>
            </span>
          </span>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="rounded-full p-1 text-ink-3 hover:bg-surface hover:text-ink">
            <X size={15} />
          </button>
        </div>
      )}

      {recording ? (
        <div className="animate-ink-in flex h-12 items-center gap-3 rounded-full border border-red/30 bg-red-wash pr-1.5 pl-4" role="status">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red" aria-hidden="true" />
          <span className="font-semibold text-ink tabular-nums">
            Recording {Math.floor(elapsed / 60)}:{String(Math.floor(elapsed % 60)).padStart(2, "0")}
          </span>
          <span className="hidden h-5 items-center gap-[3px] sm:flex" aria-hidden="true">
            {[8, 14, 10, 18, 12, 16, 9, 13, 7, 15].map((h, i) => (
              <span key={i} className="w-[3px] animate-pulse rounded-full bg-red/70" style={{ height: h, animationDelay: `${i * 90}ms` }} />
            ))}
          </span>
          <span className="hidden text-xs text-ink-3 md:inline">up to 60 seconds</span>
          <div className="ml-auto flex items-center gap-1.5">
            <IconButton label="Discard recording" onClick={cancelRecording} className="rounded-full hover:bg-surface">
              <Trash2 size={17} />
            </IconButton>
            <Button onClick={stopRecording} icon={<Square size={12} fill="currentColor" />} className="rounded-full">
              Send voice
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div
            className={`flex min-w-0 flex-1 items-end rounded-[1.4rem] border bg-paper pr-1 pl-4 transition-[border-color,box-shadow] focus-within:border-accent focus-within:bg-surface focus-within:ring-4 focus-within:ring-accent/15 ${
              disabled ? "border-line opacity-70" : "border-line-strong hover:border-ink-3"
            }`}
          >
            <label htmlFor="composer" className="sr-only">
              Message
            </label>
            <textarea
              id="composer"
              ref={inputRef}
              rows={1}
              value={draft}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(e) => {
                setDraft(e.target.value);
                if (check) setCheck(null);
                const now = Date.now();
                if (onTyping && now - lastTyping.current > 3000) {
                  lastTyping.current = now;
                  onTyping();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base text-ink placeholder:text-ink-3 focus:outline-none disabled:cursor-not-allowed"
            />
            <IconButton
              label="Check before sending"
              onClick={runCheck}
              disabled={!draft.trim() || checking || disabled}
              className={`mb-1 h-9 w-9 rounded-full ${draft.trim() && !checking ? "text-accent hover:bg-accent-wash hover:text-accent-ink" : ""}`}
            >
              {checking ? <Spinner size={17} /> : <SpellCheck size={18} />}
            </IconButton>
          </div>
          {allowVoice && onSendVoice && (
            <IconButton
              label="Record voice message"
              onClick={startRecording}
              disabled={disabled}
              className="h-11 w-11 rounded-full border border-line-strong bg-surface hover:border-ink-3"
            >
              <Mic size={18} />
            </IconButton>
          )}
          <button
            type="button"
            onClick={() => send()}
            disabled={!draft.trim() || disabled}
            aria-label="Send message"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-[background-color,transform,opacity] hover:bg-accent-ink active:scale-90 disabled:bg-accent/35 disabled:shadow-none"
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      )}
      {extra && !recording && <div className="mt-2.5 flex flex-wrap items-center gap-2">{extra}</div>}
    </div>
  );
}
