"use client";

import { ChartNoAxesColumn, Flame, GraduationCap, House, LogOut, MessagesSquare, Settings, Users, UsersRound, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { api } from "@/lib/client/api";
import type { Progress } from "@/lib/client/types";
import { languageName } from "@/lib/languages";
import { nexconn } from "@/lib/nexconn/client";
import { useChat, useMe } from "./providers";

const NAV = [
  { href: "/app", label: "Home", icon: House, exact: true },
  { href: "/app/partners", label: "Partners", icon: UsersRound },
  { href: "/app/chats", label: "Chats", icon: MessagesSquare },
  { href: "/app/tutor", label: "AI tutor", icon: GraduationCap },
  { href: "/app/rooms", label: "Rooms", icon: Users },
  { href: "/app/progress", label: "Progress", icon: ChartNoAxesColumn },
];

const MOBILE = ["/app", "/app/partners", "/app/chats", "/app/tutor", "/app/progress"];

function Badge({ n, label }: { n: number; label: string }) {
  if (n <= 0) return null;
  return (
    <span
      aria-label={`${n} ${label}`}
      className="animate-pop-in ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-marker px-1.5 text-xs font-bold text-ink"
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

function ConnectionBanner() {
  const { state, reconnect } = useChat();
  if (state === "connected" || state === "idle" || state === "connecting") return null;
  const text =
    state === "kicked"
      ? "You opened LinguaChat somewhere else, so chat paused here."
      : state === "error"
        ? "Chat couldn't connect. Messages will send once it reconnects."
        : "Reconnecting to chat…";
  return (
    <div role="status" className="animate-ink-in flex items-center justify-center gap-3 border-b border-marker/50 bg-marker-wash px-4 py-2 text-sm text-ink">
      <WifiOff size={15} aria-hidden="true" />
      <span>{text}</span>
      {(state === "kicked" || state === "error") && (
        <button type="button" onClick={reconnect} className="rounded-md bg-ink px-2.5 py-1 text-xs font-semibold text-white hover:bg-night">
          Reconnect here
        </button>
      )}
    </div>
  );
}

/** Today's goal and streak, always in view on desktop. */
function TodayCard() {
  const { me } = useMe();
  const { data } = useSWR<Progress>("/api/progress", { refreshInterval: 120_000 });
  if (!data) return <div className="skeleton h-[5.5rem] rounded-lg" aria-hidden="true" />;
  const pct = Math.min(100, Math.round((data.todayCount / Math.max(1, data.dailyTarget)) * 100));
  const met = pct >= 100;
  return (
    <Link
      href="/app/progress"
      className="block rounded-lg border border-line bg-paper p-3 transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm"
      aria-label={`${data.streak}-day streak. Today ${data.todayCount} of ${data.dailyTarget} in ${languageName(me.targetLanguage)}.`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <Flame size={16} className={data.streak ? "text-red" : "text-ink-3"} fill={data.streak ? "currentColor" : "none"} aria-hidden="true" />
          {data.streak} {data.streak === 1 ? "day" : "days"}
        </span>
        <span className="text-xs text-ink-3 tabular-nums">
          {data.todayCount}/{data.dailyTarget} today
        </span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-wash">
        <div className={`h-full rounded-full transition-[width] duration-700 ${met ? "bg-mint" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-ink-3">{met ? "Goal met. Nice work." : `${data.dailyTarget - data.todayCount} to go in ${languageName(me.targetLanguage)}`}</p>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me } = useMe();
  const { totalUnread, state } = useChat();
  const { data: requests } = useSWR<{ incoming: unknown[] }>("/api/requests", { refreshInterval: 60_000 });
  const incoming = requests?.incoming?.length ?? 0;

  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  const badgeFor = (href: string) =>
    href === "/app/chats" ? <Badge n={totalUnread} label="unread messages" /> : href === "/app/partners" ? <Badge n={incoming} label="chat requests" /> : null;

  async function logout() {
    await nexconn().disconnect();
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
        <div className="px-2.5">
          <Logo href="/app" />
        </div>
        <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const on = active(href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                  on ? "bg-accent-wash font-semibold text-accent-ink" : "text-ink-2 hover:bg-wash hover:text-ink"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-accent transition-transform duration-200 ${on ? "scale-y-100" : "scale-y-0"}`}
                />
                <Icon size={18} aria-hidden="true" className={on ? "text-accent" : "transition-transform group-hover:scale-110"} />
                {label}
                {badgeFor(href)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <TodayCard />
          <div className="flex flex-col gap-1 border-t border-line pt-3">
            <Link
              href="/app/settings"
              aria-current={active("/app/settings") ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-2 py-2 transition-colors ${active("/app/settings") ? "bg-wash" : "hover:bg-wash"}`}
            >
              <Avatar name={me.name} src={me.avatarUrl} size={36} online={state === "connected"} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{me.name}</span>
                <span className="block truncate text-xs text-ink-3">{state === "connected" ? "Online" : "Connecting…"}</span>
              </span>
              <Settings size={16} className="ml-auto text-ink-3" aria-label="Settings" />
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-ink-2 transition-colors hover:bg-wash hover:text-ink"
            >
              <LogOut size={16} aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur-md lg:hidden">
          <Logo href="/app" />
          <div className="flex items-center gap-1">
            <Link
              href="/app/rooms"
              aria-label="Practice rooms"
              aria-current={active("/app/rooms") ? "page" : undefined}
              className={`rounded-md p-2 ${active("/app/rooms") ? "bg-accent-wash text-accent" : "text-ink-2 hover:bg-wash"}`}
            >
              <Users size={20} />
            </Link>
            <Link href="/app/settings" aria-label="Settings" className="rounded-full p-1 hover:bg-wash">
              <Avatar name={me.name} src={me.avatarUrl} size={30} online={state === "connected"} />
            </Link>
          </div>
        </header>
        <ConnectionBanner />
        <main id="main" className="flex min-h-0 flex-1 flex-col pb-16 lg:pb-0">
          {children}
        </main>
        {/* Mobile tabs */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden"
        >
          {NAV.filter((n) => MOBILE.includes(n.href)).map(({ href, label, icon: Icon, exact }) => {
            const on = active(href, exact);
            const dot = (href === "/app/chats" && totalUnread > 0) || (href === "/app/partners" && incoming > 0);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 text-[0.7rem] ${on ? "font-semibold text-accent-ink" : "text-ink-3"}`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-accent-wash text-accent" : ""}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                {label === "AI tutor" ? "Tutor" : label}
                {dot && <span className="absolute top-1.5 right-[calc(50%-1.1rem)] h-2.5 w-2.5 rounded-full bg-marker ring-2 ring-surface" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
