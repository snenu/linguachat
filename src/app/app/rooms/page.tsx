"use client";

import { Briefcase, Check, Clapperboard, HandHeart, Home, Lightbulb, Plane, UsersRound } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { useMe } from "@/components/app/providers";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import type { RoomSummary } from "@/lib/client/types";
import { languageName } from "@/lib/languages";
import { BANDS, bandForLevel } from "@/lib/rooms";

const TOPIC: Record<string, { icon: typeof Home; tint: string }> = {
  everyday: { icon: Home, tint: "bg-marker-wash text-[#8A4B06]" },
  travel: { icon: Plane, tint: "bg-mint-wash text-mint" },
  work: { icon: Briefcase, tint: "bg-accent-wash text-accent-ink" },
  culture: { icon: Clapperboard, tint: "bg-red-wash text-red-ink" },
};

function RoomTile({ r, showBand = false }: { r: RoomSummary; showBand?: boolean }) {
  const topic = TOPIC[r.topic] ?? TOPIC.everyday;
  const Icon = topic.icon;
  return (
    <li>
      <Link
        href={`/app/rooms/${r.id}`}
        className={`group flex h-full flex-col gap-3 rounded-xl border bg-surface p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md ${
          r.joined ? "border-accent-line" : "border-line hover:border-accent-line"
        }`}
      >
        <span className="flex items-start justify-between gap-2">
          <span className={`flex h-10 w-10 items-center justify-center rounded-md ${topic.tint}`} aria-hidden="true">
            <Icon size={19} />
          </span>
          {r.joined ? (
            <span className="flex items-center gap-1 rounded-full bg-mint-wash px-2 py-0.5 text-xs font-semibold text-mint">
              <Check size={12} strokeWidth={3} aria-hidden="true" /> Joined
            </span>
          ) : (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-ink-2 transition-colors group-hover:border-accent group-hover:text-accent-ink">
              Open
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block font-bold text-ink group-hover:text-accent-ink">{r.topicName}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-3">
            <UsersRound size={13} aria-hidden="true" />
            {r.memberCount ? `${r.memberCount} ${r.memberCount === 1 ? "member" : "members"}` : "Be the first to join"}
            {showBand && <span className="ml-1 rounded-full bg-wash px-1.5 text-xs font-semibold text-ink-2">{r.bandLabel}</span>}
          </span>
        </span>
        {r.todayPrompt && (
          <span className="mt-auto flex items-start gap-2 border-t border-line pt-3 text-sm text-ink" lang={r.language}>
            <Lightbulb size={14} className="mt-1 shrink-0 text-marker" fill="var(--marker)" aria-hidden="true" />
            <span className="line-clamp-2 font-pen">{r.todayPrompt}</span>
          </span>
        )}
      </Link>
    </li>
  );
}

export default function RoomsPage() {
  const { me } = useMe();
  const { data } = useSWR<{ learning: RoomSummary[]; helping: RoomSummary[]; level: string }>("/api/rooms");
  const target = languageName(me.targetLanguage);

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10" aria-busy="true">
        <PageHeader title="Practice rooms" description={`Group chats for ${target} learners by level and topic.`} />
        <Skeleton className="h-6 w-56" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const myBand = bandForLevel(me.targetLevel);
  const bands = [...BANDS].sort((a, b) => (a.id === myBand ? -1 : b.id === myBand ? 1 : 0));
  const helpLangs = [...new Set(data.helping.map((r) => r.language))];
  const joined = [...data.learning, ...data.helping].filter((r) => r.joined);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <PageHeader
        title="Practice rooms"
        description={`Group chats for ${target} learners by level and topic. The room host posts a new conversation prompt every day.`}
      />

      {joined.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl font-bold text-ink">Your rooms</h2>
          <ul className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {joined.map((r) => {
              const Icon = (TOPIC[r.topic] ?? TOPIC.everyday).icon;
              return (
                <li key={r.id} className="shrink-0">
                  <Link
                    href={`/app/rooms/${r.id}`}
                    className="flex items-center gap-2 rounded-full border border-accent-line bg-surface py-1.5 pr-3.5 pl-1.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-accent-wash"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white" aria-hidden="true">
                      <Icon size={14} />
                    </span>
                    {r.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {bands.map((b, i) => (
        <section key={b.id} className={i === 0 ? "" : "mt-10"}>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-xl font-bold text-ink">
              {target} {b.label}
            </h2>
            <span className="text-sm text-ink-3">{b.name}</span>
            {b.id === myBand && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">Your level</span>}
          </div>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.learning
              .filter((r) => r.band === b.id)
              .map((r) => (
                <RoomTile key={r.id} r={r} />
              ))}
          </ul>
        </section>
      ))}

      {helpLangs.map((lang) => (
        <section key={lang} className="mt-14 rounded-xl border border-line bg-surface/60 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-marker text-ink" aria-hidden="true">
              <HandHeart size={20} />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Help {languageName(lang)} learners</h2>
              <p className="mt-0.5 text-sm text-ink-2">You&apos;re a native speaker. Join a room to answer questions and keep conversations going.</p>
            </div>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.helping
              .filter((r) => r.language === lang)
              .sort((x, y) => x.band.localeCompare(y.band))
              .map((r) => (
                <RoomTile key={r.id} r={r} showBand />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
