"use client";

import type * as NC from "@nexconn/chat";
import { MSG } from "./types";
import { channelKey, type ChannelRef, type ChannelSummary, type ChatMessage, type ConnectionState, type NcEvent, type Reaction, type ReactionChange } from "./model";

type Sdk = typeof NC;
type RawMessage = NC.Message<Record<string, unknown>>;
type Listener = (e: NcEvent) => void;

interface TokenResponse {
  appKey: string;
  userId: string;
  token: string;
}

const HANDLER_ID = "lgc";

/**
 * Single Nexconn Chat SDK connection for the signed-in learner.
 * - initialize once, register custom message types and handlers before connect
 * - connect with a server-issued token; on 31004 (token invalid) fetch a fresh token and retry
 * - surfaces SDK events as plain NcEvents to React components
 */
class NexconnClient {
  private sdk: Sdk | null = null;
  private listeners = new Set<Listener>();
  private raw = new Map<string, RawMessage>();
  private startPromise: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 3000;
  private subscribed = new Set<string>();
  private presence: Record<string, boolean> = {};
  private localSeq = 0;
  state: ConnectionState = "idle";
  userId: string | null = null;

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(e: NcEvent) {
    for (const l of this.listeners) {
      try {
        l(e);
      } catch (err) {
        console.error("[nexconn] listener error", err);
      }
    }
  }

  private setState(state: ConnectionState, code?: number) {
    this.state = state;
    this.emit({ type: "status", state, code });
  }

  getPresence(): Record<string, boolean> {
    return { ...this.presence };
  }

  start(): Promise<void> {
    if (!this.startPromise) {
      this.startPromise = this.boot().catch((err) => {
        this.startPromise = null;
        throw err;
      });
    }
    return this.startPromise;
  }

  private async token(refresh = false): Promise<TokenResponse> {
    const res = await fetch(`/api/nexconn/token${refresh ? "?refresh=1" : ""}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`token ${res.status}`);
    return res.json();
  }

  private async boot() {
    this.setState("connecting");
    const sdk = await import("@nexconn/chat");
    this.sdk = sdk;
    const creds = await this.token();
    this.userId = creds.userId;

    const g = globalThis as unknown as { __lgcNcInit?: string };
    if (g.__lgcNcInit !== creds.appKey) {
      sdk.NCEngine.initialize({ appKey: creds.appKey, areaCode: sdk.AreaCode.SG, logLevel: sdk.LogLevel.ERROR });
      sdk.NCEngine.registerCustomMessages([
        { messageType: MSG.correction, isPersisted: true, isCounted: true },
        { messageType: MSG.vocabCard, isPersisted: true, isCounted: true },
        { messageType: MSG.tutorTip, isPersisted: true, isCounted: true },
        { messageType: MSG.roomPrompt, isPersisted: true, isCounted: true },
        { messageType: MSG.notice, isPersisted: true, isCounted: true },
        { messageType: MSG.signal, isPersisted: false, isCounted: false, isStatusMessage: true },
      ]);
      g.__lgcNcInit = creds.appKey;
    }
    this.registerHandlers(sdk);
    await this.connect(creds.token);
  }

  private registerHandlers(sdk: Sdk) {
    const E = sdk.NCEngine;
    E.removeConnectionStatusHandler(HANDLER_ID);
    E.removeMessageHandler(HANDLER_ID);
    E.removeChannelHandler(HANDLER_ID);
    E.removeUserHandler(HANDLER_ID);

    E.addConnectionStatusHandler(
      HANDLER_ID,
      new sdk.ConnectionStatusHandler({
        onConnectionStatusChanged: ({ status, code }) => {
          const S = sdk.ConnectionStatus;
          if (status === S.CONNECTED) {
            this.retryDelay = 3000;
            this.setState("connected");
            void this.refreshUnread();
            void this.resubscribePresence();
          } else if (status === S.CONNECTING) {
            this.setState(this.state === "connected" ? "reconnecting" : "connecting");
          } else if (status === S.DISCONNECTED && code === 31010) {
            this.setState("kicked", code);
          } else if (status === S.SUSPENDED || status === S.DISCONNECTED) {
            this.setState("reconnecting", code);
            if (code === 31004 || code === 33007) this.scheduleReconnect(true);
          }
        },
      }),
    );

    E.addMessageHandler(
      HANDLER_ID,
      new sdk.MessageHandler({
        onMessageReceived: ({ messages }) => {
          const out: ChatMessage[] = [];
          for (const m of messages) {
            if (m.messageType === MSG.signal) {
              const { kind = "", messageId } = m.content as { kind?: string; messageId?: string };
              if (kind === "stream" && messageId) {
                const ref = this.refFromIdentifier(m.channelIdentifier);
                if (ref) void this.fetchById(ref, messageId);
                continue;
              }
              this.emit({ type: "signal", kind, from: m.senderUserId });
              continue;
            }
            out.push(this.normalize(m as RawMessage));
          }
          if (out.length) {
            this.emit({ type: "messages", messages: out });
            void this.refreshUnread();
          }
        },
        onMessagesUpdated: ({ messages }) => {
          this.emit({ type: "updated", messages: messages.map((m) => this.normalize(m as RawMessage)) });
        },
        onMessageMetadataUpdated: ({ messageId, channelIdentifier, metadata }) => {
          const channel = this.refFromIdentifier(channelIdentifier);
          if (channel) this.emit({ type: "metadata", channel, messageId, metadata });
        },
        onMessageReceiptResponse: ({ responses }) => {
          const ids = responses.filter((r) => r.readCount > 0).map((r) => r.messageId);
          if (ids.length) this.emit({ type: "receipts", messageIds: ids });
        },
        onMessageDeleted: ({ messages }) => {
          this.emit({ type: "deleted", messageIds: messages.map((m) => m.messageId) });
        },
        onMessageReactionChanged: ({ reactions }) => {
          const changes: ReactionChange[] = [];
          for (const r of reactions) {
            const channel = this.refFromIdentifier(r.channelIdentifier);
            if (!channel) continue;
            const op = r.operationType === sdk.MessageReactionOperationType.ADDED ? "added" : r.operationType === sdk.MessageReactionOperationType.REMOVED ? "removed" : "cleared";
            changes.push({ channel, messageId: r.messageId, reactionId: r.reactionId, op, userIds: r.users.map((u) => u.userId), total: r.totalCount });
          }
          if (changes.length) this.emit({ type: "reactions", changes });
        },
        onStreamMessageRequestDelta: ({ messageId, chunkInfo }) => {
          this.emit({ type: "stream", messageId, text: chunkInfo.messageContent, done: false });
        },
        onStreamMessageRequestComplete: ({ messageId }) => {
          this.emit({ type: "stream", messageId, text: "", done: true });
        },
        onOfflineMessageSyncCompleted: () => {
          void this.refreshUnread();
        },
      }),
    );

    E.addChannelHandler(
      HANDLER_ID,
      new sdk.ChannelHandler({
        onTypingStatusChanged: ({ channelIdentifier, userTypingStatus }) => {
          const channel = this.refFromIdentifier(channelIdentifier);
          if (!channel) return;
          const userIds = userTypingStatus.map((t) => t.userId).filter((id) => id !== this.userId);
          this.emit({ type: "typing", channel, userIds });
        },
        onChannelUnreadStatusSync: () => void this.refreshUnread(),
      }),
    );

    E.addUserHandler(
      HANDLER_ID,
      new sdk.UserHandler({
        onSubscriptionChanged: ({ events }) => {
          const changed: Record<string, boolean> = {};
          for (const ev of events) {
            const details = ev.details ?? [];
            // eventValue 1 = online on that platform; the user is online if any platform is.
            changed[ev.userId] = details.some((d) => d.eventValue === 1);
          }
          Object.assign(this.presence, changed);
          this.emit({ type: "presence", online: changed });
        },
      }),
    );
  }

  private async connect(token: string, refreshed = false): Promise<void> {
    const sdk = this.sdk!;
    const res = await sdk.NCEngine.connect({ token });
    if (res.code === 0) return;
    if (res.code === 31004 && !refreshed) {
      const fresh = await this.token(true);
      return this.connect(fresh.token, true);
    }
    if (res.code === 31010) {
      this.setState("kicked", res.code);
      return;
    }
    this.setState("error", res.code);
    this.scheduleReconnect(res.code === 31004);
  }

  private scheduleReconnect(refreshToken: boolean) {
    if (this.retryTimer) return;
    const delay = this.retryDelay;
    this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
    this.retryTimer = setTimeout(async () => {
      this.retryTimer = null;
      try {
        const creds = await this.token(refreshToken);
        await this.connect(creds.token, refreshToken);
      } catch {
        this.scheduleReconnect(refreshToken);
      }
    }, delay);
  }

  /** Resolves once connected (or after the timeout). */
  waitConnected(timeoutMs = 15_000): Promise<boolean> {
    if (this.state === "connected") return Promise.resolve(true);
    return new Promise((resolve) => {
      const timer = setTimeout(() => (off(), resolve(false)), timeoutMs);
      const off = this.on((e) => {
        if (e.type === "status" && e.state === "connected") {
          clearTimeout(timer);
          off();
          resolve(true);
        }
      });
    });
  }

  /** Manual reconnect (e.g. after being signed in elsewhere). */
  async reconnect() {
    if (!this.sdk) return this.start();
    this.setState("connecting");
    const creds = await this.token();
    await this.connect(creds.token);
  }

  async disconnect() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (this.sdk) await this.sdk.NCEngine.disconnect().catch(() => undefined);
    this.startPromise = null;
    this.subscribed.clear();
    this.setState("idle");
  }

  // ---- helpers ------------------------------------------------------------------------------

  private requireSdk(): Sdk {
    if (!this.sdk) throw new Error("Chat is not connected yet");
    return this.sdk;
  }

  private channel(ref: ChannelRef) {
    const sdk = this.requireSdk();
    return ref.kind === "direct" ? new sdk.DirectChannel(ref.id) : new sdk.GroupChannel(ref.id);
  }

  private refFromIdentifier(identifier: { channelType: number; channelId: string } | undefined): ChannelRef | null {
    if (!identifier) return null;
    if (identifier.channelType === 1) return { kind: "direct", id: identifier.channelId };
    if (identifier.channelType === 3) return { kind: "group", id: identifier.channelId };
    return null;
  }

  normalize(m: RawMessage, state: ChatMessage["state"] = "sent"): ChatMessage {
    const channel = this.refFromIdentifier(m.channelIdentifier) ?? { kind: "direct", id: "" };
    if (m.messageId) this.raw.set(m.messageId, m);
    const metadata: Record<string, string> = {};
    if (m.metadata instanceof Map) m.metadata.forEach((v, k) => (metadata[k] = v));
    else if (m.metadata && typeof m.metadata === "object") Object.assign(metadata, m.metadata as Record<string, string>);
    return {
      key: m.messageId || `local-${m.clientId ?? ++this.localSeq}`,
      id: m.messageId || null,
      channel,
      senderId: m.senderUserId,
      type: m.messageType,
      content: { ...(m.content as Record<string, unknown>) },
      sentTime: m.sentTime || Date.now(),
      outgoing: m.senderUserId === this.userId,
      metadata,
      state,
      read: false,
      hasReactions: !!m.hasReactions,
    };
  }

  // ---- sending ------------------------------------------------------------------------------

  private async deliver<T extends Record<string, unknown>>(
    ref: ChannelRef,
    params: NC.SendMessageParams<T>,
    onLocal?: (m: ChatMessage) => void,
  ): Promise<ChatMessage> {
    const ch = this.channel(ref);
    params.metadata = { ...(params.metadata ?? {}), v: "1" }; // enables message metadata (expansion)
    if (ref.kind === "direct") params.needReceipt = true;
    params.onMessageInited = (m) => onLocal?.(this.normalize(m as unknown as RawMessage, "sending"));
    const res = await ch.sendMessage(params);
    if (res.code !== 0 || !res.data) {
      throw Object.assign(new Error(sendErrorText(res.code)), { code: res.code });
    }
    return this.normalize(res.data as unknown as RawMessage);
  }

  sendText(ref: ChannelRef, text: string, opts?: { replyTo?: ChatMessage; replySnippet?: string; onLocal?: (m: ChatMessage) => void }) {
    const sdk = this.requireSdk();
    if (opts?.replyTo?.id) {
      const params = new sdk.SendReferenceMessageParams({
        text,
        referMsgId: opts.replyTo.id,
        referMsgType: opts.replyTo.type,
        referMsgSenderId: opts.replyTo.senderId,
        // Since SDK 26.5.1 the quoted snapshot is the original message's own content object.
        referMsg: { ...opts.replyTo.content },
        extra: JSON.stringify({ q: (opts.replySnippet ?? "").slice(0, 160) }),
      });
      return this.deliver(ref, params as unknown as NC.SendMessageParams<Record<string, unknown>>, opts.onLocal);
    }
    const params = new sdk.SendTextMessageParams({ text });
    return this.deliver(ref, params as unknown as NC.SendMessageParams<Record<string, unknown>>, opts?.onLocal);
  }

  sendCustom<T extends object>(ref: ChannelRef, messageType: string, content: T, onLocal?: (m: ChatMessage) => void) {
    const sdk = this.requireSdk();
    const params = new sdk.SendMessageParams<Record<string, unknown>>({ ...(content as Record<string, unknown>) }, messageType);
    return this.deliver(ref, params, onLocal);
  }

  async sendVoice(ref: ChannelRef, file: File, durationSec: number, onLocal?: (m: ChatMessage) => void): Promise<ChatMessage> {
    const sdk = this.requireSdk();
    const created = await sdk.Helper.createSendHDVoiceMessageParams(file);
    if (created.code !== 0 || !created.data) throw new Error("Couldn't prepare the voice message");
    const params = created.data;
    (params.content as { duration: number }).duration = Math.max(1, Math.round(durationSec));
    params.metadata = { v: "1" };
    if (ref.kind === "direct") params.needReceipt = true;
    params.onMessageInited = (m) => onLocal?.(this.normalize(m as unknown as RawMessage, "sending"));
    const res = await this.channel(ref).sendMediaMessage(params);
    if (res.code !== 0 || !res.data) throw Object.assign(new Error(sendErrorText(res.code)), { code: res.code });
    return this.normalize(res.data as unknown as RawMessage);
  }

  // ---- history, channels, unread ----------------------------------------------------------

  createHistory(ref: ChannelRef, pageSize = 30) {
    const sdk = this.requireSdk();
    const query = sdk.BaseChannel.createMessagesQuery({
      channelIdentifier: this.channel(ref).identifier,
      startTime: Date.now() + 60_000,
      pageSize,
      isAscending: false,
    });
    return {
      hasMore: () => query.hasNext,
      next: async (): Promise<ChatMessage[]> => {
        const res = await query.loadNextPage();
        if (res.code !== 0 || !res.data) throw new Error(`history ${res.code}`);
        return res.data.data
          .filter((m) => m.messageType !== MSG.signal)
          .map((m) => this.normalize(m as unknown as RawMessage));
      },
    };
  }

  async listChannels(): Promise<ChannelSummary[]> {
    const sdk = this.requireSdk();
    const query = sdk.BaseChannel.createChannelsQuery({ pageSize: 100 });
    const res = await query.loadNextPage();
    if (res.code !== 0 || !res.data) return [];
    const out: ChannelSummary[] = [];
    for (const c of res.data.data) {
      const ref = this.refFromIdentifier(c.identifier);
      if (!ref) continue;
      out.push({
        ref,
        unread: c.unreadCount,
        latest: c.latestMessage ? this.normalize(c.latestMessage as unknown as RawMessage) : null,
        updatedAt: c.latestMessage?.sentTime ?? c.operationTime ?? 0,
      });
    }
    return out;
  }

  async refreshUnread() {
    if (!this.sdk || this.state !== "connected") return;
    const res = await this.sdk.BaseChannel.getTotalUnreadCount().catch(() => null);
    if (res && res.code === 0) this.emit({ type: "unread", total: res.data ?? 0 });
  }

  async markRead(ref: ChannelRef, incomingIds: string[]) {
    if (!this.sdk) return;
    const ch = this.channel(ref);
    await ch.clearUnreadCount().catch(() => undefined);
    if (ref.kind === "direct" && incomingIds.length) await ch.sendReadReceiptResponse(incomingIds.slice(-50)).catch(() => undefined);
    void this.refreshUnread();
  }

  /** Which of my sent messages the other person has read (direct channels). */
  async readState(ref: ChannelRef, myIds: string[]): Promise<string[]> {
    if (!this.sdk || ref.kind !== "direct" || myIds.length === 0) return [];
    const res = await this.channel(ref).getMessageReadReceiptInfo(myIds.slice(-100)).catch(() => null);
    if (!res || res.code !== 0 || !res.data) return [];
    return res.data.filter((r) => r.readCount > 0).map((r) => r.messageId);
  }

  async sendTyping(ref: ChannelRef) {
    if (!this.sdk || ref.kind !== "direct" || this.state !== "connected") return;
    await (this.channel(ref) as NC.DirectChannel).sendTypingStatus(MSG.text).catch(() => undefined);
  }

  /** Loads a message by id (e.g. a bot's stream message) and emits it like a received message. */
  async fetchById(ref: ChannelRef, messageId: string) {
    if (!this.sdk) return;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await this.sdk.BaseChannel.getMessagesByIds({ channelIdentifier: this.channel(ref).identifier, messageIds: [messageId] }).catch(() => null);
      const m = res && res.code === 0 ? res.data?.[messageId] : undefined;
      if (m) {
        this.emit({ type: "messages", messages: [this.normalize(m as unknown as RawMessage)] });
        return;
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  // ---- reactions ----------------------------------------------------------------------------

  /** Reaction summaries for up to 100 messages of one channel, keyed by message id. */
  async reactionSummaries(ref: ChannelRef, messageIds: string[]): Promise<Record<string, Reaction[]>> {
    if (!this.sdk || this.state !== "connected" || messageIds.length === 0) return {};
    const res = await this.channel(ref).getMessageReactionSummaries(messageIds.slice(-100)).catch(() => null);
    if (!res || res.code !== 0 || !res.data) return {};
    const out: Record<string, Reaction[]> = {};
    for (const [id, list] of Object.entries(res.data)) {
      out[id] = list.map((r) => ({ id: r.reactionId, count: r.totalCount, mine: r.hasCurrentUserReacted }));
    }
    return out;
  }

  /** Adds or removes my reaction on a sent message. */
  async react(messageId: string, reactionId: string, add: boolean) {
    const m = this.raw.get(messageId);
    if (!m) throw new Error("This message isn't loaded yet");
    const res = add ? await m.addReaction({ reactionId }) : await m.removeReaction({ reactionId });
    if (res.code !== 0) throw Object.assign(new Error(`Reaction not saved (${res.code})`), { code: res.code });
  }

  async requestStream(messageId: string) {
    const m = this.raw.get(messageId);
    if (m) await m.requestStreamMessage().catch(() => undefined);
  }

  // ---- presence -----------------------------------------------------------------------------

  async watchPresence(userIds: string[]) {
    if (!this.sdk) return;
    const fresh = [...new Set(userIds)].filter((id) => id && !this.subscribed.has(id)).slice(0, 100);
    if (fresh.length === 0) return;
    fresh.forEach((id) => this.subscribed.add(id));
    if (this.state !== "connected") return;
    await this.subscribeChunk(fresh);
  }

  private async subscribeChunk(ids: string[]) {
    const sdk = this.sdk!;
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      await sdk.NCEngine.userModule
        .subscribeEvent({ userIds: chunk, subscribeType: sdk.SubscribeType.ONLINE_STATUS, expiry: 86400 })
        .catch(() => undefined);
      const res = await sdk.NCEngine.userModule.getSubscribeUsersOnlineStatus(chunk).catch(() => null);
      if (res && res.code === 0 && res.data) {
        const online: Record<string, boolean> = {};
        for (const s of res.data) online[s.userId] = s.isOnline;
        Object.assign(this.presence, online);
        this.emit({ type: "presence", online });
      }
    }
  }

  private async resubscribePresence() {
    if (this.subscribed.size) await this.subscribeChunk([...this.subscribed]);
  }
}

function sendErrorText(code: number | undefined): string {
  switch (code) {
    case 30004:
      return "You're sending too fast. Wait a second.";
    case 30002:
      return "Not connected. Reconnecting…";
    case 405:
    case 22406:
    case 31009:
      return "This person isn't accepting messages from you.";
    default:
      return `Message not sent (${code ?? "unknown"}). Tap to retry.`;
  }
}

let instance: NexconnClient | null = null;
export function nexconn(): NexconnClient {
  instance ??= new NexconnClient();
  return instance;
}

export { channelKey };
export type { NexconnClient };
