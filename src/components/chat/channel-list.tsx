"use client";

import { GraduationCap, Hash, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useChat, useMe, useNcEvents, usePeople, usePresence } from "@/components/app/providers";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { BotInfo, Profile, RoomSummary } from "@/lib/client/types";
import { nexconn } from "@/lib/nexconn/client";
import { channelKey, previewText, type ChannelSummary } from "@/lib/nexconn/model";

interface Row {
  key: string;
  href: string;
  title: string;
  subtitle: string;
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
  const { me } = useMe();
  const { data: mine } = useSWR<{ partners: Profile[]; tutor: BotInfo }>("/api/partners/mine");
  const { data: rooms } = useSWR<{ learning: RoomSummary[]; helping: RoomSummary[] }>("/api/rooms");
  const [channels, setChannels] = useState<ChannelSummary[] | null>(null);

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
    const partnerIds = new Set<string>();
    for (const p of mine?.partners ?? []) {
      partnerIds.add(p.nexconnId);
      const c = byKey.get(`direct:${p.nexconnId}`);
      out.push({
        key: p.nexconnId,
        href: `/app/chats/${p.nexconnId}`,
        title: p.name,
        subtitle: c?.latest ? previewText(c.latest) : "Say hello to your new partner",
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
        unread: c?.unread ?? 0,
        updatedAt: c?.updatedAt ?? 0,
        kind: "room",
      });
    }
    // Former partners (blocked/unmatched) are left out on purpose; unknown direct channels are ignored.
    void people;
    return out.sort((a, b) => b.updatedAt - a.updatedAt || a.title.localeCompare(b.title));
  }, [channels, mine, rooms, people]);

  if (!mine || (state === "connected" && channels === null)) {
    return (
      <div className="flex justify-center py-10 text-ink-2">
        <Spinner label="Loading chats" />
      </div>
    );
  }

  return (
    <nav aria-label="Conversations" className="flex flex-col">
      {rows.length === 0 ? (
        <div className="p-5 text-sm text-ink-2">
          <p>No conversations yet.</p>
          <ButtonLink href="/app/partners" size="sm" className="mt-3">
            Find a partner
          </ButtonLink>
        </div>
      ) : (
        rows.map((r) => {
          const active = pathname === r.href;
          return (
            <Link
              key={r.key}
              href={r.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 border-b border-line px-4 py-3 transition-colors ${active ? "bg-wash" : "hover:bg-wash/70"}`}
            >
              {r.kind === "partner" ? (
                <Avatar name={r.title} src={r.avatarUrl} size={42} online={!!online[r.nexconnId ?? ""]} />
              ) : (
                <span className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border ${r.kind === "tutor" ? "border-accent/40 bg-accent-wash text-accent-ink" : "border-line bg-paper text-ink"}`}>
                  {r.kind === "tutor" ? <GraduationCap size={19} /> : <Hash size={18} />}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${r.unread ? "font-bold text-ink" : "font-semibold text-ink"}`}>{r.title}</span>
                  <span className="shrink-0 text-xs text-ink-3">{when(r.updatedAt)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${r.unread ? "text-ink" : "text-ink-3"}`}>{r.subtitle}</span>
                  {r.unread > 0 && (
                    <span aria-label={`${r.unread} unread`} className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-marker px-1.5 text-xs font-bold text-ink">
                      {r.unread}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          );
        })
      )}
      {me && rows.length > 0 && (
        <p className="flex items-center gap-2 px-4 py-4 text-xs text-ink-3">
          <MessagesSquare size={13} aria-hidden="true" /> Tap a message to translate it or look up words.
        </p>
      )}
    </nav>
  );
}
