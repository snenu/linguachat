"use client";

import { ChartNoAxesColumn, GraduationCap, House, LogOut, MessagesSquare, Settings, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { api } from "@/lib/client/api";
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
    <span aria-label={`${n} ${label}`} className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-marker px-1.5 text-xs font-bold text-ink">
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
    <div role="status" className="flex items-center justify-center gap-3 border-b border-line bg-marker-wash px-4 py-2 text-sm text-ink">
      <span>{text}</span>
      {(state === "kicked" || state === "error") && (
        <button type="button" onClick={reconnect} className="font-semibold underline underline-offset-2">
          Reconnect here
        </button>
      )}
    </div>
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
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-surface">
        Skip to content
      </a>
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
        <div className="px-2">
          <Logo href="/app" />
        </div>
        <nav aria-label="Main" className="mt-8 flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href, exact) ? "page" : undefined}
              className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                active(href, exact) ? "bg-ink font-semibold text-surface" : "text-ink-2 hover:bg-wash hover:text-ink"
              }`}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
              {badgeFor(href)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
          <Link
            href="/app/settings"
            aria-current={active("/app/settings") ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-2 py-2 transition-colors ${active("/app/settings") ? "bg-wash" : "hover:bg-wash"}`}
          >
            <Avatar name={me.name} src={me.avatarUrl} size={34} online={state === "connected"} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{me.name}</span>
              <span className="block truncate text-xs text-ink-3">{state === "connected" ? "Online" : "Connecting…"}</span>
            </span>
            <Settings size={16} className="ml-auto text-ink-3" aria-label="Settings" />
          </Link>
          <button type="button" onClick={logout} className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-ink-2 hover:bg-wash hover:text-ink">
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
          <Logo href="/app" />
          <div className="flex items-center gap-1">
            <Link href="/app/rooms" aria-label="Practice rooms" className="rounded-md p-2 text-ink-2 hover:bg-wash">
              <Users size={20} />
            </Link>
            <Link href="/app/settings" aria-label="Settings" className="rounded-md p-1.5 hover:bg-wash">
              <Avatar name={me.name} src={me.avatarUrl} size={28} />
            </Link>
          </div>
        </header>
        <ConnectionBanner />
        <main id="main" className="flex min-h-0 flex-1 flex-col pb-16 lg:pb-0">
          {children}
        </main>
        {/* Mobile tabs */}
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-line bg-surface lg:hidden">
          {NAV.filter((n) => MOBILE.includes(n.href)).map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href, exact) ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[0.7rem] ${active(href, exact) ? "font-semibold text-ink" : "text-ink-3"}`}
            >
              <Icon size={20} aria-hidden="true" />
              {label === "AI tutor" ? "Tutor" : label}
              {href === "/app/chats" && totalUnread > 0 && <span className="absolute top-2 right-[30%] h-2.5 w-2.5 rounded-full bg-marker ring-2 ring-surface" />}
              {href === "/app/partners" && incoming > 0 && <span className="absolute top-2 right-[30%] h-2.5 w-2.5 rounded-full bg-marker ring-2 ring-surface" />}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
