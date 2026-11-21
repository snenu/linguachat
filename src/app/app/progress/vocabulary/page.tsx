"use client";

import { BookOpenCheck, Plus, Search, Trash2, Volume2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { useMe } from "@/components/app/providers";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input } from "@/components/ui/form";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import { speak } from "@/lib/client/speech";
import type { VocabItem } from "@/lib/client/types";
import { languageName } from "@/lib/languages";

/** How settled a word is in memory, from its SM-2 state: 1 (new) to 4 (mastered). */
function strength(v: VocabItem): { label: string; level: number } {
  if (v.intervalDays >= 21) return { label: "Mastered", level: 4 };
  if (v.repetitions >= 2) return { label: "Learning", level: 3 };
  if (v.repetitions === 1) return { label: "Seen once", level: 2 };
  return { label: "New", level: 1 };
}

function StrengthMeter({ v }: { v: VocabItem }) {
  const { label, level } = strength(v);
  return (
    <span className="flex flex-col items-end gap-1" title={`Memory strength: ${label}`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 w-4 rounded-full ${i <= level ? (level === 4 ? "bg-mint" : "bg-accent") : "bg-wash"}`} />
        ))}
      </span>
      <span className="text-xs text-ink-3">{label}</span>
    </span>
  );
}

export default function VocabularyPage() {
  const { me } = useMe();
  const toast = useToast();
  const [q, setQ] = useState("");
  const { data, mutate } = useSWR<{ items: VocabItem[]; counts: { total: number; due: number; mastered: number } }>(
    `/api/vocab${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`,
    { keepPreviousData: true },
  );
  const [adding, setAdding] = useState(false);
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<VocabItem | null>(null);
  // "Due" badges compare against the time the page opened.
  const [now] = useState(() => Date.now());

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/vocab", { body: { term, meaning, example, language: me.targetLanguage, source: "manual" } });
      toast(`"${term}" added`);
      setTerm("");
      setMeaning("");
      setExample("");
      setAdding(false);
      void mutate();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(v: VocabItem) {
    try {
      await api(`/api/vocab/${v.id}`, { method: "DELETE" });
      setConfirm(null);
      toast(`"${v.term}" removed`);
      void mutate();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-20 rounded-xl" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <dl className="flex gap-6 sm:gap-8">
          {(
            [
              ["Words", data.counts.total, "text-ink"],
              ["Due now", data.counts.due, data.counts.due ? "text-accent" : "text-ink"],
              ["Mastered", data.counts.mastered, "text-mint"],
            ] as const
          ).map(([label, value, color]) => (
            <div key={label}>
              <dt className="text-sm text-ink-2">{label}</dt>
              <dd className={`font-display text-3xl font-bold tabular-nums ${color}`}>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setAdding(true)}>
            Add word
          </Button>
          <ButtonLink href="/app/progress/review" variant={data.counts.due ? "primary" : "secondary"} icon={<BookOpenCheck size={16} />}>
            {data.counts.due ? `Review ${data.counts.due}` : "Review"}
          </ButtonLink>
        </div>
      </div>

      <label className="relative block max-w-md">
        <span className="sr-only">Search words</span>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search words or meanings" className="pl-9" />
      </label>

      {data.items.length === 0 ? (
        <EmptyState
          icon={<BookOpenCheck size={22} />}
          title={q ? "No words match" : "Your vocabulary is empty"}
          action={
            !q && (
              <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setAdding(true)}>
                Add your first word
              </Button>
            )
          }
        >
          {q ? "Try another search." : "In any chat, tap a message, then tap a word to see its meaning. Save it and it becomes a flashcard here."}
        </EmptyState>
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2">
          {data.items.map((v) => {
            const due = new Date(v.dueAt).getTime() <= now;
            return (
              <li key={v.id} className="group flex gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-pen text-xl font-semibold text-ink" lang={v.language}>
                      {v.term}
                    </span>
                    {v.reading && <span className="text-sm text-ink-3">{v.reading}</span>}
                    {v.partOfSpeech && <span className="rounded-full bg-wash px-1.5 text-xs text-ink-2">{v.partOfSpeech}</span>}
                    {due && <span className="rounded-full bg-accent-wash px-1.5 text-xs font-semibold text-accent-ink">Due</span>}
                  </p>
                  <p className="mt-0.5 text-ink">{v.meaning}</p>
                  {v.example && (
                    <p className="mt-1.5 border-l-2 border-marker pl-2.5 text-sm text-ink-2 italic" lang={v.language}>
                      {v.example}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                  <StrengthMeter v={v} />
                  <div className="flex gap-0.5">
                    <IconButton label={`Listen to ${v.term}`} onClick={() => speak(v.term, v.language)}>
                      <Volume2 size={17} />
                    </IconButton>
                    <IconButton label={`Delete ${v.term}`} onClick={() => setConfirm(v)} className="hover:text-red-ink">
                      <Trash2 size={17} />
                    </IconButton>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title={`Add a ${languageName(me.targetLanguage)} word`}>
        <form onSubmit={add} className="flex flex-col gap-4">
          <Field label="Word or phrase" htmlFor="term">
            <Input id="term" value={term} onChange={(e) => setTerm(e.target.value)} required maxLength={80} autoFocus lang={me.targetLanguage ?? undefined} />
          </Field>
          <Field label="Meaning" htmlFor="meaning">
            <Input id="meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)} required maxLength={300} />
          </Field>
          <Field label="Example sentence (optional)" htmlFor="example">
            <Input id="example" value={example} onChange={(e) => setExample(e.target.value)} maxLength={400} lang={me.targetLanguage ?? undefined} />
          </Field>
          <FormError message={error} />
          <Button type="submit" loading={saving}>
            Add to vocabulary
          </Button>
        </form>
      </Dialog>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title="Delete word?">
        <p className="text-ink">
          Remove <strong className="font-pen">{confirm?.term}</strong> and its review history? This can&apos;t be undone.
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="danger" onClick={() => confirm && remove(confirm)}>
            Delete word
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Keep it
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
