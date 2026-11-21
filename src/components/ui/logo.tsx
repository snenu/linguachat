import Link from "next/link";

/** The proofreader's caret: the mark editors use to insert a missing word. */
export function CaretMark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--ink)" />
      <path d="M6.5 16.5 12 7l5.5 9.5" fill="none" stroke="var(--marker)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-md text-ink" aria-label="LinguaChat home">
      <CaretMark />
      {!compact && <span className="font-serif text-lg font-semibold tracking-tight">LinguaChat</span>}
    </Link>
  );
}
