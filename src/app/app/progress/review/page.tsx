"use client";

import { BookOpenCheck, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import { speak } from "@/lib/client/speech";
import type { VocabItem } from "@/lib/client/types";
import { GRADE_BUTTONS } from "@/lib/sm2";

export default function ReviewPage() {
  const toast = useToast();
  const { data, mutate } = useSWR<{ cards: VocabItem[] }>("/api/vocab/review", { revalidateOnFocus: false });
  const [queue, setQueue] = useState<VocabItem[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && queue === null) setQueue(data.cards);
  }, [data, queue]);

  const card = queue?.[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || busy || (e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        void grade(GRADE_BUTTONS[Number(e.key) - 1].grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function grade(g: number) {
    if (!card) return;
    setBusy(true);
    try {
      await api(`/api/vocab/${card.id}/review`, { body: { grade: g } });
      setDone((d) => d + 1);
      setRevealed(false);
      // A forgotten card goes to the back of today's queue.
      setQueue((q) => (q ? (g < 3 ? [...q.slice(1), card] : q.slice(1)) : q));
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!queue) return <PageLoader label="Loading flashcards" />;
  if (!card) {
    return (
      <EmptyState
        icon={<BookOpenCheck size={22} />}
        title={done ? `Session complete: ${done} ${done === 1 ? "review" : "reviews"}` : "No cards due right now"}
        action={
          <div className="flex gap-2">
            <ButtonLink href="/app/progress/vocabulary" variant="secondary">
              Open vocabulary
            </ButtonLink>
            {done > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setQueue(null);
                  setDone(0);
                  void mutate();
                }}
              >
                Check for more
              </Button>
            )}
          </div>
        }
      >
        {done ? "Cards come back on a spaced schedule: soon after a miss, days or weeks after an easy recall." : "Save words from your chats and they'll show up here for review."}
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <p className="text-sm text-ink-2" aria-live="polite">
        {queue.length} {queue.length === 1 ? "card" : "cards"} left · {done} reviewed
      </p>
      <div className="flex min-h-72 flex-col justify-between rounded-lg border border-line-strong bg-surface p-6 sm:p-8" aria-live="polite">
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="font-pen text-4xl font-semibold text-ink" lang={card.language}>
              {card.term}
            </p>
            <button type="button" onClick={() => speak(card.term, card.language)} aria-label="Listen" className="rounded-md p-2 text-ink-2 hover:bg-wash">
              <Volume2 size={20} />
            </button>
          </div>
          {card.reading && <p className="mt-1 text-ink-3">{card.reading}</p>}
          {revealed && (
            <div className="animate-ink-in mt-6 border-t border-line pt-5">
              <p className="text-xl text-ink">{card.meaning}</p>
              {card.example && (
                <div className="mt-3">
                  <p className="text-ink-2 italic" lang={card.language}>
                    {card.example}
                  </p>
                  {card.exampleTranslation && <p className="text-sm text-ink-3">{card.exampleTranslation}</p>}
                </div>
              )}
            </div>
          )}
        </div>
        {!revealed ? (
          <Button size="lg" className="mt-8" onClick={() => setRevealed(true)}>
            Show answer
          </Button>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="How well did you remember?">
            {GRADE_BUTTONS.map((b, i) => (
              <Button key={b.grade} variant={b.grade >= 4 ? "primary" : "secondary"} disabled={busy} onClick={() => grade(b.grade)} className="h-auto flex-col py-2">
                <span>{b.label}</span>
                <span className="text-xs font-normal opacity-80">
                  {b.hint} · {i + 1}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-ink-3">Keyboard: Space to reveal, 1–4 to grade.</p>
    </div>
  );
}
