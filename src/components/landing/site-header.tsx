"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#coach", label: "AI coach" },
  { href: "#tutor", label: "Tutor and rooms" },
  { href: "#nexconn", label: "Built on Nexconn" },
  { href: "#faq", label: "FAQ" },
];

/** Sticky header that settles onto a frosted bar once the page scrolls. */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled ? "border-b border-line bg-paper/80 shadow-sm backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-sm text-ink-2 transition-colors hover:bg-surface hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Create account
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
