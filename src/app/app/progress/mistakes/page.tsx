"use client";

import { PenLine, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { CorrectionDiff } from "@/components/chat/message-item";
import { IconButton } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import type { MistakeItem } from "@/lib/client/types";
import { MISTAKE_CATEGORIES, MISTAKE_LABELS, type MistakeCategory } from "@/lib/languages";

const SOURCE: Record<string, string> = {
  check: "Checked before sending",
  auto: "Coach note in chat",
  partner: "Partner correction",
  tutor: "AI tutor",
  voice: "Voice message",
};

/** One color per mistake type, used for dots, bars and the stripe on each entry. */
const CATEGORY_COLOR: Record<string, { bg: string; border: string }> = {
  grammar: { bg: "bg-red", border: "border-l-red" },
  vocabulary: { bg: "bg-accent", border: "border-l-accent" },
  spelling: { bg: "bg-marker", border: "border-l-marker" },
  word_order: { bg: "bg-mint", border: "border-l-mint" },
  other: { bg: "bg-ink-3", border: "border-l-ink-3" },
};
const color = (c: string) => CATEGORY_COLOR[c] ?? CATEGORY_COLOR.other;

interface MistakesResponse {
  items: MistakeItem[];
  byCategory: { category: string; count: number }[];
  topTags: { tag: string; category: string; count: number }[];
}

function Patterns() {
  const { data, error, isLoading } = useSWR<{ patterns: { title: string; detail: string; example: string }[]; needMore: number }>("/api/mistakes/patterns", {
    revalidateOnFocus: false,
  });
  return (
    <section className="rounded-xl border border-accent-line bg-accent-wash/70 p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-white" aria-hidden="true">
          <Sparkles size={16} />
        </span>
        Patterns the coach noticed
      </h2>
      {isLoading ? (
        <div className="mt-4 flex flex-col gap-2" aria-label="Looking for patterns">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-ink-2">{errorMessage(error)}</p>
      ) : !data || data.patterns.length === 0 ? (
        <p className="mt-3 text-sm text-ink-2">
          {data?.needMore ? `Keep chatting. Patterns appear after ${data.needMore} more corrections.` : "No repeating patterns yet. Nice work."}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {data.patterns.map((p) => (
            <li key={p.title} className="animate-ink-in rounded-lg bg-surface p-3.5 shadow-sm">
              <p className="font-bold text-ink">{p.title}</p>
              <p className="mt-0.5 text-sm text-ink-2">{p.detail}</p>
              {p.example && <p className="corrected mt-1.5 text-sm">{p.example}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function MistakesPage() {
  const toast = useToast();
  const [category, setCategory] = useState<string | null>(null);
  const { data, mutate } = useSWR<MistakesResponse>(`/api/mistakes${category ? `?category=${category}` : ""}`, { keepPreviousData: true });
  if (!data) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]" aria-busy="true">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 rounded-xl" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }
  const total = data.byCategory.reduce((s, c) => s + c.count, 0);
  const count = (c: string) => data.byCategory.find((x) => x.category === c)?.count ?? 0;
  const present = MISTAKE_CATEGORIES.filter((c) => count(c) > 0);
  const topMax = Math.max(1, ...data.topTags.map((t) => t.count));

  async function remove(id: string) {
    try {
      await api(`/api/mistakes/${id}`, { method: "DELETE" });
      void mutate();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  if (total === 0) {
    return (
      <EmptyState icon={<PenLine size={22} />} title="No mistakes logged yet">
        Corrections from the coach, your partners and the AI tutor collect here, grouped by type, so you can see what to work on.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex h-3 overflow-hidden rounded-full bg-wash" role="img" aria-label={present.map((c) => `${MISTAKE_LABELS[c]}: ${count(c)}`).join(", ")}>
            {present.map((c) => (
              <span key={c} className={`h-full ${color(c).bg} transition-[width] duration-500`} style={{ width: `${(count(c) / total) * 100}%` }} />
            ))}
          </div>
          <div className="mt-3.5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
            <button
              type="button"
              aria-pressed={!category}
              onClick={() => setCategory(null)}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
                !category ? "border-ink bg-ink font-semibold text-white" : "border-line-strong text-ink hover:border-ink-3"
              }`}
            >
              All <span className="tabular-nums opacity-70">{total}</span>
            </button>
            {present.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(category === c ? null : c)}
                className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
                  category === c ? "border-ink bg-ink font-semibold text-white" : "border-line-strong text-ink hover:border-ink-3"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${color(c).bg}`} aria-hidden="true" />
                {MISTAKE_LABELS[c]} <span className="tabular-nums opacity-70">{count(c)}</span>
              </button>
            ))}
          </div>
        </div>

        <ul className="flex flex-col gap-2.5">
          {data.items.map((m) => (
            <li key={m.id} className={`animate-ink-in rounded-xl border border-l-4 border-line bg-surface px-4 py-3.5 shadow-sm ${color(m.category).border}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 text-ink">
                  <CorrectionDiff original={m.original} corrected={m.corrected} />
                  {m.explanation && <p className="mt-1.5 text-sm text-ink-2">{m.explanation}</p>}
                  <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                    <span className="rounded-full bg-wash px-2 py-0.5 font-semibold text-ink-2">
                      {MISTAKE_LABELS[m.category as MistakeCategory] ?? m.category}
                    </span>
                    {m.tag && <span className="rounded-full border border-line px-2 py-0.5">{m.tag}</span>}
                    <span className="ml-1">{m.source === "partner" && m.correctedByName ? `Corrected by ${m.correctedByName}` : SOURCE[m.source]}</span>
                    <span className="ml-auto">{new Date(m.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                  </p>
                </div>
                <IconButton label="Remove from log" onClick={() => remove(m.id)} className="-mt-1 -mr-1 hover:text-red-ink">
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <Patterns />
        {data.topTags.length > 0 && (
          <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-ink">Most frequent</h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm">
              {data.topTags.map((t) => (
                <li key={t.tag}>
                  <div className="flex justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-ink">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${color(t.category).bg}`} aria-hidden="true" />
                      <span className="truncate">{t.tag}</span>
                    </span>
                    <span className="font-semibold text-ink-2 tabular-nums">{t.count}×</span>
                  </div>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-wash" aria-hidden="true">
                    <span className={`block h-full rounded-full ${color(t.category).bg}`} style={{ width: `${(t.count / topMax) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
