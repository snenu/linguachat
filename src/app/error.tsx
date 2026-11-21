"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[70vh] flex-1 items-center justify-center px-4 py-16">
      <div className="animate-ink-in w-full max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-wash text-red" aria-hidden="true">
          <RotateCw size={24} />
        </span>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-[-0.03em] text-ink">This page didn&apos;t load</h1>
        <p className="mt-3 text-ink-2">
          Something went wrong on our side. Your messages are safe. Try again, or go back to your home.
        </p>
        {error.digest && <p className="mt-2 text-xs text-ink-3">Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} icon={<RotateCw size={15} />}>
            Try again
          </Button>
          <ButtonLink href="/app" variant="secondary">
            Go to your home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
