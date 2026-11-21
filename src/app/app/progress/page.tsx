"use client";

import { BookOpenCheck, Bot, Flame, GraduationCap, Layers, MessageSquareText, Mic, PenLine, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import useSWR from "swr";
import { useMe } from "@/components/app/providers";
import { ButtonLink } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/misc";
import type { Progress } from "@/lib/client/types";
import { languageName } from "@/lib/languages";

function dayLabel(day: string, style: "short" | "narrow" = "short") {
  return new Date(`${day}T12:00:00`).toLocaleDateString([], { weekday: style });
}

/** Today's practice points against the daily goal. */
function GoalRing({ value, target }: { value: number; target: number }) {
  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / Math.max(1, target));
  const met = value >= target;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value} of ${target} practice points today`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--wash)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={met ? "var(--mint)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="font-display text-4xl font-bold text-ink tabular-nums">{value}</span>
        <span className="text-xs text-ink-3">of {target}</span>
      </div>
    </div>
  );
}

function WeekChart({ week, target }: { week: Progress["week"]; target: number }) {
  const max = Math.max(target * 1.25, ...week.map((d) => d.practice), 1);
  const ticks = [0, Math.round(max / 2), Math.round(max)];
  const targetPct = (target / max) * 100;
  return (
    <figure aria-label="Practice points per day this week">
      <div className="flex gap-3">
        <div className="relative h-48 w-7 shrink-0 text-right text-[0.7rem] text-ink-3 tabular-nums" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `calc(${(t / max) * 100}% - 0.5rem)` }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(t / max) * 100}%` }} />
            ))}
            <span className="absolute inset-x-0 border-t-2 border-dashed border-marker" style={{ bottom: `${targetPct}%` }}>
              <span className="absolute -top-5 right-0 rounded-sm bg-marker-wash px-1.5 text-[0.7rem] font-semibold text-ink">Goal {target}</span>
            </span>
          </div>
          <div className="relative flex h-48 items-end gap-2 sm:gap-4">
            {week.map((d, i) => {
              const h = (d.practice / max) * 100;
              const met = d.practice >= target;
              const today = i === week.length - 1;
              return (
                <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className={`mb-1 text-xs tabular-nums ${met ? "font-bold text-ink" : "text-ink-2"}`}>{d.practice || ""}</span>
                  <div
                    className={`w-full max-w-11 origin-bottom rounded-t-md transition-[height] duration-700 ease-out ${
                      met ? "bg-accent" : d.practice ? "bg-accent/35" : "bg-wash"
                    }`}
                    style={{ height: `${Math.max(h, 1.5)}%` }}
                    title={`${dayLabel(d.day)}: ${d.practice} practice points, ${d.targetMessages} messages`}
                  />
                  <span className="sr-only">
                    {dayLabel(d.day)}: {d.practice} practice points
                  </span>
                  {today && <span className="sr-only">(today)</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2 sm:gap-4" aria-hidden="true">
            {week.map((d, i) => (
              <span key={d.day} className={`flex-1 text-center text-xs ${i === week.length - 1 ? "font-bold text-ink" : "text-ink-3"}`}>
                {i === week.length - 1 ? "Today" : dayLabel(d.day)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Goal met
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent/35" /> Practised
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-3.5 border-t-2 border-dashed border-marker" /> Daily goal
        </span>
      </figcaption>
    </figure>
  );
}

function Stat({ label, value, icon, tint, href }: { label: string; value: number; icon: ReactNode; tint: string; href?: string }) {
  const inner = (
    <>
      <span className={`flex h-9 w-9 items-center justify-center rounded-md ${tint}`} aria-hidden="true">
        {icon}
      </span>
      <span className="mt-3 block font-display text-3xl font-bold text-ink tabular-nums">{value}</span>
      <span className="mt-0.5 block text-sm text-ink-2">{label}</span>
    </>
  );
  const cls = "rounded-xl border border-line bg-surface p-4 shadow-sm";
  return href ? (
    <Link href={href} className={`${cls} transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-accent-line hover:shadow-md`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function ProgressOverview() {
  const { me } = useMe();
  const { data } = useSWR<Progress>("/api/progress");
  if (!data) return <OverviewSkeleton />;
  const target = languageName(me.targetLanguage);
  const met = data.todayCount >= data.dailyTarget;
  const left = Math.max(0, data.dailyTarget - data.todayCount);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-5 p-5">
          <GoalRing value={data.todayCount} target={data.dailyTarget} />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-ink">Today</h2>
            <p className="mt-1 text-sm text-ink-2">
              {met ? "Goal met. Anything more is a bonus." : `${left} practice ${left === 1 ? "point" : "points"} to reach your daily goal.`}
            </p>
            <p className="mt-2 text-xs text-ink-3">Messages in {target}, corrections, saved words, reviews and tutor turns all count.</p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Streak</h2>
              <p className="mt-1 flex items-baseline gap-2 font-display text-4xl font-bold text-ink">
                {data.streak}
                <span className="font-sans text-base font-normal text-ink-2">{data.streak === 1 ? "day" : "days"}</span>
              </p>
            </div>
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full ${data.streak ? "bg-red text-white" : "bg-wash text-ink-3"}`}
              aria-hidden="true"
            >
              <Flame size={24} fill={data.streak ? "currentColor" : "none"} />
            </span>
          </div>
          <ol className="grid grid-cols-7 gap-1.5" aria-label="Goal met by day this week">
            {data.week.map((d, i) => {
              const ok = d.practice >= data.dailyTarget;
              const today = i === data.week.length - 1;
              return (
                <li key={d.day} className="flex flex-col items-center gap-1">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      ok ? "bg-red text-white" : today ? "border-2 border-dashed border-red/50 text-red" : "bg-wash text-ink-3"
                    }`}
                    aria-label={`${dayLabel(d.day)}: ${ok ? "goal met" : "goal not met"}`}
                  >
                    <Flame size={14} fill={ok ? "currentColor" : "none"} aria-hidden="true" />
                  </span>
                  <span className={`text-[0.7rem] ${today ? "font-bold text-ink" : "text-ink-3"}`} aria-hidden="true">
                    {dayLabel(d.day, "narrow")}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="flex items-center gap-1.5 text-xs text-ink-3">
            <Trophy size={13} aria-hidden="true" /> Longest: {data.longestStreak} {data.longestStreak === 1 ? "day" : "days"}
          </p>
        </Card>

        <Card className="flex flex-col justify-between gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Flashcards</h2>
              <p className="mt-1 flex items-baseline gap-2 font-display text-4xl font-bold text-ink">
                {data.dueCards}
                <span className="font-sans text-base font-normal text-ink-2">due now</span>
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-marker-wash text-[#8A4B06]" aria-hidden="true">
              <Layers size={22} />
            </span>
          </div>
          <p className="text-sm text-ink-2">
            {data.dueCards ? "Review them now, while they're on the edge of forgetting." : `You've saved ${data.allTime.wordsSaved} ${data.allTime.wordsSaved === 1 ? "word" : "words"}. Nothing is due.`}
          </p>
          <ButtonLink
            href={data.dueCards ? "/app/progress/review" : "/app/progress/vocabulary"}
            variant={data.dueCards ? "primary" : "secondary"}
            icon={<BookOpenCheck size={16} />}
          >
            {data.dueCards ? "Review now" : "Open vocabulary"}
          </ButtonLink>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-ink">This week</h2>
          <p className="text-sm text-ink-3">Practice points per day</p>
        </div>
        <WeekChart week={data.week} target={data.dailyTarget} />
      </Card>

      <section>
        <h2 className="font-display text-xl font-bold text-ink">Last 7 days</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Stat label={`Messages in ${target}`} value={data.weekTotals.targetMessages} icon={<MessageSquareText size={18} />} tint="bg-accent-wash text-accent-ink" />
          <Stat
            label="Corrections received"
            value={data.weekTotals.correctionsReceived}
            icon={<PenLine size={18} />}
            tint="bg-red-wash text-red-ink"
            href="/app/progress/mistakes"
          />
          <Stat label="Words learned" value={data.weekTotals.wordsLearned} icon={<Sparkles size={18} />} tint="bg-marker-wash text-[#8A4B06]" href="/app/progress/vocabulary" />
          <Stat label="Flashcards reviewed" value={data.weekTotals.reviews} icon={<Layers size={18} />} tint="bg-mint-wash text-mint" href="/app/progress/review" />
          <Stat label="Tutor turns" value={data.weekTotals.tutorTurns} icon={<Bot size={18} />} tint="bg-accent-wash text-accent-ink" />
          <Stat label="Voice messages" value={data.weekTotals.voice} icon={<Mic size={18} />} tint="bg-[#EEE6FA] text-[#5B2B9E]" />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-ink">All time</h2>
        <dl className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-sm md:grid-cols-4">
          {[
            [`Messages in ${target}`, data.allTime.targetMessages, MessageSquareText],
            ["Corrections you gave", data.allTime.correctionsGiven, GraduationCap],
            ["Words saved", data.allTime.wordsSaved, BookOpenCheck],
            ["Tutor turns", data.allTime.tutorTurns, Bot],
          ].map(([label, value, Icon], i) => {
            const I = Icon as typeof Bot;
            return (
              <div key={label as string} className={`flex flex-col gap-1 p-5 ${i > 0 ? "border-line max-md:odd:border-l-0 md:border-l" : ""} ${i > 1 ? "border-t md:border-t-0" : ""} ${i % 2 === 1 ? "border-l" : ""}`}>
                <dt className="flex items-center gap-1.5 text-sm text-ink-2">
                  <I size={14} className="text-ink-3" aria-hidden="true" /> {label as string}
                </dt>
                <dd className="font-display text-3xl font-bold text-ink tabular-nums">{value as number}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
