"use client";

import { ArrowDown, Lightbulb, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useChat, useMe, usePeople } from "@/components/app/providers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import { guessLang } from "@/lib/client/speech";
import type { WordInfo } from "@/lib/client/types";
import { nexconn } from "@/lib/nexconn/client";
import { previewText, type ChannelRef, type ChatMessage } from "@/lib/nexconn/model";
import { MSG, type CorrectionCardContent, type VocabCardContent } from "@/lib/nexconn/types";
import { Composer } from "./composer";
import { CorrectionDialog, type CorrectionDraft } from "./correction-dialog";
import { MessageItem } from "./message-item";
import { streamsText, useThread } from "./use-thread";
import { WordDialog } from "./word-dialog";

export type ThreadMode = "partner" | "tutor" | "room";

function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export function Thread({
  channel,
  mode,
  partner,
  tutorSessionId,
  botName,
  header,
  top,
  empty,
  composerExtra,
  onTurnSettled,
  placeholder,
}: {
  channel: ChannelRef;
  mode: ThreadMode;
  partner?: { id: string; name: string; nexconnId: string } | null;
  tutorSessionId?: string | null;
  botName?: string;
  header: ReactNode;
  top?: ReactNode;
  empty?: ReactNode;
  composerExtra?: ReactNode;
  onTurnSettled?: () => void;
  placeholder?: string;
}) {
  const { me } = useMe();
  const { state } = useChat();
  const toast = useToast();
  const t = useThread(channel);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [word, setWord] = useState<{ word: string; sentence: string } | null>(null);
  const [correcting, setCorrecting] = useState<{ m: ChatMessage; text: string } | null>(null);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [tutorThinking, setTutorThinking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const prevHeight = useRef(0);
  const prevCount = useRef(0);
  const nearBottom = useRef(true);
  const [awayFromBottom, setAwayFromBottom] = useState(false);

  const senderIds = useMemo(() => [...new Set(t.messages.map((m) => m.senderId))], [t.messages]);
  const people = usePeople(senderIds);
  const nameOf = useCallback(
    (id: string) => {
      if (id === me.nexconnId) return me.name;
      if (partner && id === partner.nexconnId) return partner.name;
      return people.get(id)?.name ?? (mode === "tutor" ? botName ?? "Tutor" : "Learner");
    },
    [me, partner, people, mode, botName],
  );

  // Scroll: stick to bottom for new messages, keep position when older ones load above.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const grewAtTop = t.messages.length > prevCount.current && prevHeight.current && !nearBottom.current && t.loadingOlder === false;
    if (nearBottom.current || prevCount.current === 0) el.scrollTop = el.scrollHeight;
    else if (grewAtTop) el.scrollTop = el.scrollHeight - prevHeight.current + el.scrollTop;
    prevHeight.current = el.scrollHeight;
    prevCount.current = t.messages.length;
  }, [t.messages, t.streams, t.loadingOlder, tutorThinking, t.typing]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottom.current = distance < 120;
    setAwayFromBottom(distance > 400);
    prevHeight.current = el.scrollHeight;
    if (el.scrollTop < 80 && t.hasMore && !t.loadingOlder) void t.loadOlder();
  };

  // Stop the "tutor is thinking" state once a reply from the bot starts arriving.
  useEffect(() => {
    if (!tutorThinking) return;
    const last = t.messages[t.messages.length - 1];
    if (last && !last.outgoing && last.type === MSG.stream) setTutorThinking(false);
  }, [t.messages, tutorThinking]);

  const disabled = state !== "connected" || (mode === "tutor" && !tutorSessionId);

  const afterText = useCallback(
    async (sent: ChatMessage, text: string) => {
      if (!sent.id) return;
      if (mode === "tutor") {
        if (!tutorSessionId) return;
        setTutorThinking(true);
        try {
          const res = await api<{ reply?: { messageId: string | null } }>("/api/tutor/turn", { body: { sessionId: tutorSessionId, text, messageId: sent.id } });
          if (res.reply?.messageId && !t.messages.some((m) => m.id === res.reply!.messageId)) void nexconn().fetchById(channel, res.reply.messageId);
        } catch (err) {
          toast(errorMessage(err), "error");
        } finally {
          setTutorThinking(false);
          onTurnSettled?.();
        }
        return;
      }
      setCheckingIds((s) => new Set(s).add(sent.id!));
      try {
        await api("/api/ai/annotate", {
          body: { channelType: channel.kind, channelId: channel.id, messageId: sent.id, text, previous: t.lastIncomingText || undefined },
        });
      } catch {
        // Coaching is best-effort; the message itself was delivered.
      } finally {
        setCheckingIds((s) => {
          const n = new Set(s);
          n.delete(sent.id!);
          return n;
        });
      }
    },
    [mode, tutorSessionId, channel, t.lastIncomingText, toast, onTurnSettled],
  );

  const sendText = useCallback(
    async (text: string, reply: ChatMessage | null = replyTo) => {
      setReplyTo(null);
      const snippet = reply ? (previewText({ ...reply, content: { ...reply.content, text: streamsText(reply, t.streams) } }) || "").slice(0, 160) : "";
      const content = reply ? { text, extra: JSON.stringify({ q: snippet }) } : { text };
      const sent = await t.send({ type: reply ? MSG.reference : MSG.text, content }, () =>
        nexconn().sendText(channel, text, reply ? { replyTo: reply, replySnippet: snippet } : undefined),
      );
      nearBottom.current = true;
      if (sent) void afterText(sent, text);
    },
    [replyTo, t, channel, afterText],
  );

  // Recordings are kept until delivered so a failed upload can be retried without re-recording.
  const voiceFiles = useRef(new Map<string, { file: File; duration: number }>());
  const sendVoice = useCallback(
    async (file: File, duration: number) => {
      const localId = `v${Date.now()}`;
      voiceFiles.current.set(localId, { file, duration });
      const deliver = async () => {
        for (let attempt = 0; ; attempt++) {
          try {
            return await nexconn().sendVoice(channel, file, duration);
          } catch (err) {
            if (attempt >= 2) throw err;
            await nexconn().waitConnected(20_000);
          }
        }
      };
      const sent = await t.send({ type: MSG.hdVoice, content: { duration: Math.round(duration), localId } }, deliver);
      if (sent) voiceFiles.current.delete(localId);
      nearBottom.current = true;
      const url = (sent?.content as { remoteUrl?: string } | undefined)?.remoteUrl;
      if (sent?.id && url) {
        api("/api/ai/voice", { body: { channelType: channel.kind, channelId: channel.id, messageId: sent.id, remoteUrl: url, own: true } }).catch((err) =>
          toast(errorMessage(err), "error"),
        );
      }
    },
    [t, channel, toast],
  );

  const retry = useCallback(
    (m: ChatMessage) => {
      t.discard(m.key);
      const c = m.content as { text?: string };
      if (m.type === MSG.text || m.type === MSG.reference) void sendText(c.text ?? "", null);
      else if (m.type === MSG.correction || m.type === MSG.vocabCard) {
        void t.send({ type: m.type, content: m.content }, () => nexconn().sendCustom(channel, m.type, m.content));
      } else if (m.type === MSG.hdVoice) {
        const kept = voiceFiles.current.get((m.content as { localId?: string }).localId ?? "");
        if (kept) {
          voiceFiles.current.delete((m.content as { localId?: string }).localId ?? "");
          void sendVoice(kept.file, kept.duration);
        } else toast("Record the voice message again to resend it.", "info");
      }
    },
    [t, sendText, sendVoice, channel, toast],
  );

  async function sendCorrection(d: CorrectionDraft) {
    if (!correcting || !partner) return;
    const content: CorrectionCardContent = {
      original: d.original,
      corrected: d.corrected,
      note: d.note,
      language: partner && me.nativeLanguages[0] ? me.nativeLanguages[0] : "en",
      targetMessageId: correcting.m.id ?? undefined,
    };
    const sent = await t.send({ type: MSG.correction, content: content as unknown as Record<string, unknown> }, () =>
      nexconn().sendCustom(channel, MSG.correction, content),
    );
    if (!sent) throw new Error("The correction card couldn't be sent. Try again.");
    // Saved to the partner's mistake log in the background; the card itself is already delivered.
    void api("/api/corrections", {
      body: { partnerUserId: partner.id, original: d.original, corrected: d.corrected, note: d.note, category: d.category, messageId: correcting.m.id ?? undefined },
    }).catch(() => undefined);
    toast("Correction sent");
  }

  async function shareWord(info: WordInfo) {
    const content: VocabCardContent = { term: info.term, meaning: info.meaning, example: info.example, reading: info.reading, language: info.language };
    await t.send({ type: MSG.vocabCard, content: content as unknown as Record<string, unknown> }, () => nexconn().sendCustom(channel, MSG.vocabCard, content));
  }

  async function saveCard(c: VocabCardContent) {
    try {
      await api("/api/vocab", { body: { term: c.term, meaning: c.meaning, example: c.example, reading: c.reading, language: c.language, source: "chat" } });
      toast(`"${c.term}" saved to your flashcards`);
    } catch (err) {
      toast(errorMessage(err), "info");
    }
  }

  async function transcribe(m: ChatMessage) {
    const url = (m.content as { remoteUrl?: string }).remoteUrl;
    if (!m.id || !url) return;
    try {
      await api("/api/ai/voice", { body: { channelType: channel.kind, channelId: channel.id, messageId: m.id, remoteUrl: url, own: m.outgoing } });
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  const lastReadOutgoing = useMemo(() => {
    for (let i = t.messages.length - 1; i >= 0; i--) {
      const m = t.messages[i];
      if (m.outgoing && m.id && t.readIds.has(m.id)) return m.id;
    }
    return null;
  }, [t.messages, t.readIds]);

  const typingName = t.typing.length ? nameOf(t.typing[0]) : null;

  const jumpToLatest = () => {
    const el = scroller.current;
    if (!el) return;
    nearBottom.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };
  const source = mode === "tutor" ? "tutor" : mode === "room" ? "room" : "chat";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scroller} onScroll={onScroll} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-6 sm:px-6" aria-live="polite" aria-relevant="additions">
          <div className="mx-auto flex max-w-3xl flex-col">
            {top}
            {t.hasMore && (
              <div className="flex justify-center py-2">
                <Button size="sm" variant="secondary" loading={t.loadingOlder} onClick={() => void t.loadOlder()}>
                  Load earlier messages
                </Button>
              </div>
            )}
            {t.loading ? (
              <div className="flex flex-col gap-4 py-6" role="status">
                <div className="flex items-end gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-12 w-[55%] rounded-2xl" />
                </div>
                <Skeleton className="h-10 w-[40%] self-end rounded-2xl" />
                <div className="flex items-end gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-16 w-[62%] rounded-2xl" />
                </div>
                <Skeleton className="h-10 w-[48%] self-end rounded-2xl" />
                <p className="text-center text-xs text-ink-3">{state === "connected" ? "Loading messages" : "Connecting to chat"}</p>
              </div>
            ) : t.messages.length === 0 ? (
              (empty ?? (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-ink-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-wash text-accent">
                    <MessageCircle size={22} aria-hidden="true" />
                  </span>
                  <p>No messages yet. Say hello!</p>
                </div>
              ))
            ) : null}
            {t.error && <p className="my-2 rounded-lg border border-red/30 bg-red-wash px-3 py-2 text-sm text-ink">{t.error}</p>}
            {t.messages.map((m, i) => {
              const prev = t.messages[i - 1];
              const next = t.messages[i + 1];
              const newDay = !prev || new Date(prev.sentTime).toDateString() !== new Date(m.sentTime).toDateString();
              const showSender = newDay || !prev || prev.senderId !== m.senderId || m.sentTime - prev.sentTime > 5 * 60 * 1000 || prev.type === MSG.notice;
              const lastOfRun =
                !next ||
                next.senderId !== m.senderId ||
                next.sentTime - m.sentTime > 5 * 60 * 1000 ||
                next.type === MSG.notice ||
                new Date(next.sentTime).toDateString() !== new Date(m.sentTime).toDateString();
              const person = people.get(m.senderId);
              return (
                <div key={m.key}>
                  {newDay && (
                    <div className="my-5 flex justify-center">
                      <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-3 shadow-sm">{dayLabel(m.sentTime)}</span>
                    </div>
                  )}
                  <MessageItem
                    m={m}
                    text={streamsText(m, t.streams)}
                    senderName={nameOf(m.senderId)}
                    senderAvatar={person?.avatarUrl}
                    showSender={showSender}
                    showMeta={lastOfRun}
                    isBot={mode === "tutor" ? !m.outgoing : !!person?.bot}
                    read={m.id === lastReadOutgoing}
                    lang={guessLang(streamsText(m, t.streams), [me.targetLanguage, ...me.nativeLanguages])}
                    canCorrect={mode === "partner"}
                    coachChecking={!!m.id && checkingIds.has(m.id)}
                    actions={{
                      onReply: (msg) => setReplyTo(msg),
                      onWord: (w, sentence) => setWord({ word: w, sentence }),
                      onCorrect: mode === "partner" ? (msg, text) => setCorrecting({ m: msg, text }) : undefined,
                      onSaveCard: saveCard,
                      onUseHint: (text) => setDraft(text),
                      onRetry: retry,
                      onDiscard: (msg) => t.discard(msg.key),
                      onTranscribe: transcribe,
                    }}
                  />
                </div>
              );
            })}
            {(typingName || tutorThinking) && (
              <div className="animate-ink-in mt-4 flex items-center gap-2.5" role="status">
                <span className="flex h-9 items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 shadow-sm" aria-hidden="true">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-3" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-3 [animation-delay:150ms]" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-3 [animation-delay:300ms]" />
                </span>
                <span className="text-sm text-ink-2">{tutorThinking ? `${botName ?? "Tutor"} is writing…` : `${typingName} is typing…`}</span>
              </div>
            )}
          </div>
        </div>
        {awayFromBottom && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="animate-pop-in absolute right-4 bottom-4 flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-ink shadow-md transition-colors hover:border-accent hover:text-accent-ink sm:right-6"
          >
            <ArrowDown size={15} aria-hidden="true" /> Latest
          </button>
        )}
      </div>
      <Composer
        draft={draft}
        setDraft={setDraft}
        onSendText={(text) => void sendText(text)}
        onSendVoice={mode === "tutor" ? undefined : (f, d) => void sendVoice(f, d)}
        onTyping={mode === "partner" ? () => void nexconn().sendTyping(channel) : undefined}
        replyTo={replyTo}
        replyText={replyTo ? streamsText(replyTo, t.streams) || previewText(replyTo) : ""}
        onCancelReply={() => setReplyTo(null)}
        previous={t.lastIncomingText}
        disabled={disabled}
        placeholder={
          placeholder ?? (state !== "connected" ? "Connecting…" : mode === "tutor" && !tutorSessionId ? "Pick a scene to start" : "Write a message")
        }
        extra={composerExtra}
        allowVoice={mode !== "tutor"}
      />
      <WordDialog
        word={word?.word ?? null}
        sentence={word?.sentence ?? ""}
        source={source}
        onClose={() => setWord(null)}
        onShare={mode === "partner" ? shareWord : undefined}
      />
      {mode === "partner" && partner && (
        <CorrectionDialog original={correcting?.text ?? null} partnerName={partner.name} onClose={() => setCorrecting(null)} onSend={sendCorrection} />
      )}
    </div>
  );
}

export function HintButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <Button size="sm" variant="secondary" icon={<Lightbulb size={15} />} loading={loading} onClick={onClick}>
      Help me reply
    </Button>
  );
}
