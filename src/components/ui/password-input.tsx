"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "./form";

/** Password field with a show/hide toggle (the toggle's name stays "Show"/"Hide" so the field keeps its label). */
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className="pr-20" />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        className="absolute top-1/2 right-1.5 flex h-8 -translate-y-1/2 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-wash hover:text-ink"
      >
        {shown ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
