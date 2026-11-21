import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-ink" role="alert">
          <span className="font-semibold">Fix: </span>
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-ink-3 transition-colors hover:border-ink-3 focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60";

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input {...rest} className={`${inputClass} h-11 ${className}`} />;
}

export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea {...rest} className={`${inputClass} min-h-24 py-2.5 ${className}`} />;
}

export function Select({ className = "", children, ...rest }: ComponentProps<"select">) {
  return (
    <select {...rest} className={`${inputClass} h-11 pr-8 ${className}`}>
      {children}
    </select>
  );
}

export function useFieldId() {
  return useId();
}

/** Toggle chip for multi-select lists (interests, goals, filters). */
export function Chip({
  selected,
  onToggle,
  children,
  disabled,
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={`inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors disabled:opacity-40 ${
        selected ? "border-ink bg-ink text-surface" : "border-line-strong bg-surface text-ink hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-md border border-ink/30 bg-marker-wash px-3 py-2.5 text-sm text-ink">
      {message}
    </div>
  );
}
