"use client";

import { BookOpenCheck, Plus, Search, Trash2, Volume2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { useMe } from "@/components/app/providers";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import { speak } from "@/lib/client/speech";
import type { VocabItem } from "@/lib/client/types";
import { languageName } from "@/lib/languages";

function strength(v: VocabItem) {
  if (v.intervalDays >= 21) return "Mastered";
  if (v.repetitions >= 2) return "Learning";
  if (v.repetitions === 1) return "Seen once";
  return "New";
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

  if (!data) return <PageLoader />;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-2">
          <strong className="text-ink">{data.counts.total}</strong> words · <strong className="text-ink">{data.counts.due}</strong> due ·{" "}
          <strong className="text-ink">{data.counts.mastered}</strong> mastered
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setAdding(true)}>
            Add word
          </Button>
          <ButtonLink href="/app/progress/review" icon={<BookOpenCheck size={16} />}>
            Review {data.counts.due || ""}
          </ButtonLink>
        </div>
      </div>
      <label className="relative block max-w-sm">
        <span className="sr-only">Search words</span>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search words or meanings" className="pl-9" />
      </label>
      {data.items.length === 0 ? (
        <EmptyState icon={<BookOpenCheck size={22} />} title={q ? "No words match" : "Your vocabulary is empty"}>
          {q
            ? "Try another search."
            : `In any chat, tap a message, then tap a word to see its meaning. Save it and it becomes a flashcard here.`}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {data.items.map((v) => (
            <li key={v.id} className="flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-pen text-lg font-semibold text-ink" lang={v.language}>
                    {v.term}
                  </span>
                  {v.reading && <span className="text-sm text-ink-3">{v.reading}</span>}
                  {v.partOfSpeech && <span className="text-xs text-ink-3">{v.partOfSpeech}</span>}
                </p>
                <p className="text-ink">{v.meaning}</p>
                {v.example && (
                  <p className="mt-0.5 text-sm text-ink-2 italic" lang={v.language}>
                    {v.example}
                  </p>
                )}
              </div>
              <span className="mt-1 shrink-0 rounded-sm bg-wash px-1.5 py-0.5 text-xs text-ink-2">{strength(v)}</span>
              <IconButton label={`Listen to ${v.term}`} onClick={() => speak(v.term, v.language)}>
                <Volume2 size={17} />
              </IconButton>
              <IconButton label={`Delete ${v.term}`} onClick={() => setConfirm(v)}>
                <Trash2 size={17} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title={`Add a ${languageName(me.targetLanguage)} word`}>
        <form onSubmit={add} className="flex flex-col gap-4">
          <Field label="Word or phrase" htmlFor="term">
            <Input id="term" value={term} onChange={(e) => setTerm(e.target.value)} required maxLength={80} autoFocus />
          </Field>
          <Field label="Meaning" htmlFor="meaning">
            <Input id="meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)} required maxLength={300} />
          </Field>
          <Field label="Example sentence (optional)" htmlFor="example">
            <Input id="example" value={example} onChange={(e) => setExample(e.target.value)} maxLength={400} />
          </Field>
          <FormError message={error} />
          <Button type="submit" loading={saving}>
            Add to vocabulary
          </Button>
        </form>
      </Dialog>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title="Delete word?">
        <p className="text-ink">
          Remove <strong>{confirm?.term}</strong> and its review history? This can&apos;t be undone.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => confirm && remove(confirm)}>Delete word</Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Keep it
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
