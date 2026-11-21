"use client";

import { BookmarkPlus, Check, Send, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
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
        <div className="py-6">
          <Spinner label={`Looking up "${word}"`} />
        </div>
      )}
      <FormError message={error} />
      {info && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-pen text-3xl font-semibold text-ink" lang={info.language}>
              <span className={saved ? "marker" : ""}>{info.term || word}</span>
            </p>
            <p className="mt-0.5 text-sm text-ink-3">
              {[info.partOfSpeech, info.reading].filter(Boolean).join(" · ")}
            </p>
          </div>
          <p className="text-lg text-ink">{info.meaning}</p>
          {info.example && (
            <div className="rounded-md border border-line bg-paper px-3.5 py-3">
              <p className="text-ink" lang={info.language}>
                {info.example}
              </p>
              {info.exampleTranslation && <p className="mt-1 text-sm text-ink-2">{info.exampleTranslation}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} loading={saving} disabled={saved} icon={saved ? <Check size={16} /> : <BookmarkPlus size={16} />}>
              {saved ? "Saved to flashcards" : "Save to vocabulary"}
            </Button>
            <Button variant="secondary" icon={<Volume2 size={16} />} onClick={() => speak(info.term || word || "", info.language)}>
              Listen
            </Button>
            {onShare && (
              <Button
                variant="ghost"
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
