"use client";

import { Hash, Lightbulb, UsersRound } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { useMe } from "@/components/app/providers";
import { PageHeader } from "@/components/ui/misc";
import { PageLoader } from "@/components/ui/spinner";
import type { RoomSummary } from "@/lib/client/types";
import { BANDS } from "@/lib/rooms";
import { bandForLevel } from "@/lib/rooms";
import { languageName } from "@/lib/languages";

function RoomRow({ r }: { r: RoomSummary }) {
  return (
    <li>
      <Link href={`/app/rooms/${r.id}`} className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-ink-3">
        <Hash size={18} className="mt-0.5 shrink-0 text-ink-2" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">{r.topicName}</span>
            {r.joined && <span className="rounded-sm bg-accent-wash px-1.5 py-0.5 text-xs font-semibold text-accent-ink">Joined</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-3">
            <UsersRound size={13} aria-hidden="true" /> {r.memberCount} {r.memberCount === 1 ? "member" : "members"}
          </span>
          {r.todayPrompt && (
            <span className="mt-2 flex items-start gap-1.5 text-sm text-ink-2">
              <Lightbulb size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2">{r.todayPrompt}</span>
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

export default function RoomsPage() {
  const { me } = useMe();
  const { data } = useSWR<{ learning: RoomSummary[]; helping: RoomSummary[]; level: string }>("/api/rooms");
  if (!data) return <PageLoader label="Loading rooms" />;
  const myBand = bandForLevel(me.targetLevel);
  const bands = [...BANDS].sort((a, b) => (a.id === myBand ? -1 : b.id === myBand ? 1 : 0));
  const helpLangs = [...new Set(data.helping.map((r) => r.language))];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <PageHeader
        title="Practice rooms"
        description={`Group chats for ${languageName(me.targetLanguage)} learners by level and topic. A new conversation prompt is posted every day.`}
      />
      {bands.map((b) => (
        <section key={b.id} className="mt-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            {languageName(me.targetLanguage)} {b.label}
            <span className="ml-2 text-base font-normal text-ink-3">
              {b.name}
              {b.id === myBand ? ", your level" : ""}
            </span>
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.learning.filter((r) => r.band === b.id).map((r) => (
              <RoomRow key={r.id} r={r} />
            ))}
          </ul>
        </section>
      ))}
      {helpLangs.map((lang) => (
        <section key={lang} className="mt-12 border-t border-line pt-8">
          <h2 className="font-display text-xl font-semibold text-ink">Help {languageName(lang)} learners</h2>
          <p className="mt-1 text-sm text-ink-2">You&apos;re a native speaker. Join a room to answer questions and keep conversations going.</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.helping.filter((r) => r.language === lang && r.band === "a").map((r) => (
              <RoomRow key={r.id} r={r} />
            ))}
            {data.helping.filter((r) => r.language === lang && r.band !== "a").map((r) => (
              <RoomRow key={r.id} r={{ ...r, topicName: `${r.bandLabel}: ${r.topicName}` }} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
