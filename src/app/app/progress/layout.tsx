"use client";

import { BookOpen, ChartNoAxesColumn, Layers, PenLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/progress", label: "Overview", icon: ChartNoAxesColumn },
  { href: "/app/progress/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/app/progress/review", label: "Flashcards", icon: Layers },
  { href: "/app/progress/mistakes", label: "Mistake log", icon: PenLine },
];

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Progress</h1>
          <p className="mt-1.5 text-ink-2">Your streak, the words you&apos;re keeping and what the coach has noticed.</p>
        </div>
        <nav
          aria-label="Progress sections"
          className="no-scrollbar -mx-4 flex w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:px-0"
        >
          <div className="flex shrink-0 rounded-full border border-line bg-surface p-1 shadow-sm">
            {TABS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-[background-color,color] ${
                    active ? "bg-ink text-white shadow-sm" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      <div key={pathname} className="animate-ink-in pt-7">
        {children}
      </div>
    </div>
  );
}
