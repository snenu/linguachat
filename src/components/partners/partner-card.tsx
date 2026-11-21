"use client";

import { Check } from "lucide-react";
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

/** Compatibility as a ring: the fuller and bluer, the better the tandem fit. */
export function MatchRing({ score, size = 52 }: { score: number; size?: number }) {
  const stroke = size >= 64 ? 6 : 4.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? "var(--accent)" : score >= 45 ? "var(--marker)" : "var(--line-strong)";
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} title="Compatibility">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--wash)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-ink tabular-nums" style={{ fontSize: size * 0.3 }}>
        {score}
        <span className="text-[0.6em] text-ink-3">%</span>
      </span>
    </span>
  );
}

const RELATION: Record<Candidate["relation"], { label: string; className: string } | null> = {
  none: null,
  partner: { label: "Partner", className: "bg-mint-wash text-mint" },
  requested: { label: "Request sent", className: "bg-wash text-ink-2" },
  incoming: { label: "Wants to chat with you", className: "bg-marker text-ink" },
};

export function PartnerCard({ candidate, online, onOpen }: { candidate: Candidate; online: boolean; onOpen: () => void }) {
  const p = candidate.profile;
  const score = scoreWithPresence(candidate, online);
  const relation = RELATION[candidate.relation];
  const shared = candidate.sharedInterests.slice(0, 3);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col gap-3.5 rounded-xl border border-line bg-surface p-4 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent-line hover:shadow-md active:translate-y-0"
      aria-label={`${p.name}, ${score}% match. Open profile`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={p.name} src={p.avatarUrl} size={52} online={online} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="line-clamp-2 font-bold break-words text-ink group-hover:text-accent-ink">{p.name}</p>
          <p className={`text-xs ${online ? "font-semibold text-mint" : "text-ink-3"}`}>{activeLabel(p.lastActiveAt, online)}</p>
          {relation && <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${relation.className}`}>{relation.label}</span>}
        </div>
        <MatchRing score={score} />
      </div>

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1.5 text-xs">
        <dt className="text-ink-3">Speaks</dt>
        <dd className="flex flex-wrap gap-1">
          {p.nativeLanguages.map((l) => (
            <LangTag key={l} code={l} />
          ))}
        </dd>
        <dt className="text-ink-3">Learning</dt>
        <dd>
          <LangTag code={p.targetLanguage} level={p.targetLevel} />
        </dd>
      </dl>

      {candidate.reasons[0] && (
        <p className="flex items-start gap-1.5 text-sm text-ink-2">
          <Check size={15} strokeWidth={3} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />
          {candidate.reasons[0]}
        </p>
      )}

      {shared.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1.5 border-t border-line pt-3">
          {shared.map((i) => (
            <span key={i} className="rounded-full bg-accent-wash px-2 py-0.5 text-xs font-semibold text-accent-ink">
              {i}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
