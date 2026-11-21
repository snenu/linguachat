"use client";

import { PenLine, SendHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";
import { MISTAKE_CATEGORIES, MISTAKE_LABELS } from "@/lib/languages";
import { CorrectionDiff } from "./message-item";

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

  const changed = !!original && !!corrected.trim() && corrected.trim() !== original.trim();

  return (
    <Dialog open={original !== null} onClose={onClose} title={`Correct ${partnerName}`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">They wrote</p>
          <p className="mt-1.5 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-ink">{original}</p>
        </div>
        <Field label="A native speaker would say" htmlFor="corrected">
          <Input id="corrected" value={corrected} onChange={(e) => setCorrected(e.target.value)} autoFocus maxLength={1000} />
        </Field>
        <div className={`rounded-lg border px-3.5 py-2.5 transition-colors ${changed ? "border-accent-line bg-accent-wash" : "border-dashed border-line-strong bg-surface"}`} aria-live="polite">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
            <PenLine size={12} aria-hidden="true" /> Preview of the card
          </p>
          <div className="mt-1 text-ink">
            {changed && original ? (
              <CorrectionDiff original={original} corrected={corrected.trim()} />
            ) : (
              <p className="text-sm text-ink-3">Edit the sentence above and the changes show up here.</p>
            )}
          </div>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Type of mistake</legend>
          <div role="radiogroup" aria-label="Type of mistake" className="mt-1.5 flex flex-wrap gap-1.5">
            {MISTAKE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={category === c}
                onClick={() => setCategory(c)}
                className={`h-8 rounded-full border px-3 text-sm transition-colors ${
                  category === c ? "border-ink bg-ink font-semibold text-white" : "border-line-strong bg-surface text-ink hover:border-ink-3"
                }`}
              >
                {MISTAKE_LABELS[c]}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Why (optional)" htmlFor="note" hint="A short, friendly reason helps it stick.">
          <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="min-h-16" />
        </Field>
        <FormError message={error} />
        <div className="flex gap-2.5">
          <Button type="submit" loading={sending} icon={<SendHorizontal size={15} />}>
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
