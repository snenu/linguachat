"use client";

import { BookOpenCheck, Flame, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { usePresence, useMe } from "@/components/app/providers";
import { PartnerCard } from "@/components/partners/partner-card";
import { ProfileDialog } from "@/components/partners/profile-dialog";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, SectionTitle } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/spinner";
import type { Candidate, Progress, RequestItem } from "@/lib/client/types";
import { languageName } from "@/lib/languages";

function GoalMeter({ value, target }: { value: number; target: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-display text-4xl font-semibold text-ink">
          {value}
          <span className="text-xl text-ink-3"> / {target}</span>
        </p>
        <p className="text-sm text-ink-2">{pct >= 100 ? "Goal met today" : `${target - value} to go`}</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-wash" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={target} aria-label="Today's practice">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { me } = useMe();
  const { data: progress } = useSWR<Progress>("/api/progress");
  const { data: partners, mutate: refreshPartners } = useSWR<{ candidates: Candidate[] }>("/api/partners");
  const { data: requests } = useSWR<{ incoming: RequestItem[] }>("/api/requests");
  const suggestions = (partners?.candidates ?? []).filter((c) => c.relation !== "partner").slice(0, 3);
  const online = usePresence(suggestions.map((c) => c.profile.nexconnId));
  const [open, setOpen] = useState<Candidate | null>(null);
  const target = languageName(me.targetLanguage);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        {greeting()}, {me.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-ink-2">
        You&apos;re learning {target} at {me.targetLevel}. Every message you write in {target} counts.
      </p>

      {(requests?.incoming?.length ?? 0) > 0 && (
        <Link href="/app/partners?tab=requests" className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-ink bg-marker-wash px-4 py-3 text-ink">
          <span>
            <strong>{requests!.incoming.length}</strong> {requests!.incoming.length === 1 ? "learner wants" : "learners want"} to chat with you
          </span>
          <span className="font-semibold underline underline-offset-2">Review requests</span>
        </Link>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink-2">Today&apos;s practice</h2>
          <div className="mt-3">{progress ? <GoalMeter value={progress.todayCount} target={progress.dailyTarget} /> : <Spinner />}</div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <p className="text-ink-3">Streak</p>
              <p className="mt-0.5 flex items-center gap-1.5 font-display text-xl font-semibold text-ink">
                <Flame size={18} className={progress?.streak ? "text-ink" : "text-ink-3"} fill={progress?.streak ? "var(--marker)" : "none"} aria-hidden="true" />
                {progress?.streak ?? 0} {progress?.streak === 1 ? "day" : "days"}
              </p>
            </div>
            <div>
              <p className="text-ink-3">This week in {target}</p>
              <p className="mt-0.5 font-display text-xl font-semibold text-ink">{progress?.weekTotals.targetMessages ?? 0} messages</p>
            </div>
            <div>
              <p className="text-ink-3">Words saved</p>
              <p className="mt-0.5 font-display text-xl font-semibold text-ink">{progress?.allTime.wordsSaved ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col justify-between gap-4 p-5">
          <div>
            <h2 className="text-sm font-semibold text-ink-2">Flashcards</h2>
            <p className="mt-3 font-display text-4xl font-semibold text-ink">{progress?.dueCards ?? 0}</p>
            <p className="text-sm text-ink-2">{progress?.dueCards ? "cards ready to review" : "No cards due. Save words from chats to build your deck."}</p>
          </div>
          <ButtonLink href="/app/progress/review" variant={progress?.dueCards ? "primary" : "secondary"} icon={<BookOpenCheck size={16} />}>
            {progress?.dueCards ? "Review now" : "Open vocabulary"}
          </ButtonLink>
        </Card>
      </div>

      <div className="mt-10">
        <SectionTitle action={<Link href="/app/partners" className="text-sm font-semibold text-accent-ink underline underline-offset-2">See all partners</Link>}>
          Suggested partners
        </SectionTitle>
        <div className="mt-4">
          {!partners ? (
            <Spinner label="Finding partners" />
          ) : suggestions.length === 0 ? (
            <EmptyState icon={<Users size={22} />} title={`No ${target} speakers here yet`}>
              New learners join every day. Practise with the AI tutor meanwhile, or invite a friend who speaks {target}.
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
        <Card className="flex flex-col gap-3 p-5">
          <GraduationCap size={22} className="text-accent" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-ink">Practise with the AI tutor</h2>
          <p className="text-sm text-ink-2">Role-play a café order, a job interview or your own scene. The tutor adapts to {me.targetLevel}.</p>
          <ButtonLink href="/app/tutor" variant="secondary" className="self-start">
            Start a scene
          </ButtonLink>
        </Card>
        <Card className="flex flex-col gap-3 p-5">
          <Users size={22} className="text-accent" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-ink">Join a practice room</h2>
          <p className="text-sm text-ink-2">Group chats for {target} learners at your level, with a new conversation prompt every day.</p>
          <ButtonLink href="/app/rooms" variant="secondary" className="self-start">
            Browse rooms
          </ButtonLink>
        </Card>
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

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
