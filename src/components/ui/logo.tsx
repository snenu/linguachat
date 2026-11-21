import Link from "next/link";
import { useId } from "react";
import { BUBBLE_A, BUBBLE_B } from "@/lib/brand";

/** Blue speaks, marigold answers, the overlap is ink. */
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
