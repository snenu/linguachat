"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { useMe } from "@/components/app/providers";
import { Card } from "@/components/ui/misc";
import { PageLoader } from "@/components/ui/spinner";
import type { Progress } from "@/lib/client/types";
import { languageName } from "@/lib/languages";

function WeekChart({ week, target }: { week: Progress["week"]; target: number }) {
  const max = Math.max(target, ...week.map((d) => d.practice), 1);
  return (
    <figure aria-label="Practice points per day this week">
      <div className="flex h-40 items-end gap-2 sm:gap-4">
        {week.map((d) => {
          const h = Math.round((d.practice / max) * 100);
          const met = d.practice >= target;
          const label = new Date(`${d.day}T12:00:00`).toLocaleDateString([], { weekday: "short" });
          return (
            <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-xs text-ink-2 tabular-nums">{d.practice || ""}</span>
              <div
                className={`w-full max-w-12 rounded-t-sm ${met ? "bg-accent" : d.practice ? "bg-ink-3" : "bg-wash"}`}
                style={{ height: `${Math.max(h, 2)}%` }}
                title={`${label}: ${d.practice} practice points`}
              />
              <span className="text-xs text-ink-3">{label}</span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 flex items-center gap-4 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Goal met ({target})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-ink-3" /> Practised
        </span>
      </figcaption>
    </figure>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <>
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-ink tabular-nums">{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-ink-3">
      {inner}
    </Link>
  ) : (
    <div className="rounded-lg border border-line bg-surface p-4">{inner}</div>
  );
}

export default function ProgressOverview() {
  const { me } = useMe();
  const { data } = useSWR<Progress>("/api/progress");
  if (!data) return <PageLoader />;
  const target = languageName(me.targetLanguage);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-ink-2">Current streak</p>
          <p className="mt-1 flex items-center gap-2 font-display text-4xl font-semibold text-ink">
            <Flame size={28} fill={data.streak ? "var(--marker)" : "none"} aria-hidden="true" />
            {data.streak} {data.streak === 1 ? "day" : "days"}
          </p>
          <p className="mt-1 text-sm text-ink-3">Longest: {data.longestStreak} days. A day counts when you reach {data.dailyTarget} practice points.</p>
        </Card>
        <Card className="p-5 md:col-span-2">
          <p className="text-sm text-ink-2">This week</p>
          <div className="mt-3">
            <WeekChart week={data.week} target={data.dailyTarget} />
          </div>
        </Card>
      </div>
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">Last 7 days</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={`Messages in ${target}`} value={data.weekTotals.targetMessages} />
          <Stat label="Corrections received" value={data.weekTotals.correctionsReceived} href="/app/progress/mistakes" />
          <Stat label="Words learned" value={data.weekTotals.wordsLearned} href="/app/progress/vocabulary" />
          <Stat label="Flashcards reviewed" value={data.weekTotals.reviews} href="/app/progress/review" />
          <Stat label="Tutor turns" value={data.weekTotals.tutorTurns} />
          <Stat label="Voice messages" value={data.weekTotals.voice} />
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">All time</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={`Messages in ${target}`} value={data.allTime.targetMessages} />
          <Stat label="Corrections you gave" value={data.allTime.correctionsGiven} />
          <Stat label="Words saved" value={data.allTime.wordsSaved} />
          <Stat label="Cards due now" value={data.dueCards} href="/app/progress/review" />
        </div>
      </section>
    </div>
  );
}
