"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { MISTAKE_CATEGORIES, MISTAKE_LABELS } from "@/lib/languages";

export interface CorrectionDraft {
  original: string;
  corrected: string;
  note: string;
  category: string;
}

/** Lets a partner write a correction card: what they wrote, what a native would say, and why. */
export function CorrectionDialog({
  original,
  partnerName,
  onClose,
  onSend,
}: {
  original: string | null;
  partnerName: string;
  onClose: () => void;
  onSend: (draft: CorrectionDraft) => Promise<void>;
}) {
  const [corrected, setCorrected] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("grammar");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (original !== null) {
      setCorrected(original);
      setNote("");
      setError(null);
    }
  }, [original]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!original) return;
    if (!corrected.trim() || corrected.trim() === original.trim()) {
      setError("Change the sentence to show the natural way to say it.");
      return;
    }
    setSending(true);
    try {
      await onSend({ original, corrected: corrected.trim(), note: note.trim(), category });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the correction.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={original !== null} onClose={onClose} title={`Correct ${partnerName}`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">They wrote</p>
          <p className="mt-1 rounded-md bg-wash px-3 py-2 text-ink">{original}</p>
        </div>
        <Field label="A native speaker would say" htmlFor="corrected">
          <Input id="corrected" value={corrected} onChange={(e) => setCorrected(e.target.value)} autoFocus maxLength={1000} />
        </Field>
        <Field label="Type of mistake" htmlFor="category">
          <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {MISTAKE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {MISTAKE_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Why (optional)" htmlFor="note" hint="A short, friendly reason helps it stick.">
          <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="min-h-16" />
        </Field>
        <FormError message={error} />
        <div className="flex gap-3">
          <Button type="submit" loading={sending}>
            Send correction card
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
