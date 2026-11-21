"use client";

import { BookOpenCheck, PartyPopper, RotateCw, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, Kbd, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import { speak } from "@/lib/client/speech";
import type { VocabItem } from "@/lib/client/types";
import { GRADE_BUTTONS } from "@/lib/sm2";

/** Grade button colors, from forgot (red) to instant (mint). */
const GRADE_STYLE: Record<number, string> = {
  1: "border-red/35 hover:border-red hover:bg-red-wash",
  3: "border-marker/60 hover:border-marker hover:bg-marker-wash",
  4: "border-accent bg-accent text-white hover:bg-accent-ink",
  5: "border-mint/40 hover:border-mint hover:bg-mint-wash",
};

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

  if (!queue) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4" aria-busy="true">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={done ? <PartyPopper size={22} /> : <BookOpenCheck size={22} />}
          title={done ? `Session complete: ${done} ${done === 1 ? "review" : "reviews"}` : "No cards due right now"}
          action={
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/app/progress/vocabulary" variant="secondary">
                Open vocabulary
              </ButtonLink>
              {done > 0 && (
                <Button
                  variant="ghost"
                  icon={<RotateCw size={15} />}
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
          {done
            ? "Cards come back on a spaced schedule: soon after a miss, days or weeks after an easy recall."
            : "Save words from your chats and they'll show up here, right before you'd forget them."}
        </EmptyState>
      </div>
    );
  }

  const total = done + queue.length;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div aria-live="polite">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">
            {queue.length} {queue.length === 1 ? "card" : "cards"} left
          </span>
          <span className="text-ink-3">{done} reviewed</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-wash" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Session progress">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${(done / Math.max(1, total)) * 100}%` }} />
        </div>
      </div>

      {/* Remount per card so a new card always starts face up without flipping back. */}
      <div key={`${card.id}-${done}`} className="animate-pop-in [perspective:1400px]">
        <div
          className="grid transition-transform duration-[650ms] ease-[var(--ease-spring)] [transform-style:preserve-3d] [&>*]:col-start-1 [&>*]:row-start-1"
          style={{ transform: revealed ? "rotateY(180deg)" : "none" }}
        >
          <div
            className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-xl border border-line bg-surface p-8 text-center shadow-md [backface-visibility:hidden]"
            aria-hidden={revealed}
          >
            <p className="font-pen text-5xl font-semibold break-words text-ink" lang={card.language}>
              {card.term}
            </p>
            {card.reading && <p className="text-lg text-ink-3">{card.reading}</p>}
            <button
              type="button"
              onClick={() => speak(card.term, card.language)}
              aria-label="Listen"
              tabIndex={revealed ? -1 : 0}
              className="mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-[background-color,transform] hover:bg-wash active:scale-90"
            >
              <Volume2 size={18} />
            </button>
            <p className="mt-2 text-sm text-ink-3">Do you remember what it means?</p>
          </div>

          <div
            className="flex min-h-80 flex-col justify-center gap-4 rounded-xl border border-accent-line bg-surface p-8 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]"
            aria-hidden={!revealed}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-pen text-2xl font-semibold text-ink-2" lang={card.language}>
                {card.term}
              </p>
              {card.partOfSpeech && <span className="rounded-full bg-wash px-2 text-xs text-ink-2">{card.partOfSpeech}</span>}
            </div>
            <p className="font-display text-3xl font-bold break-words text-ink">{card.meaning}</p>
            {card.example && (
              <div className="rounded-lg bg-paper px-4 py-3">
                <p className="text-ink italic" lang={card.language}>
                  {card.example}
                </p>
                {card.exampleTranslation && <p className="mt-0.5 text-sm text-ink-3">{card.exampleTranslation}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {!revealed ? (
        <Button size="lg" onClick={() => setRevealed(true)}>
          Show answer
        </Button>
      ) : (
        <div className="animate-ink-in grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="How well did you remember?">
          {GRADE_BUTTONS.map((b, i) => (
            <button
              key={b.grade}
              type="button"
              disabled={busy}
              onClick={() => grade(b.grade)}
              className={`flex flex-col items-center gap-0.5 rounded-lg border bg-surface px-3 py-2.5 font-semibold text-ink shadow-sm transition-[background-color,border-color,transform] active:scale-95 disabled:opacity-50 ${GRADE_STYLE[b.grade]}`}
            >
              <span>{b.label}</span>
              <span className={`text-xs font-normal ${b.grade === 4 ? "text-white/80" : "text-ink-3"}`}>{b.hint}</span>
              <span className="mt-1 hidden sm:block">
                <Kbd>{i + 1}</Kbd>
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="hidden text-center text-xs text-ink-3 sm:block">
        <Kbd>Space</Kbd> to turn the card, <Kbd>1</Kbd>–<Kbd>4</Kbd> to grade.
      </p>
    </div>
  );
}
