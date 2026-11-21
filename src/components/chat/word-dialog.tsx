"use client";

import { BookmarkPlus, Check, Send, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/client/api";
import { speak } from "@/lib/client/speech";
import type { WordInfo } from "@/lib/client/types";

export function WordDialog({
  word,
  sentence,
  source,
  onClose,
  onShare,
}: {
  word: string | null;
  sentence: string;
  source: "chat" | "tutor" | "room";
  onClose: () => void;
  onShare?: (info: WordInfo) => void;
}) {
  const toast = useToast();
  const [info, setInfo] = useState<WordInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!word) return;
    let cancelled = false;
    setInfo(null);
    setError(null);
    setSaved(false);
    api<WordInfo>("/api/ai/word", { body: { word, sentence } })
      .then((r) => !cancelled && setInfo(r))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [word, sentence]);

  async function save() {
    if (!info) return;
    setSaving(true);
    try {
      await api("/api/vocab", {
        body: {
          term: info.term || word,
          meaning: info.meaning,
          language: info.language,
          partOfSpeech: info.partOfSpeech,
          reading: info.reading,
          example: info.example,
          exampleTranslation: info.exampleTranslation,
          source,
        },
      });
      setSaved(true);
      toast(`"${info.term}" saved to your flashcards`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "duplicate") setSaved(true);
      toast(errorMessage(err), err instanceof ApiError && err.code === "duplicate" ? "info" : "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!word} onClose={onClose} title="Word">
      {!info && !error && (
        <div className="flex flex-col gap-3 py-2" role="status">
          <span className="sr-only">Looking up &ldquo;{word}&rdquo;</span>
          <p className="font-pen text-4xl font-semibold text-ink/40">{word}</p>
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}
      <FormError message={error} />
      {info && (
        <div className="animate-ink-in flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-pen text-4xl leading-tight font-semibold break-words text-ink" lang={info.language}>
                <span className={`px-0.5 ${saved ? "marker" : ""}`}>{info.term || word}</span>
              </p>
              {(info.partOfSpeech || info.reading) && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {info.partOfSpeech && <span className="rounded-full bg-accent-wash px-2.5 py-0.5 text-xs font-semibold text-accent-ink">{info.partOfSpeech}</span>}
                  {info.reading && (
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2" lang={info.language}>
                      {info.reading}
                    </span>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => speak(info.term || word || "", info.language)}
              aria-label="Listen"
              title="Listen"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-[border-color,color,transform] hover:border-accent hover:text-accent active:scale-90"
            >
              <Volume2 size={19} />
            </button>
          </div>
          <p className="text-xl leading-snug text-ink">{info.meaning}</p>
          {info.example && (
            <div className="rounded-lg border-l-[3px] border-accent bg-paper px-4 py-3">
              <p className="text-ink" lang={info.language}>
                {info.example}
              </p>
              {info.exampleTranslation && <p className="mt-1 text-sm text-ink-2">{info.exampleTranslation}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button onClick={save} loading={saving} disabled={saved} icon={saved ? <Check size={16} /> : <BookmarkPlus size={16} />} className={saved ? "bg-mint! opacity-100!" : ""}>
              {saved ? "Saved to flashcards" : "Save to vocabulary"}
            </Button>
            {onShare && (
              <Button
                variant="secondary"
                icon={<Send size={16} />}
                onClick={() => {
                  onShare(info);
                  onClose();
                }}
              >
                Share as card
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
