"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat, useNcEvents } from "@/components/app/providers";
import { nexconn } from "@/lib/nexconn/client";
import { channelKey, type ChannelRef, type ChatMessage } from "@/lib/nexconn/model";
import { MSG } from "@/lib/nexconn/types";

type History = ReturnType<ReturnType<typeof nexconn>["createHistory"]>;

function sortMessages(list: ChatMessage[]) {
  return [...list].sort((a, b) => a.sentTime - b.sentTime);
}

/**
 * State for one conversation: paged history, live messages (deduped by id), metadata updates,
 * typing, read receipts, stream text and optimistic sends with retry.
 */
export function useThread(channel: ChannelRef) {
  const key = channelKey(channel);
  const { state } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [streams, setStreams] = useState<Record<string, string>>({});
  const historyRef = useRef<History | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tmpSeq = useRef(0);
  const visibleRef = useRef(true);

  const upsert = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const byKey = new Map(prev.map((m) => [m.id ?? m.key, m]));
      for (const m of incoming) {
        const id = m.id ?? m.key;
        const existing = byKey.get(id);
        byKey.set(id, existing ? { ...existing, ...m, metadata: { ...existing.metadata, ...m.metadata }, read: existing.read || m.read } : m);
      }
      return sortMessages([...byKey.values()]);
    });
  }, []);

  const markRead = useCallback(
    (list: ChatMessage[]) => {
      if (!visibleRef.current) return;
      const ids = list.filter((m) => !m.outgoing && m.id).map((m) => m.id!);
      void nexconn().markRead(channel, ids);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  // Initial load (and reload after reconnect).
  const loadLatest = useCallback(async () => {
    try {
      const history = nexconn().createHistory(channel, 30);
      historyRef.current = history;
      const page = await history.next();
      upsert(page);
      setHasMore(history.hasMore() && page.length > 0);
      setError(null);
      markRead(page);
      const mine = page.filter((m) => m.outgoing && m.id).map((m) => m.id!);
      const read = await nexconn().readState(channel, mine);
      if (read.length) setReadIds((s) => new Set([...s, ...read]));
      // Ask for any stream messages that may still be in progress.
      page.filter((m) => m.type === MSG.stream && !(m.content as { isCompleted?: boolean }).isCompleted && m.id).forEach((m) => void nexconn().requestStream(m.id!));
    } catch {
      setError("Couldn't load messages. Check your connection.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, upsert, markRead]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setReadIds(new Set());
    setStreams({});
    historyRef.current = null;
  }, [key]);

  useEffect(() => {
    if (state === "connected") void loadLatest();
  }, [state, loadLatest]);

  useEffect(() => {
    const onVis = () => {
      visibleRef.current = document.visibilityState === "visible";
      if (visibleRef.current) setMessages((m) => (markRead(m), m));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [markRead]);

  const loadOlder = useCallback(async () => {
    const history = historyRef.current;
    if (!history || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const page = await history.next();
      upsert(page);
      setHasMore(history.hasMore() && page.length > 0);
    } catch {
      setError("Couldn't load earlier messages.");
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder, upsert]);

  useNcEvents((e) => {
    switch (e.type) {
      case "messages": {
        const mine = e.messages.filter((m) => channelKey(m.channel) === key);
        if (!mine.length) return;
        upsert(mine);
        markRead(mine);
        if (mine.some((m) => !m.outgoing)) setTyping([]);
        mine.filter((m) => m.type === MSG.stream && m.id).forEach((m) => void nexconn().requestStream(m.id!));
        break;
      }
      case "updated":
        upsert(e.messages.filter((m) => channelKey(m.channel) === key));
        break;
      case "metadata":
        if (channelKey(e.channel) !== key) return;
        setMessages((prev) => prev.map((m) => (m.id === e.messageId ? { ...m, metadata: { ...m.metadata, ...e.metadata } } : m)));
        break;
      case "typing":
        if (channelKey(e.channel) !== key) return;
        setTyping(e.userIds);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping([]), 6000);
        break;
      case "receipts":
        setReadIds((s) => new Set([...s, ...e.messageIds]));
        break;
      case "stream":
        if (e.done) return;
        setStreams((s) => ({ ...s, [e.messageId]: e.text }));
        break;
      case "deleted":
        setMessages((prev) => prev.filter((m) => !m.id || !e.messageIds.includes(m.id)));
        break;
    }
  });

  /** Optimistically shows a message, sends it, then swaps in the server copy (or marks it failed). */
  const send = useCallback(
    async (draft: Pick<ChatMessage, "type" | "content">, deliver: () => Promise<ChatMessage>): Promise<ChatMessage | null> => {
      const tmpKey = `tmp-${Date.now()}-${++tmpSeq.current}`;
      const optimistic: ChatMessage = {
        key: tmpKey,
        id: null,
        channel,
        senderId: nexconn().userId ?? "",
        type: draft.type,
        content: draft.content,
        sentTime: Date.now() + 1,
        outgoing: true,
        metadata: {},
        state: "sending",
        read: false,
      };
      setMessages((prev) => sortMessages([...prev, optimistic]));
      try {
        const sent = await deliver();
        setMessages((prev) => {
          const without = prev.filter((m) => m.key !== tmpKey && m.id !== sent.id);
          return sortMessages([...without, { ...sent, key: sent.id ?? tmpKey }]);
        });
        return sent;
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) => (m.key === tmpKey ? { ...m, state: "failed", error: err instanceof Error ? err.message : "Not sent" } : m)),
        );
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const discard = useCallback((tmpKey: string) => setMessages((prev) => prev.filter((m) => m.key !== tmpKey)), []);

  const lastIncomingText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m.outgoing && (m.type === MSG.text || m.type === MSG.reference || m.type === MSG.stream)) {
        return (streamsText(m, streams) ?? "").slice(0, 400);
      }
    }
    return "";
  }, [messages, streams]);

  return { messages, loading, loadingOlder, hasMore, loadOlder, error, typing, readIds, streams, send, discard, lastIncomingText, upsert };
}

export function streamsText(m: ChatMessage, streams: Record<string, string>): string {
  const c = m.content as { text?: string; content?: string };
  if (m.type === MSG.stream) return (m.id && streams[m.id]) || c.content || "";
  return c.text ?? "";
}
