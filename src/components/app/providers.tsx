"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import useSWR, { SWRConfig, useSWRConfig } from "swr";
import type { Me } from "@/app/api/me/route";
import { ToastProvider } from "@/components/ui/toast";
import { api, fetcher } from "@/lib/client/api";
import { nexconn } from "@/lib/nexconn/client";
import type { ConnectionState, NcEvent } from "@/lib/nexconn/model";

// ---- Signed-in learner ------------------------------------------------------------------------

const MeContext = createContext<{ me: Me; refresh: () => Promise<unknown> } | null>(null);

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe outside provider");
  return ctx;
}

function MeProvider({ initial, children }: { initial: Me; children: ReactNode }) {
  const { data, mutate } = useSWR<Me>("/api/me", { fallbackData: initial, revalidateOnFocus: false });
  const value = useMemo(() => ({ me: data ?? initial, refresh: () => mutate() }), [data, initial, mutate]);
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

// ---- Nexconn connection -----------------------------------------------------------------------

interface ChatCtx {
  state: ConnectionState;
  totalUnread: number;
  myId: string;
  reconnect: () => void;
}
const ChatContext = createContext<ChatCtx | null>(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat outside provider");
  return ctx;
}

/** Subscribe to raw Nexconn events inside a component. */
export function useNcEvents(handler: (e: NcEvent) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => nexconn().on((e) => ref.current(e)), []);
}

function ChatProvider({ myId, children }: { myId: string; children: ReactNode }) {
  const [state, setState] = useState<ConnectionState>(nexconn().state);
  const [totalUnread, setTotalUnread] = useState(0);
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const off = nexconn().on((e) => {
      if (e.type === "status") setState(e.state);
      if (e.type === "unread") setTotalUnread(e.total);
      if (e.type === "signal") {
        if (e.kind === "requests_changed") void mutate("/api/requests");
        if (e.kind === "partners_changed") {
          void mutate("/api/requests");
          void mutate("/api/partners/mine");
          void mutate((key) => typeof key === "string" && key.startsWith("/api/partners"));
        }
      }
    });
    nexconn()
      .start()
      .catch(() => setState("error"));
    return off;
  }, [mutate]);

  // Last-active heartbeat (fallback "active recently" when live presence is unavailable).
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") void api("/api/me/heartbeat", { method: "POST" }).catch(() => undefined);
    };
    beat();
    const t = setInterval(beat, 60_000);
    return () => clearInterval(t);
  }, []);

  const reconnect = useCallback(() => void nexconn().reconnect().catch(() => undefined), []);
  const value = useMemo(() => ({ state, totalUnread, myId, reconnect }), [state, totalUnread, myId, reconnect]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// ---- Presence (Nexconn online-status subscription) -------------------------------------------

export function usePresence(nexconnIds: (string | null | undefined)[]) {
  const ids = useMemo(() => [...new Set(nexconnIds.filter((x): x is string => !!x))].sort(), [nexconnIds]);
  const idsKey = ids.join(",");
  const [online, setOnline] = useState<Record<string, boolean>>(() => nexconn().getPresence());
  const { state } = useChat();
  useEffect(() => {
    if (state !== "connected" || !idsKey) return;
    void nexconn().watchPresence(idsKey.split(","));
  }, [idsKey, state]);
  useNcEvents((e) => {
    if (e.type === "presence") setOnline((prev) => ({ ...prev, ...e.online }));
  });
  return online;
}

// ---- People directory (Nexconn id -> name/avatar) --------------------------------------------

export interface Person {
  nexconnId: string;
  id: string | null;
  name: string;
  avatarUrl: string | null;
  nativeLanguages: string[];
  targetLanguage: string | null;
  blocked: boolean;
  bot: boolean;
}

const peopleCache = new Map<string, Person>();
const pending = new Set<string>();
const waiters = new Set<() => void>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function requestPeople(ids: string[]) {
  const missing = ids.filter((id) => id && !peopleCache.has(id) && !pending.has(id));
  if (missing.length === 0) return;
  missing.forEach((id) => pending.add(id));
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    const batch = [...pending];
    try {
      const { people } = await api<{ people: Person[] }>("/api/users/lookup", { body: { ids: batch.slice(0, 200) } });
      people.forEach((p) => peopleCache.set(p.nexconnId, p));
    } catch {
      // leave uncached; a later render retries
    } finally {
      batch.forEach((id) => pending.delete(id));
      waiters.forEach((w) => w());
    }
  }, 30);
}

export function usePeople(nexconnIds: string[]): Map<string, Person> {
  const key = [...new Set(nexconnIds)].sort().join(",");
  const [version, force] = useState(0);
  useEffect(() => {
    const w = () => force((n) => n + 1);
    waiters.add(w);
    requestPeople(key ? key.split(",") : []);
    return () => {
      waiters.delete(w);
    };
  }, [key]);
  // A fresh snapshot per change so memoised consumers (names, avatars) recompute.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new Map(peopleCache), [version, key]);
}

// ---- Root -------------------------------------------------------------------------------------

export function AppProviders({ me, children }: { me: Me; children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: true, shouldRetryOnError: false }}>
      <ToastProvider>
        <MeProvider initial={me}>
          <ChatProvider myId={me.nexconnId}>{children}</ChatProvider>
        </MeProvider>
      </ToastProvider>
    </SWRConfig>
  );
}
