"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, Field, FormError, Textarea } from "@/components/ui/form";
import { api, errorMessage } from "@/lib/client/api";
import {
  DAILY_TARGETS,
  GOALS,
  INTERESTS,
  LANGUAGES,
  LEVEL_LABELS,
  LEVELS,
  SELF_CHECK,
  suggestLevel,
  type Level,
} from "@/lib/languages";

const STEPS = ["Languages", "Your level", "Interests and goals", "Daily practice"] as const;

export function OnboardingFlow({ name }: { name: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [native, setNative] = useState<string[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [agreed, setAgreed] = useState<boolean[]>(SELF_CHECK.map(() => false));
  const [level, setLevel] = useState<Level | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [daily, setDaily] = useState(20);
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const suggested = useMemo(() => suggestLevel(agreed), [agreed]);
  const targetName = LANGUAGES.find((l) => l.code === target)?.name ?? "the language";

  const toggle = (list: string[], set: (v: string[]) => void, value: string, max: number) => {
    if (list.includes(value)) set(list.filter((v) => v !== value));
    else if (list.length < max) set([...list, value]);
  };

  function next() {
    setError(null);
    if (step === 0) {
      if (native.length === 0) return setError("Pick at least one language you speak natively.");
      if (!target) return setError("Pick the language you want to learn.");
      if (native.includes(target)) return setError("The language you learn can't also be a native language.");
    }
    if (step === 1 && !level) setLevel(suggested);
    if (step === 2 && interests.length === 0) return setError("Pick at least one interest so we can find good partners.");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function finish() {
    setError(null);
    setSaving(true);
    try {
      await api("/api/me", {
        method: "PATCH",
        body: {
          nativeLanguages: native,
          targetLanguage: target,
          targetLevel: level ?? suggested,
          interests,
          goals,
          dailyTarget: daily,
          bio: bio.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      router.replace("/app");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div>
      <ol className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line pb-4 text-sm" aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 ${i === step ? "font-semibold text-ink" : i < step ? "text-accent-ink" : "text-ink-3"}`} aria-current={i === step ? "step" : undefined}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${i < step ? "border-accent bg-accent text-surface" : i === step ? "border-ink" : "border-line-strong"}`}>
              {i < step ? <Check size={13} /> : i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      <div className="pt-8">
        {step === 0 && (
          <section aria-labelledby="s0">
            <h1 id="s0" className="font-display text-3xl font-semibold text-ink">
              Hi {name.split(" ")[0]}. Which languages do you speak?
            </h1>
            <p className="mt-2 text-ink-2">You&apos;ll help partners with your native languages while they help you.</p>
            <h2 className="mt-8 text-sm font-semibold text-ink">I speak natively (up to 3)</h2>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Native languages">
              {LANGUAGES.map((l) => (
                <Chip key={l.code} selected={native.includes(l.code)} onToggle={() => toggle(native, setNative, l.code, 3)} disabled={target === l.code}>
                  {l.name}
                </Chip>
              ))}
            </div>
            <h2 className="mt-8 text-sm font-semibold text-ink">I want to learn</h2>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Language to learn">
              {LANGUAGES.map((l) => (
                <Chip key={l.code} selected={target === l.code} onToggle={() => setTarget(l.code)} disabled={native.includes(l.code)}>
                  {l.name}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="s1">
            <h1 id="s1" className="font-display text-3xl font-semibold text-ink">How much {targetName} do you know?</h1>
            <p className="mt-2 text-ink-2">Tick every statement that is true for you in {targetName}. We&apos;ll suggest a CEFR level.</p>
            <ul className="mt-6 flex flex-col gap-2">
              {SELF_CHECK.map((item, i) => (
                <li key={item.level}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-surface p-3.5 hover:border-line-strong">
                    <input
                      type="checkbox"
                      checked={agreed[i]}
                      onChange={(e) => {
                        const copy = [...agreed];
                        copy[i] = e.target.checked;
                        setAgreed(copy);
                        setLevel(null);
                      }}
                      className="mt-1 h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="text-ink">{item.statement}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-lg border border-line bg-surface p-4">
              <p className="text-sm text-ink-2">
                Suggested level: <strong className="text-ink">{suggested}</strong> ({LEVEL_LABELS[suggested]}). Change it if you know better.
              </p>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Your level">
                {LEVELS.map((l) => (
                  <Chip key={l} selected={(level ?? suggested) === l} onToggle={() => setLevel(l)}>
                    {l} · {LEVEL_LABELS[l]}
                  </Chip>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="s2">
            <h1 id="s2" className="font-display text-3xl font-semibold text-ink">What do you like to talk about?</h1>
            <p className="mt-2 text-ink-2">Shared interests make conversations easier. Pick up to 10.</p>
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Interests">
              {INTERESTS.map((i) => (
                <Chip key={i} selected={interests.includes(i)} onToggle={() => toggle(interests, setInterests, i, 10)}>
                  {i}
                </Chip>
              ))}
            </div>
            <h2 className="mt-8 text-sm font-semibold text-ink">Why are you learning {targetName}? (up to 5)</h2>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Goals">
              {GOALS.map((g) => (
                <Chip key={g} selected={goals.includes(g)} onToggle={() => toggle(goals, setGoals, g, 5)}>
                  {g}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="s3">
            <h1 id="s3" className="font-display text-3xl font-semibold text-ink">Set a daily practice goal</h1>
            <p className="mt-2 text-ink-2">
              Each message you write in {targetName}, each tutor reply and each flashcard counts as one practice point.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Daily goal">
              {DAILY_TARGETS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={daily === t.value}
                  onClick={() => setDaily(t.value)}
                  className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                    daily === t.value ? "border-accent bg-accent-wash" : "border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  <span>
                    <span className="block font-semibold text-ink">{t.label}</span>
                    <span className="text-sm text-ink-2">{t.hint}</span>
                  </span>
                  <span className="font-display text-2xl font-semibold text-ink">{t.value}</span>
                </button>
              ))}
            </div>
            <div className="mt-8">
              <Field label="A line about you (optional)" htmlFor="bio" hint="Partners see this on your profile. 300 characters max.">
                <Textarea id="bio" value={bio} maxLength={300} onChange={(e) => setBio(e.target.value)} placeholder="Where you're from, what you do, what you'd like to chat about." />
              </Field>
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-col gap-4">
          <FormError message={error} />
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next} size="lg">
                Continue
              </Button>
            ) : (
              <Button onClick={finish} size="lg" loading={saving}>
                Start learning
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
