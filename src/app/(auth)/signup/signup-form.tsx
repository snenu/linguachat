"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { api, ApiError } from "@/lib/client/api";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!age) return setError("Confirm that you are 16 or older to continue.");
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    setLoading(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await api<{ next: string }>("/api/auth/signup", {
        body: { name, email, password, ageConfirmed: true, timezone },
      });
      router.replace(res.next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your account. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-3xl font-semibold text-ink">Create your account</h1>
      <p className="mt-2 text-ink-2">Two minutes to set up, then you can start chatting.</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5" noValidate>
        <FormError message={error} />
        <Field label="Your name" htmlFor="name" hint="Shown to your partners. A first name is fine.">
          <Input id="name" name="name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </Field>
        <label className="flex items-start gap-3 rounded-md border border-line bg-surface p-3.5 text-sm text-ink">
          <input
            type="checkbox"
            name="age"
            checked={age}
            onChange={(e) => setAge(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          />
          <span>I am 16 years old or older. LinguaChat connects you with people you don&apos;t know, so it isn&apos;t for children.</span>
        </label>
        <Button type="submit" size="lg" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
