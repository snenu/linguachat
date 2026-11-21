"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/progress", label: "Overview" },
  { href: "/app/progress/vocabulary", label: "Vocabulary" },
  { href: "/app/progress/review", label: "Flashcards" },
  { href: "/app/progress/mistakes", label: "Mistake log" },
];

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <h1 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">Progress</h1>
      <nav aria-label="Progress sections" className="scroll-thin mt-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm ${active ? "border-ink font-semibold text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="pt-6">{children}</div>
    </div>
  );
}
