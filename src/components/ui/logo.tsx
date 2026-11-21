import Link from "next/link";
import { useId } from "react";

/*
  The mark: two speech bubbles, one for each tandem partner, overlapping where the
  conversation happens. Blue speaks, marigold answers, the overlap is ink.
  Paths live on a 48x48 grid; public icons are generated from the same shapes (scripts/icons.mjs).
*/
export const BUBBLE_A = "M11 5H23A8 8 0 0 1 31 13V18A8 8 0 0 1 23 26H11L3 32V13A8 8 0 0 1 11 5Z";
export const BUBBLE_B = "M25 17H37A8 8 0 0 1 45 25V44L37 38H25A8 8 0 0 1 17 30V25A8 8 0 0 1 25 17Z";

export function LogoMark({ size = 28, className = "", tile = false }: { size?: number; className?: string; tile?: boolean }) {
  const clip = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={className}>
      {tile && <rect width="48" height="48" rx="12" fill="var(--accent)" />}
      <g transform={tile ? "translate(4.8 4.8) scale(0.8)" : undefined}>
        <path d={BUBBLE_A} fill={tile ? "#fff" : "var(--accent)"} />
        <path d={BUBBLE_B} fill="var(--marker)" />
        <clipPath id={clip}>
          <path d={BUBBLE_A} />
        </clipPath>
        <path d={BUBBLE_B} fill="var(--ink)" clipPath={`url(#${clip})`} />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", compact = false, inverse = false }: { href?: string; compact?: boolean; inverse?: boolean }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 rounded-md ${inverse ? "text-white" : "text-ink"}`}
      aria-label="LinguaChat home"
    >
      <LogoMark size={30} className="transition-transform duration-300 ease-out group-hover:-rotate-6" />
      {!compact && <span className="font-display text-[1.3rem] font-bold tracking-[-0.035em]">LinguaChat</span>}
    </Link>
  );
}
