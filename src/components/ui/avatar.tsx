/* eslint-disable @next/next/no-img-element */
import { Bot } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Each person keeps the same stamp color: soft background + readable ink, picked from the name. */
const STAMPS = [
  ["#E8ECFB", "#1B2F9E"],
  ["#FDEEDB", "#8A4B06"],
  ["#FCE6E9", "#A3192C"],
  ["#DFF3EA", "#0D6B48"],
  ["#EEE6FA", "#5B2B9E"],
  ["#E2F1F8", "#0F5C80"],
];

function stamp(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return STAMPS[h % STAMPS.length];
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
  const [bg, fg] = stamp(name);
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" width={size} height={size} className="h-full w-full rounded-full object-cover ring-1 ring-line" />
      ) : (
        <span
          aria-hidden="true"
          className={`flex h-full w-full items-center justify-center rounded-full font-bold tracking-tight ${bot ? "bg-accent text-white" : ""}`}
          style={{ fontSize: Math.max(11, size * 0.36), ...(bot ? {} : { background: bg, color: fg }) }}
        >
          {bot ? <Bot size={size * 0.52} /> : initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={`absolute -right-0.5 -bottom-0.5 rounded-full border-2 border-surface ${online ? "live-ring bg-mint" : "bg-line-strong"}`}
          style={{ width: Math.max(10, size * 0.28), height: Math.max(10, size * 0.28) }}
          aria-label={online ? "Online now" : "Offline"}
          role="img"
        />
      )}
    </span>
  );
}
