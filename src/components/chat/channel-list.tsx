"use client";

import { GraduationCap, Hash, MessagesSquare, Search, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useChat, useNcEvents, usePeople, usePresence } from "@/components/app/providers";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import type { BotInfo, Profile, RoomSummary } from "@/lib/client/types";
import { nexconn } from "@/lib/nexconn/client";
import { channelKey, previewText, type ChannelSummary } from "@/lib/nexconn/model";

interface Row {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  mine: boolean;
  unread: number;
  updatedAt: number;
  kind: "partner" | "tutor" | "room";
  avatarUrl?: string | null;
  nexconnId?: string;
}

function when(ts: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChannelList() {
  const pathname = usePathname();
  const { state } = useChat();
  const { data: mine } = useSWR<{ partners: Profile[]; tutor: BotInfo }>("/api/partners/mine");
  const { data: rooms } = useSWR<{ learning: RoomSummary[]; helping: RoomSummary[] }>("/api/rooms");
  const [channels, setChannels] = useState<ChannelSummary[] | null>(null);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    if (state !== "connected") return;
    try {
      setChannels(await nexconn().listChannels());
    } catch {
      setChannels((c) => c ?? []);
    }
  }, [state]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useNcEvents((e) => {
    if (e.type === "messages" || e.type === "unread") void refresh();
  });

  const directIds = useMemo(() => (channels ?? []).filter((c) => c.ref.kind === "direct").map((c) => c.ref.id), [channels]);
  const people = usePeople(directIds);
  const online = usePresence((mine?.partners ?? []).map((p) => p.nexconnId));

  const rows = useMemo<Row[]>(() => {
    const byKey = new Map((channels ?? []).map((c) => [channelKey(c.ref), c]));
    const out: Row[] = [];
    for (const p of mine?.partners ?? []) {
      const c = byKey.get(`direct:${p.nexconnId}`);
      out.push({
        key: p.nexconnId,
        href: `/app/chats/${p.nexconnId}`,
        title: p.name,
        subtitle: c?.latest ? previewText(c.latest) : "Say hello to your new partner",
        mine: !!c?.latest?.outgoing,
        unread: c?.unread ?? 0,
        updatedAt: c?.updatedAt ?? 0,
        kind: "partner",
        avatarUrl: p.avatarUrl,
        nexconnId: p.nexconnId,
      });
    }
    if (mine?.tutor) {
      const c = byKey.get(`direct:${mine.tutor.nexconnId}`);
      out.push({
        key: mine.tutor.nexconnId,
        href: "/app/tutor",
        title: mine.tutor.name,
        subtitle: c?.latest ? previewText(c.latest) : "Practise any time with role-play scenes",
        mine: !!c?.latest?.outgoing,
        unread: c?.unread ?? 0,
        updatedAt: c?.updatedAt ?? 0,
        kind: "tutor",
      });
    }
    const allRooms = [...(rooms?.learning ?? []), ...(rooms?.helping ?? [])].filter((r) => r.joined && r.groupId);
    for (const r of allRooms) {
      const c = byKey.get(`group:${r.groupId}`);
      out.push({
        key: r.id,
        href: `/app/rooms/${r.id}`,
        title: r.name,
        subtitle: c?.latest ? previewText(c.latest) : `${r.memberCount} members`,
        mine: !!c?.latest?.outgoing,
        unread: c?.unread ?? 0,
        updatedAt: c?.updatedAt ?? 0,
        kind: "room",
      });
    }
    // Former partners (blocked/unmatched) are left out on purpose; unknown direct channels are ignored.
    void people;
    return out.sort((a, b) => b.updatedAt - a.updatedAt || a.title.localeCompare(b.title));
  }, [channels, mine, rooms, people]);

  const q = query.trim().toLowerCase();
  const visible = q ? rows.filter((r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)) : rows;

  if (!mine || (state === "connected" && channels === null)) {
    return (
      <div className="flex flex-col gap-1 px-2 py-2" role="status" aria-label="Loading chats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2.5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-accent-wash text-accent">
          <UsersRound size={20} aria-hidden="true" />
        </span>
        <p className="font-display text-lg font-bold text-ink">No conversations yet</p>
        <p className="text-sm text-ink-2">Send a chat request to a native speaker. When they accept, your conversation appears here.</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <ButtonLink href="/app/partners" size="sm">
            Find a partner
          </ButtonLink>
          <ButtonLink href="/app/tutor" size="sm" variant="secondary">
            Practise with the tutor
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <nav aria-label="Conversations" className="flex flex-col">
      {rows.length > 3 && (
        <div className="sticky top-0 z-10 bg-surface px-3 pt-3 pb-2">
          <label className="flex h-10 items-center gap-2 rounded-full border border-line-strong bg-paper px-3.5 text-sm transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
            <Search size={15} className="shrink-0 text-ink-3" aria-hidden="true" />
            <span className="sr-only">Search conversations</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-3 focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-ink-3 hover:text-ink">
                <X size={14} />
              </button>
            )}
          </label>
        </div>
      )}
      <ul className="flex flex-col gap-0.5 px-2 py-2">
        {visible.map((r) => {
          const active = pathname === r.href;
          const isOnline = !!online[r.nexconnId ?? ""];
          return (
            <li key={r.key}>
              <Link
                href={r.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors ${active ? "bg-accent-wash" : "hover:bg-wash"}`}
              >
                {active && <span aria-hidden="true" className="absolute top-3 bottom-3 left-0 w-[3px] rounded-r-full bg-accent" />}
                {r.kind === "partner" ? (
                  <Avatar name={r.title} src={r.avatarUrl} size={44} online={isOnline} />
                ) : r.kind === "tutor" ? (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                    <GraduationCap size={20} aria-hidden="true" />
                  </span>
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-marker-wash text-ink">
                    <Hash size={19} aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-[0.95rem] ${r.unread ? "font-bold text-ink" : "font-semibold text-ink"}`}>{r.title}</span>
                    <span className={`shrink-0 text-xs ${r.unread ? "font-semibold text-accent-ink" : "text-ink-3"}`}>{when(r.updatedAt)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${r.unread ? "text-ink" : "text-ink-3"}`}>
                      {r.mine && <span className="text-ink-2">You: </span>}
                      {r.subtitle}
                    </span>
                    {r.unread > 0 && (
                      <span
                        aria-label={`${r.unread} unread`}
                        className="animate-pop-in inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marker px-1.5 text-xs font-bold text-ink"
                      >
                        {r.unread > 99 ? "99+" : r.unread}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">No conversations match “{query}”.</li>}
      </ul>
      <p className="mt-auto flex items-center gap-2 px-4 pt-2 pb-4 text-xs text-ink-3">
        <MessagesSquare size={13} aria-hidden="true" /> Tap a message to translate it or look up words.
      </p>
    </nav>
  );
}
