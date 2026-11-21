"use client";

import { PenLine, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { CorrectionDiff } from "@/components/chat/message-item";
import { IconButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { PageLoader, Spinner } from "@/components/ui/spinner";
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
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
        <Sparkles size={18} className="text-accent" aria-hidden="true" /> Patterns the coach noticed
      </h2>
      {isLoading ? (
        <div className="mt-3">
          <Spinner label="Looking for patterns" />
        </div>
      ) : error ? (
        <p className="mt-2 text-sm text-ink-2">{errorMessage(error)}</p>
      ) : !data || data.patterns.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">
          {data?.needMore ? `Keep chatting. Patterns appear after ${data.needMore} more corrections.` : "No repeating patterns yet. Nice work."}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {data.patterns.map((p) => (
            <li key={p.title} className="border-l-2 border-accent pl-3">
              <p className="font-semibold text-ink">{p.title}</p>
              <p className="text-sm text-ink-2">{p.detail}</p>
              {p.example && <p className="corrected mt-0.5 text-sm">{p.example}</p>}
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
  if (!data) return <PageLoader />;
  const total = data.byCategory.reduce((s, c) => s + c.count, 0);
  const count = (c: string) => data.byCategory.find((x) => x.category === c)?.count ?? 0;

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
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          <Chip selected={!category} onToggle={() => setCategory(null)}>
            All {total}
          </Chip>
          {MISTAKE_CATEGORIES.filter((c) => count(c) > 0).map((c) => (
            <Chip key={c} selected={category === c} onToggle={() => setCategory(category === c ? null : c)}>
              {MISTAKE_LABELS[c]} {count(c)}
            </Chip>
          ))}
        </div>
        <ul className="flex flex-col gap-2.5">
          {data.items.map((m) => (
            <li key={m.id} className="rounded-lg border border-line bg-surface px-4 py-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 text-ink">
                  <CorrectionDiff original={m.original} corrected={m.corrected} />
                  {m.explanation && <p className="mt-1 text-sm text-ink-2">{m.explanation}</p>}
                  <p className="mt-1.5 text-xs text-ink-3">
                    {MISTAKE_LABELS[m.category as MistakeCategory] ?? m.category}
                    {m.tag ? ` · ${m.tag}` : ""} · {m.source === "partner" && m.correctedByName ? `Corrected by ${m.correctedByName}` : SOURCE[m.source]} ·{" "}
                    {new Date(m.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </p>
                </div>
                <IconButton label="Remove from log" onClick={() => remove(m.id)}>
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="flex flex-col gap-4">
        <Patterns />
        {data.topTags.length > 0 && (
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-serif text-lg font-semibold text-ink">Most frequent</h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {data.topTags.map((t) => (
                <li key={t.tag} className="flex justify-between gap-2">
                  <span className="text-ink">{t.tag}</span>
                  <span className="text-ink-3 tabular-nums">{t.count}×</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
