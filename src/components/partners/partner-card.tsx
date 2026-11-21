"use client";

import { Avatar } from "@/components/ui/avatar";
import { LangTag } from "@/components/ui/misc";
import { ONLINE_BONUS } from "@/lib/compat";
import type { Candidate } from "@/lib/client/types";

export function activeLabel(lastActiveAt: string | null, online: boolean): string {
  if (online) return "Online now";
  if (!lastActiveAt) return "Not active yet";
  const mins = Math.round((Date.now() - new Date(lastActiveAt).getTime()) / 60000);
  if (mins < 3) return "Active just now";
  if (mins < 60) return `Active ${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Active ${hours} h ago`;
  const days = Math.round(hours / 24);
  return `Active ${days} day${days === 1 ? "" : "s"} ago`;
}

export function scoreWithPresence(c: Candidate, online: boolean) {
  return Math.min(100, c.score + (online ? ONLINE_BONUS : 0));
}

export function PartnerCard({ candidate, online, onOpen }: { candidate: Candidate; online: boolean; onOpen: () => void }) {
  const p = candidate.profile;
  const score = scoreWithPresence(candidate, online);
  const relation =
    candidate.relation === "partner"
      ? "Partner"
      : candidate.relation === "requested"
        ? "Request sent"
        : candidate.relation === "incoming"
          ? "Wants to chat with you"
          : null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:border-ink-3"
      aria-label={`${p.name}, ${score}% match. Open profile`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={p.name} src={p.avatarUrl} size={48} online={online} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold text-ink">{p.name}</span>
            <span className="shrink-0 font-display text-lg font-semibold text-ink" title="Compatibility">
              {score}
              <span className="text-sm text-ink-3">%</span>
            </span>
          </div>
          <p className="text-xs text-ink-3">{activeLabel(p.lastActiveAt, online)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
        <span>Speaks</span>
        {p.nativeLanguages.map((l) => (
          <LangTag key={l} code={l} />
        ))}
        <span className="ml-1">learning</span>
        <LangTag code={p.targetLanguage} level={p.targetLevel} />
      </div>
      {candidate.reasons[0] && <p className="text-sm text-ink-2">{candidate.reasons[0]}</p>}
      {relation && (
        <span className={`self-start rounded-sm px-2 py-0.5 text-xs font-semibold ${candidate.relation === "incoming" ? "bg-marker text-ink" : "bg-wash text-ink-2"}`}>
          {relation}
        </span>
      )}
    </button>
  );
}
