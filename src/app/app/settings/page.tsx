"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import useSWR from "swr";
import { useMe } from "@/components/app/providers";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Chip, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import type { Profile } from "@/lib/client/types";
import { DAILY_TARGETS, GOALS, INTERESTS, LANGUAGES, LEVEL_LABELS, LEVELS } from "@/lib/languages";
import { nexconn } from "@/lib/nexconn/client";

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
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-10">
      <PageHeader title="Settings" description="Your profile, languages and coaching preferences." />
      <form onSubmit={save} className="mt-6 flex flex-col gap-8">
        <section className="flex items-center gap-4">
          <Avatar name={me.name} src={me.avatarUrl} size={72} />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Upload profile photo"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <Button variant="secondary" size="sm" icon={<Camera size={15} />} loading={uploading} onClick={() => fileRef.current?.click()}>
              Change photo
            </Button>
            <p className="mt-1 text-xs text-ink-3">JPG, PNG or WebP, up to 2 MB.</p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </Field>
          <Field label="Email" htmlFor="email" hint="Used to sign in. Not shown to others.">
            <Input id="email" value={me.email} disabled />
          </Field>
          <div className="sm:col-span-2">
            <Field label="About you" htmlFor="bio">
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} />
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-xl font-semibold text-ink">Languages</h2>
          <div>
            <p className="text-sm font-semibold text-ink">Native (up to 3)</p>
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
                    {l} · {LEVEL_LABELS[l]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-xl font-semibold text-ink">Interests and goals</h2>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <Chip key={i} selected={interests.includes(i)} onToggle={() => toggle(interests, setInterests, i, 10)}>
                {i}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip key={g} selected={goals.includes(g)} onToggle={() => toggle(goals, setGoals, g, 5)}>
                {g}
              </Chip>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-xl font-semibold text-ink">Practice and coaching</h2>
          <Field label="Daily goal" htmlFor="daily">
            <Select id="daily" value={daily} onChange={(e) => setDaily(Number(e.target.value))}>
              {DAILY_TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}: {t.value} practice points
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-start gap-3 rounded-md border border-line bg-surface p-3.5">
            <input type="checkbox" checked={autoCorrect} onChange={(e) => setAutoCorrect(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
            <span>
              <span className="block font-semibold text-ink">Coach notes after I send</span>
              <span className="text-sm text-ink-2">
                The coach attaches a quiet correction to your messages in the language you&apos;re learning. Your partner can see it too. Check before
                sending always works.
              </span>
            </span>
          </label>
        </section>

        <FormError message={error} />
        <div>
          <Button type="submit" size="lg" loading={saving}>
            Save changes
          </Button>
        </div>
      </form>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Blocked people</h2>
        {!blocked || blocked.blocked.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">You haven&apos;t blocked anyone.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {blocked.blocked.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2">
                <Avatar name={p.name} src={p.avatarUrl} size={32} />
                <span className="flex-1 text-sm font-semibold text-ink">{p.name}</span>
                <Button size="sm" variant="secondary" onClick={() => unblock(p)}>
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Delete account</h2>
        <p className="mt-1 text-sm text-ink-2">Removes your profile, vocabulary, mistake log and partnerships from LinguaChat.</p>
        <Button variant="secondary" className="mt-3" onClick={() => setDeleteOpen(true)}>
          Delete my account
        </Button>
      </section>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?">
        <p className="text-ink">This permanently deletes your LinguaChat data. Type DELETE to confirm.</p>
        <Input className="mt-3" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Type DELETE to confirm" />
        <div className="mt-4 flex gap-3">
          <Button disabled={confirmText !== "DELETE"} onClick={deleteAccount}>
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
