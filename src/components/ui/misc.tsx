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
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong bg-surface/60 p-6 sm:p-8">
      {icon && <div className="text-ink-2">{icon}</div>}
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
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-1.5 py-0.5 text-xs text-ink">
      <span className="font-semibold">{l.name}</span>
      {level && (
        <span className="text-ink-2" title={LEVEL_LABELS[level as Level]}>
          {level}
        </span>
      )}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-display text-xl font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-ink-2">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface ${className}`}>{children}</div>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-sm border border-line bg-wash px-1 text-xs text-ink-2">{children}</kbd>;
}
