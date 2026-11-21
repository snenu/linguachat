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

const heading = "font-display text-3xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl";

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
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-semibold text-ink">{STEPS[step]}</p>
        <p className="text-ink-3">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
      <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className="h-1.5 overflow-hidden rounded-full bg-line">
            <span className="sr-only">
              {s}
              {i < step ? " (done)" : ""}
            </span>
            <span className={`block h-full rounded-full bg-accent transition-[width] duration-500 ease-[var(--ease-out)] ${i <= step ? "w-full" : "w-0"}`} />
          </li>
        ))}
      </ol>

      <div key={step} className="animate-ink-in pt-10">
        {step === 0 && (
          <section aria-labelledby="s0">
            <h1 id="s0" className={heading}>
              Hi {name.split(" ")[0]}. Which languages do you speak?
            </h1>
            <p className="mt-2 text-ink-2">You&apos;ll help partners with your native languages while they help you with theirs.</p>
            <h2 className="mt-8 text-sm font-semibold text-ink">I speak natively (up to 3)</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" role="group" aria-label="Native languages">
              {LANGUAGES.map((l) => (
                <LanguageTile
                  key={l.code}
                  code={l.code}
                  name={l.name}
                  native={l.native}
                  rtl={l.rtl}
                  selected={native.includes(l.code)}
                  onToggle={() => toggle(native, setNative, l.code, 3)}
                  disabled={target === l.code}
                />
              ))}
            </div>
            <h2 className="mt-8 text-sm font-semibold text-ink">I want to learn</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" role="radiogroup" aria-label="Language to learn">
              {LANGUAGES.map((l) => (
                <LanguageTile
                  key={l.code}
                  code={l.code}
                  name={l.name}
                  native={l.native}
                  rtl={l.rtl}
                  selected={target === l.code}
                  onToggle={() => setTarget(l.code)}
                  disabled={native.includes(l.code)}
                />
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="s1">
            <h1 id="s1" className={heading}>
              How much {targetName} do you know?
            </h1>
            <p className="mt-2 text-ink-2">Tick every statement that is true for you in {targetName}. We&apos;ll suggest a CEFR level.</p>
            <ul className="mt-6 flex flex-col gap-2">
              {SELF_CHECK.map((item, i) => (
                <li key={item.level}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                      agreed[i] ? "border-accent-line bg-accent-wash" : "border-line bg-surface hover:border-line-strong"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreed[i]}
                      onChange={(e) => {
                        const copy = [...agreed];
                        copy[i] = e.target.checked;
                        setAgreed(copy);
                        setLevel(null);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="flex-1 text-ink">{item.statement}</span>
                    <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-ink-3">{item.level}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-line bg-paper p-4 sm:p-5">
              <p className="text-sm text-ink-2">
                Suggested level: <strong className="text-ink">{suggested}</strong> ({LEVEL_LABELS[suggested]}). Change it if you know better.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-6" role="radiogroup" aria-label="Your level">
                {LEVELS.map((l, i) => {
                  const on = (level ?? suggested) === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setLevel(l)}
                      className={`flex flex-col items-center gap-0.5 rounded-md border px-2 py-2.5 transition-[background-color,border-color,transform] active:scale-95 ${
                        on ? "border-accent bg-accent text-white shadow-sm" : "border-line bg-surface text-ink hover:border-accent-line"
                      }`}
                    >
                      <span className="font-display text-lg font-bold">{l}</span>
                      <span className={`text-[0.7rem] leading-tight ${on ? "text-white/80" : "text-ink-3"}`}>{LEVEL_LABELS[l]}</span>
                      <span className="mt-1 flex gap-0.5" aria-hidden="true">
                        {LEVELS.map((_, j) => (
                          <span key={j} className={`h-1 w-1.5 rounded-full ${j <= i ? (on ? "bg-white" : "bg-accent") : on ? "bg-white/30" : "bg-line"}`} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="s2">
            <h1 id="s2" className={heading}>
              What do you like to talk about?
            </h1>
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
            <h1 id="s3" className={heading}>
              Set a daily practice goal
            </h1>
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
                  className={`flex items-center justify-between rounded-lg border p-4 text-left transition-[background-color,border-color,box-shadow,transform] active:scale-[0.98] ${
                    daily === t.value ? "border-accent bg-accent-wash shadow-sm ring-1 ring-accent" : "border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  <span>
                    <span className="block font-semibold text-ink">{t.label}</span>
                    <span className="text-sm text-ink-2">{t.hint}</span>
                  </span>
                  <span className={`font-display text-3xl font-extrabold ${daily === t.value ? "text-accent" : "text-ink"}`}>{t.value}</span>
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
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <FormError message={error} />
        <div className="flex items-center justify-between gap-3 border-t border-line pt-6">
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
  );
}

/** A language choice written in its own script; the accessible name is the English name. */
function LanguageTile({
  code,
  name,
  native,
  rtl,
  selected,
  onToggle,
  disabled,
}: {
  code: string;
  name: string;
  native: string;
  rtl: boolean;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={name}
      disabled={disabled}
      onClick={onToggle}
      className={`relative flex flex-col items-start rounded-lg border px-3.5 py-2.5 text-left transition-[background-color,border-color,box-shadow,transform] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35 ${
        selected ? "border-accent bg-accent text-white shadow-sm" : "border-line bg-surface text-ink hover:border-accent-line hover:shadow-sm"
      }`}
    >
      <span lang={code} dir={rtl ? "rtl" : undefined} className="font-display text-lg font-bold">
        {native}
      </span>
      <span className={`text-xs ${selected ? "text-white/80" : "text-ink-3"}`}>{name}</span>
      {selected && (
        <span className="animate-pop-in absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-accent">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
