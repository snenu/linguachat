"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { api, ApiError } from "@/lib/client/api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ next: string }>("/api/auth/login", { body: { email, password } });
      router.replace(res.next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign you in. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-serif text-3xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-2 text-ink-2">Sign in to continue your conversations.</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5" noValidate>
        <FormError message={error} />
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" size="lg" loading={loading}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-2">
        New to LinguaChat?{" "}
        <Link href="/signup" className="font-semibold text-accent-ink underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </div>
  );
}
