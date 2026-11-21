"use client";

import { BookOpenCheck, Flame, GraduationCap, Layers, MailOpen, MessagesSquare, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { useChat, usePresence, useMe } from "@/components/app/providers";
import { PartnerCard } from "@/components/partners/partner-card";
import { ProfileDialog } from "@/components/partners/profile-dialog";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, SectionTitle, Skeleton } from "@/components/ui/misc";
import type { Candidate, Progress, RequestItem } from "@/lib/client/types";
import { languageName, LEVEL_LABELS, type Level } from "@/lib/languages";

/** Circular meter for today's practice against the daily goal. */
function GoalRing({ value, target }: { value: number; target: number }) {
  const pct = Math.min(1, value / Math.max(1, target));
  const r = 44;
  const c = 2 * Math.PI * r;
  const met = pct >= 1;
  return (
    <div className="relative h-32 w-32 shrink-0" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={target} aria-label="Today's practice">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--wash)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={met ? "var(--mint)" : "var(--accent)"}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-1000 ease-[var(--ease-out)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-extrabold text-ink tabular-nums">{value}</span>
        <span className="text-xs text-ink-3">of {target}</span>
      </div>
    </div>
  );
}

function WeekBars({ week, target }: { week: Progress["week"]; target: number }) {
  const max = Math.max(target, ...week.map((d) => d.practice), 1);
  return (
    <div className="flex h-24 items-end gap-2" aria-label="Practice over the last 7 days">
      {week.map((d, i) => {
        const today = i === week.length - 1;
        const met = d.practice >= target;
        const label = new Date(d.day + "T12:00:00").toLocaleDateString(undefined, { weekday: "narrow" });
        return (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5" title={`${d.day}: ${d.practice}`}>
            <div className="flex h-[4.5rem] w-full items-end overflow-hidden rounded-md bg-wash">
              <div
                className={`w-full rounded-md transition-[height] duration-700 ease-[var(--ease-out)] ${met ? "bg-mint" : today ? "bg-accent" : "bg-accent/45"}`}
                style={{ height: `${Math.max(d.practice ? 8 : 0, (d.practice / max) * 100)}%` }}
              />
            </div>
            <span suppressHydrationWarning className={`text-xs ${today ? "font-bold text-ink" : "text-ink-3"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const { me } = useMe();
  const { totalUnread } = useChat();
  const { data: progress } = useSWR<Progress>("/api/progress");
  const { data: partners, mutate: refreshPartners } = useSWR<{ candidates: Candidate[] }>("/api/partners");
  const { data: requests } = useSWR<{ incoming: RequestItem[] }>("/api/requests");
  const suggestions = (partners?.candidates ?? []).filter((c) => c.relation !== "partner").slice(0, 3);
  const online = usePresence(suggestions.map((c) => c.profile.nexconnId));
  const [open, setOpen] = useState<Candidate | null>(null);
  const target = languageName(me.targetLanguage);
  const incoming = requests?.incoming?.length ?? 0;
  const level = me.targetLevel as Level | null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="animate-ink-in flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 suppressHydrationWarning className="font-display text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-4xl">
            {greeting()}, {me.name.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-ink-2">
            You&apos;re learning {target} at {me.targetLevel}
            {level && LEVEL_LABELS[level] ? ` (${LEVEL_LABELS[level].toLowerCase()})` : ""}. Every message you write in {target} counts.
          </p>
        </div>
        <ButtonLink href="/app/chats" variant="secondary" icon={<MessagesSquare size={16} />}>
          Your chats
          {totalUnread > 0 && <span className="rounded-full bg-marker px-1.5 text-xs font-bold text-ink">{totalUnread}</span>}
        </ButtonLink>
      </div>

      {incoming > 0 && (
        <Link
          href="/app/partners?tab=requests"
          className="animate-pop-in mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-marker bg-marker-wash px-4 py-3.5 text-ink shadow-sm transition-shadow hover:shadow-md"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-marker">
              <MailOpen size={17} aria-hidden="true" />
            </span>
            <span>
              <strong>{incoming}</strong> {incoming === 1 ? "learner wants" : "learners want"} to chat with you
            </span>
          </span>
          <span className="font-semibold underline underline-offset-2">Review requests</span>
        </Link>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-5">
              {progress ? <GoalRing value={progress.todayCount} target={progress.dailyTarget} /> : <Skeleton className="h-32 w-32 rounded-full" />}
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Today&apos;s practice</h2>
                <p className="mt-1 max-w-[14rem] text-sm text-ink-2">
                  {!progress
                    ? "Loading your day…"
                    : progress.todayCount >= progress.dailyTarget
                      ? "Goal met for today. Anything more is a bonus."
                      : `${progress.dailyTarget - progress.todayCount} more to reach your goal. Messages, reviews and tutor turns all count.`}
                </p>
              </div>
            </div>
            <div className="min-w-0 flex-1 sm:border-l sm:border-line sm:pl-6">
              {progress ? <WeekBars week={progress.week} target={progress.dailyTarget} /> : <Skeleton className="h-24" />}
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
            <div>
              <dt className="text-sm text-ink-3">Streak</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 font-display text-2xl font-bold text-ink">
                <Flame size={20} className={progress?.streak ? "text-red" : "text-ink-3"} fill={progress?.streak ? "currentColor" : "none"} aria-hidden="true" />
                {progress?.streak ?? 0} <span className="text-base font-semibold text-ink-2">{progress?.streak === 1 ? "day" : "days"}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-3">This week in {target}</dt>
              <dd className="mt-0.5 font-display text-2xl font-bold text-ink">
                {progress?.weekTotals.targetMessages ?? 0} <span className="text-base font-semibold text-ink-2">messages</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-3">Words saved</dt>
              <dd className="mt-0.5 font-display text-2xl font-bold text-ink">{progress?.allTime.wordsSaved ?? 0}</dd>
            </div>
          </dl>
        </Card>

        <Card className="relative flex flex-col justify-between gap-5 overflow-hidden p-5 sm:p-6">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
              <Layers size={19} className="text-accent" aria-hidden="true" /> Flashcards
            </h2>
            <div className="mt-4 flex items-end gap-3">
              <div className="relative h-20 w-16" aria-hidden="true">
                <span className="absolute inset-0 translate-x-2 -translate-y-2 rotate-6 rounded-md border border-line bg-paper" />
                <span className="absolute inset-0 translate-x-1 -translate-y-1 rotate-3 rounded-md border border-line bg-surface" />
                <span className="absolute inset-0 flex items-center justify-center rounded-md border border-accent-line bg-accent-wash font-display text-2xl font-extrabold text-accent-ink">
                  {progress?.dueCards ?? 0}
                </span>
              </div>
              <p className="pb-1 text-sm text-ink-2">
                {progress?.dueCards ? `${progress.dueCards === 1 ? "card is" : "cards are"} ready to review.` : "No cards due. Save words from chats to build your deck."}
              </p>
            </div>
          </div>
          <ButtonLink href="/app/progress/review" variant={progress?.dueCards ? "primary" : "secondary"} icon={<BookOpenCheck size={16} />}>
            {progress?.dueCards ? "Review now" : "Open vocabulary"}
          </ButtonLink>
        </Card>
      </div>

      <div className="mt-10">
        <SectionTitle
          action={
            <Link href="/app/partners" className="text-sm font-semibold text-accent-ink underline-offset-2 hover:underline">
              See all partners
            </Link>
          }
        >
          Suggested partners
        </SectionTitle>
        <div className="mt-4">
          {!partners ? (
            <div className="grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <EmptyState
              icon={<Users size={20} />}
              title={`No ${target} speakers to suggest right now`}
              action={
                <ButtonLink href="/app/tutor" variant="secondary" size="sm" icon={<GraduationCap size={15} />}>
                  Practise with the AI tutor
                </ButtonLink>
              }
            >
              New learners join every day, and you&apos;ll see them here. Meanwhile the AI tutor is always free, or invite a friend who speaks {target}.
            </EmptyState>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {suggestions.map((c) => (
                <PartnerCard key={c.profile.id} candidate={c} online={!!online[c.profile.nexconnId]} onOpen={() => setOpen(c)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <PracticeTile
          href="/app/tutor"
          icon={<GraduationCap size={22} />}
          title="Practise with the AI tutor"
          body={`Role-play a café order, a job interview or your own scene. The tutor adapts to ${me.targetLevel} and suggests what to say.`}
          cta="Start a scene"
          tone="accent"
        />
        <PracticeTile
          href="/app/rooms"
          icon={<Users size={22} />}
          title="Join a practice room"
          body={`Group chats for ${target} learners at your level, with a new conversation prompt every day.`}
          cta="Browse rooms"
          tone="marker"
        />
      </div>

      <ProfileDialog
        candidate={open}
        online={open ? !!online[open.profile.nexconnId] : false}
        onClose={() => setOpen(null)}
        onChanged={() => void refreshPartners()}
      />
    </div>
  );
}

function PracticeTile({
  href,
  icon,
  title,
  body,
  cta,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  tone: "accent" | "marker";
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-line bg-surface p-5 shadow-sm transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md sm:p-6"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-md transition-transform duration-300 group-hover:-rotate-6 ${
          tone === "accent" ? "bg-accent text-white" : "bg-marker text-ink"
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <p className="max-w-md text-sm text-ink-2">{body}</p>
      <span className="mt-1 text-sm font-semibold text-accent-ink underline-offset-2 group-hover:underline">{cta}</span>
    </Link>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
