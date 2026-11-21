"use client";

import { Camera, Check, Languages, LogOut, ShieldOff, SlidersHorizontal, Sparkles, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import useSWR from "swr";
import { useMe } from "@/components/app/providers";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Chip, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import type { Profile } from "@/lib/client/types";
import { DAILY_TARGETS, GOALS, INTERESTS, LANGUAGES, LEVEL_LABELS, LEVELS } from "@/lib/languages";
import { nexconn } from "@/lib/nexconn/client";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "interests", label: "Interests and goals", icon: Sparkles },
  { id: "coaching", label: "Practice and coaching", icon: SlidersHorizontal },
  { id: "blocked", label: "Blocked people", icon: ShieldOff },
  { id: "account", label: "Account", icon: LogOut },
];

function Section({ id, title, description, children, tone = "default" }: { id: string; title: string; description?: string; children: ReactNode; tone?: "default" | "danger" }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-6 rounded-xl border bg-surface p-5 shadow-sm sm:p-6 ${tone === "danger" ? "border-red/30" : "border-line"}`}
    >
      <h2 id={`${id}-title`} className={`font-display text-xl font-bold ${tone === "danger" ? "text-red-ink" : "text-ink"}`}>
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { me, refresh } = useMe();
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio);
  const [native, setNative] = useState<string[]>(me.nativeLanguages);
  const [target, setTarget] = useState(me.targetLanguage ?? "en");
  const [level, setLevel] = useState(me.targetLevel ?? "A1");
  const [interests, setInterests] = useState<string[]>(me.interests);
  const [goals, setGoals] = useState<string[]>(me.goals);
  const [daily, setDaily] = useState(me.dailyTarget);
  const [autoCorrect, setAutoCorrect] = useState(me.autoCorrect);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { data: blocked, mutate: refreshBlocked } = useSWR<{ blocked: Profile[] }>("/api/blocks");

  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const dirty =
    name !== me.name ||
    bio !== me.bio ||
    !same(native, me.nativeLanguages) ||
    target !== (me.targetLanguage ?? "en") ||
    level !== (me.targetLevel ?? "A1") ||
    !same(interests, me.interests) ||
    !same(goals, me.goals) ||
    daily !== me.dailyTarget ||
    autoCorrect !== me.autoCorrect;

  const toggle = (list: string[], set: (v: string[]) => void, v: string, max: number) =>
    list.includes(v) ? set(list.filter((x) => x !== v)) : list.length < max && set([...list, v]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/me", {
        method: "PATCH",
        body: { name, bio, nativeLanguages: native, targetLanguage: target, targetLevel: level, interests, goals, dailyTarget: daily, autoCorrect },
      });
      await refresh();
      toast("Settings saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api("/api/me/avatar", { form });
      await refresh();
      toast("Photo updated");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  }

  async function unblock(p: Profile) {
    try {
      await api(`/api/blocks/${p.id}`, { method: "DELETE" });
      void refreshBlocked();
      toast(`${p.name} is unblocked`);
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function deleteAccount() {
    try {
      await api("/api/me", { method: "DELETE", body: { confirm: "DELETE" } });
      await nexconn().disconnect();
      router.replace("/");
      router.refresh();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="pb-6">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Settings</h1>
        <p className="mt-1.5 text-ink-2">Your profile, languages and coaching preferences.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-6 flex flex-col gap-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a href={`#${id}`} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface hover:text-ink">
                  <Icon size={15} aria-hidden="true" /> {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-5">
          <form onSubmit={save} className="flex flex-col gap-5">
            <Section id="profile" title="Profile" description="What your partners see when they find you.">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="group relative rounded-full focus-visible:outline-2 focus-visible:outline-offset-4"
                    aria-label="Change photo"
                  >
                    <Avatar name={me.name} src={me.avatarUrl} size={96} />
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-night/0 text-white opacity-0 transition-[background-color,opacity] group-hover:bg-night/45 group-hover:opacity-100">
                      <Camera size={22} aria-hidden="true" />
                    </span>
                    <span className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-accent text-white shadow-sm">
                      {uploading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Camera size={14} aria-hidden="true" />}
                    </span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    aria-label="Upload profile photo"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                  />
                  <p className="text-center text-xs text-ink-3">JPG, PNG or WebP, up to 2 MB</p>
                </div>
                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <Field label="Name" htmlFor="name">
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
                  </Field>
                  <Field label="Email" htmlFor="email" hint="Used to sign in. Not shown to others.">
                    <Input id="email" value={me.email} disabled />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="About you" htmlFor="bio" hint={`${bio.length}/300`}>
                      <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} placeholder="What you do, what you'd like to talk about." />
                    </Field>
                  </div>
                </div>
              </div>
            </Section>

            <Section id="languages" title="Languages" description="Partners are matched on these, so keep them accurate.">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Native <span className="font-normal text-ink-3">up to 3, {native.length} chosen</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LANGUAGES.map((l) => (
                      <Chip key={l.code} selected={native.includes(l.code)} disabled={l.code === target} onToggle={() => toggle(native, setNative, l.code, 3)}>
                        {l.name}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Learning" htmlFor="target">
                    <Select id="target" value={target} onChange={(e) => setTarget(e.target.value)}>
                      {LANGUAGES.filter((l) => !native.includes(l.code)).map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Level" htmlFor="level">
                    <Select id="level" value={level} onChange={(e) => setLevel(e.target.value)}>
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}: {LEVEL_LABELS[l]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            </Section>

            <Section id="interests" title="Interests and goals" description="Shared interests raise your match score and give you things to talk about.">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Interests <span className="font-normal text-ink-3">{interests.length} of 10</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {INTERESTS.map((i) => (
                      <Chip key={i} selected={interests.includes(i)} onToggle={() => toggle(interests, setInterests, i, 10)}>
                        {i}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Goals <span className="font-normal text-ink-3">{goals.length} of 5</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <Chip key={g} selected={goals.includes(g)} onToggle={() => toggle(goals, setGoals, g, 5)}>
                        {g}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section id="coaching" title="Practice and coaching">
              <div className="flex flex-col gap-5">
                <fieldset>
                  <legend className="text-sm font-semibold text-ink">Daily goal</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DAILY_TARGETS.map((t) => {
                      const on = daily === t.value;
                      return (
                        <label
                          key={t.value}
                          className={`relative flex cursor-pointer flex-col rounded-lg border p-3 transition-[border-color,background-color,box-shadow] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                            on ? "border-accent bg-accent-wash shadow-sm" : "border-line-strong hover:border-accent-line"
                          }`}
                        >
                          <input type="radio" name="daily" value={t.value} checked={on} onChange={() => setDaily(t.value)} className="sr-only" />
                          <span className="font-bold text-ink">{t.label}</span>
                          <span className="font-display text-2xl font-bold text-ink tabular-nums">{t.value}</span>
                          <span className="text-xs text-ink-3">{t.hint}</span>
                          {on && (
                            <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white" aria-hidden="true">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-ink-3">Practice points per day. Messages, corrections, saved words, reviews and tutor turns all count.</p>
                </fieldset>

                <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-line bg-paper p-4">
                  <span>
                    <span className="block font-bold text-ink">Coach notes after I send</span>
                    <span className="mt-0.5 block text-sm text-ink-2">
                      The coach attaches a quiet correction to your messages in the language you&apos;re learning. Your partner can see it too. Check
                      before sending always works.
                    </span>
                  </span>
                  <input type="checkbox" checked={autoCorrect} onChange={(e) => setAutoCorrect(e.target.checked)} className="peer sr-only" />
                  <span
                    aria-hidden="true"
                    className="relative mt-1 h-6 w-10 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
                  />
                </label>
              </div>
            </Section>

            <FormError message={error} />
            <div className="sticky bottom-20 z-10 lg:bottom-4">
              <div
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-md backdrop-blur-md transition-colors ${
                  dirty ? "border-accent-line bg-surface/95" : "border-line bg-surface/85"
                }`}
              >
                <p className="text-sm text-ink-2" aria-live="polite">
                  {dirty ? "You have unsaved changes." : "Everything is saved."}
                </p>
                <Button type="submit" loading={saving} disabled={!dirty && !saving}>
                  Save changes
                </Button>
              </div>
            </div>
          </form>

          <Section id="blocked" title="Blocked people" description="Blocked people can't message you or find you in partner search.">
            {!blocked || blocked.blocked.length === 0 ? (
              <p className="text-sm text-ink-2">You haven&apos;t blocked anyone.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {blocked.blocked.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Avatar name={p.name} src={p.avatarUrl} size={36} />
                    <span className="flex-1 text-sm font-semibold text-ink">{p.name}</span>
                    <Button size="sm" variant="secondary" onClick={() => unblock(p)}>
                      Unblock
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="account" title="Delete account" tone="danger" description="Removes your profile, vocabulary, mistake log and partnerships from LinguaChat. This can't be undone.">
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => setDeleteOpen(true)}>
              Delete my account
            </Button>
          </Section>
        </div>
      </div>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setConfirmText("");
        }}
        title="Delete your account?"
      >
        <p className="text-ink">
          This permanently deletes your LinguaChat data. Type <strong className="font-bold text-red-ink">DELETE</strong> to confirm.
        </p>
        <Input className="mt-3" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Type DELETE to confirm" autoComplete="off" />
        <div className="mt-4 flex gap-3">
          <Button variant="danger" disabled={confirmText !== "DELETE"} onClick={deleteAccount}>
            Delete permanently
          </Button>
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
