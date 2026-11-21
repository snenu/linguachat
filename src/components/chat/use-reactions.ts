"use client";

import { useCallback, useEffect, useState } from "react";
import { useChat, useNcEvents } from "@/components/app/providers";
import { useToast } from "@/components/ui/toast";
import { nexconn } from "@/lib/nexconn/client";
import { channelKey, type ChannelRef, type ChatMessage, type Reaction } from "@/lib/nexconn/model";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "🙏"] as const;

function apply(list: Reaction[], reactionId: string, total: number, mine: boolean | undefined): Reaction[] {
  const rest = list.filter((r) => r.id !== reactionId);
  if (total <= 0) return rest;
  const prev = list.find((r) => r.id === reactionId);
  return [...rest, { id: reactionId, count: total, mine: mine ?? prev?.mine ?? false }];
}

/**
 * Nexconn message reactions for one conversation: summaries for messages that have any,
 * live changes from other people (onMessageReactionChanged) and optimistic toggles.
 */
export function useReactions(channel: ChannelRef, messages: ChatMessage[]) {
  const key = channelKey(channel);
  const { state, myId } = useChat();
  const toast = useToast();
  const [byMessage, setByMessage] = useState<Record<string, Reaction[]>>({});

  const withReactions = messages.filter((m) => m.id && m.hasReactions).map((m) => m.id!);
  const idsKey = withReactions.join(",");

  useEffect(() => {
    if (state !== "connected" || !idsKey) return;
    let live = true;
    void nexconn()
      .reactionSummaries(channel, idsKey.split(","))
      .then((found) => {
        if (live) setByMessage((prev) => ({ ...prev, ...found }));
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, key, state]);

  useNcEvents((e) => {
    if (e.type !== "reactions") return;
    const mineFor = (userIds: string[], op: string) => (userIds.includes(myId) ? op === "added" : undefined);
    setByMessage((prev) => {
      let next = prev;
      for (const c of e.changes) {
        if (channelKey(c.channel) !== key) continue;
        const list = next[c.messageId] ?? [];
        const updated = c.op === "cleared" ? [] : apply(list, c.reactionId, c.total, mineFor(c.userIds, c.op));
        next = { ...next, [c.messageId]: updated };
      }
      return next;
    });
  });

  const toggle = useCallback(
    async (messageId: string, reactionId: string) => {
      const list = byMessage[messageId] ?? [];
      const current = list.find((r) => r.id === reactionId);
      const add = !current?.mine;
      const total = (current?.count ?? 0) + (add ? 1 : -1);
      setByMessage((prev) => ({ ...prev, [messageId]: apply(prev[messageId] ?? [], reactionId, total, add) }));
      try {
        await nexconn().react(messageId, reactionId, add);
      } catch (err) {
        setByMessage((prev) => ({ ...prev, [messageId]: list }));
        toast(err instanceof Error ? err.message : "Reaction not saved", "error");
      }
    },
    [byMessage, toast],
  );

  return { reactions: byMessage, toggle };
}
