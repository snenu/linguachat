import type { ReactNode } from "react";
import { language, LEVEL_LABELS, type Level } from "@/lib/languages";

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="paper-grid flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong bg-surface/70 p-6 sm:p-8">
      {icon && <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent-wash text-accent">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {children && <div className="max-w-prose text-sm text-ink-2">{children}</div>}
      {action}
    </div>
  );
}

export function LangTag({ code, level }: { code: string | null | undefined; level?: string | null }) {
  const l = language(code);
  if (!l) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-ink">
      <span className="font-semibold">{l.name}</span>
      {level && (
        <span className="rounded-full bg-accent-wash px-1.5 font-semibold text-accent-ink" title={LEVEL_LABELS[level as Level]}>
          {level}
        </span>
      )}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-display text-xl font-bold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-ink-2">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface shadow-sm ${className}`}>{children}</div>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-sm border border-line-strong border-b-2 bg-surface px-1.5 text-xs font-semibold text-ink-2">{children}</kbd>;
}

/** Placeholder block shown while data loads. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}
