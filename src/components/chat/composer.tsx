"use client";

import { Mic, Send, SpellCheck, Square, Trash2, X } from "lucide-react";
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
    <div className="border-t border-line bg-surface px-3 pt-2 pb-3 sm:px-4">
      {check && (
        <div className="animate-ink-in mb-2 rounded-lg border border-accent/30 bg-accent-wash p-3" role="status" aria-live="polite">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-ink-2">{check.result.ok ? "Coach check" : "Suggested correction"}</p>
            <button type="button" onClick={() => setCheck(null)} aria-label="Dismiss check" className="text-ink-3 hover:text-ink">
              <X size={15} />
            </button>
          </div>
          {check.result.ok ? (
            <p className="mt-1 text-ink">{check.result.inTargetLanguage ? "Looks natural. Send it!" : "This doesn't look like the language you're learning, so there's nothing to correct."}</p>
          ) : (
            <>
              <div className="mt-1 text-ink">
                <CorrectionDiff original={check.text} corrected={check.result.corrected} />
              </div>
              {check.result.explanation && <p className="mt-1 text-sm text-ink-2">{check.result.explanation}</p>}
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => send(check.result.corrected)}>
                  Send corrected
                </Button>
                <Button size="sm" variant="secondary" onClick={() => (setDraft(check.result.corrected), setCheck(null))}>
                  Edit corrected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => send(check.text)}>
                  Send mine
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {replyTo && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-md border-l-2 border-accent bg-paper px-3 py-1.5 text-sm">
          <span className="min-w-0 truncate text-ink-2">
            Replying to: <span className="text-ink">{replyText || "message"}</span>
          </span>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="text-ink-3 hover:text-ink">
            <X size={15} />
          </button>
        </div>
      )}

      {recording ? (
        <div className="flex h-12 items-center gap-3" role="status">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          <span className="font-semibold text-ink tabular-nums">
            Recording {Math.floor(elapsed / 60)}:{String(Math.floor(elapsed % 60)).padStart(2, "0")}
          </span>
          <span className="text-sm text-ink-3">up to 60 seconds</span>
          <div className="ml-auto flex gap-2">
            <IconButton label="Discard recording" onClick={cancelRecording}>
              <Trash2 size={18} />
            </IconButton>
            <Button onClick={stopRecording} icon={<Square size={14} fill="currentColor" />}>
              Send voice
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-1.5">
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
            className="max-h-40 min-h-11 flex-1 resize-none rounded-md border border-line-strong bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <IconButton label="Check before sending" onClick={runCheck} disabled={!draft.trim() || checking || disabled} className="h-11 w-11">
            {checking ? <Spinner size={18} /> : <SpellCheck size={19} />}
          </IconButton>
          {allowVoice && onSendVoice && (
            <IconButton label="Record voice message" onClick={startRecording} disabled={disabled} className="h-11 w-11">
              <Mic size={19} />
            </IconButton>
          )}
          <button
            type="button"
            onClick={() => send()}
            disabled={!draft.trim() || disabled}
            aria-label="Send message"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent text-surface transition-colors hover:bg-accent-ink disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      )}
      {extra && !recording && <div className="mt-2 flex flex-wrap items-center gap-2">{extra}</div>}
    </div>
  );
}
