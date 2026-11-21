import { AlertCircle } from "lucide-react";
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
        <p className="flex items-center gap-1.5 text-sm text-red-ink" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-line-strong bg-surface px-3.5 text-base text-ink shadow-[0_1px_0_var(--line)] placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 hover:border-ink-3 focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60";

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
      className={`inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-[background-color,border-color,color,transform] duration-150 active:scale-95 disabled:opacity-40 ${
        selected ? "border-accent bg-accent text-white shadow-sm" : "border-line-strong bg-surface text-ink hover:border-accent hover:text-accent-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="animate-ink-in flex items-start gap-2.5 rounded-md border border-red/30 bg-red-wash px-3.5 py-3 text-sm text-ink">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-red" aria-hidden="true" />
      {message}
    </div>
  );
}
