/* eslint-disable @next/next/no-img-element */
import { Bot } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 40,
  online,
  bot = false,
}: {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
  bot?: boolean;
}) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" width={size} height={size} className="h-full w-full rounded-full border border-line object-cover" />
      ) : (
        <span
          aria-hidden="true"
          className={`flex h-full w-full items-center justify-center rounded-full border font-semibold ${
            bot ? "border-accent/40 bg-accent-wash text-accent-ink" : "border-line bg-wash text-ink"
          }`}
          style={{ fontSize: Math.max(11, size * 0.36) }}
        >
          {bot ? <Bot size={size * 0.5} /> : initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={`absolute -right-0.5 -bottom-0.5 rounded-full border-2 border-surface ${online ? "bg-accent" : "bg-line-strong"}`}
          style={{ width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28) }}
          aria-label={online ? "Online now" : "Offline"}
          role="img"
        />
      )}
    </span>
  );
}
