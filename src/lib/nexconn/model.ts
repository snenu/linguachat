// Plain, serialisable chat model used by the UI (no SDK types leak into components).

export type ChannelKind = "direct" | "group";

export interface ChannelRef {
  kind: ChannelKind;
  id: string; // other user's Nexconn id (direct) or group id
}

export function channelKey(ref: ChannelRef): string {
  return `${ref.kind}:${ref.id}`;
}

export type SendState = "sending" | "sent" | "failed";

export interface ChatMessage {
  key: string; // stable React key (message id, or local id while sending)
  id: string | null; // server message id
  channel: ChannelRef;
  senderId: string;
  type: string;
  content: Record<string, unknown>;
  sentTime: number;
  outgoing: boolean;
  metadata: Record<string, string>;
  state: SendState;
  read: boolean;
  /** The server has reactions recorded for this message (load summaries to show them). */
  hasReactions?: boolean;
  error?: string;
}

/** One emoji on a message: how many people added it and whether I did. */
export interface Reaction {
  id: string;
  count: number;
  mine: boolean;
}

export interface ReactionChange {
  channel: ChannelRef;
  messageId: string;
  /** Empty when every reaction on the message was cleared. */
  reactionId: string;
  op: "added" | "removed" | "cleared";
  userIds: string[];
  total: number;
}

export interface ChannelSummary {
  ref: ChannelRef;
  unread: number;
  latest: ChatMessage | null;
  updatedAt: number;
}

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "offline" | "kicked" | "error";

export type NcEvent =
  | { type: "status"; state: ConnectionState; code?: number }
  | { type: "messages"; messages: ChatMessage[]; offline?: boolean }
  | { type: "updated"; messages: ChatMessage[] }
  | { type: "metadata"; channel: ChannelRef; messageId: string; metadata: Record<string, string> }
  | { type: "typing"; channel: ChannelRef; userIds: string[] }
  | { type: "receipts"; messageIds: string[] }
  | { type: "presence"; online: Record<string, boolean> }
  | { type: "stream"; messageId: string; text: string; done: boolean }
  | { type: "deleted"; messageIds: string[] }
  | { type: "reactions"; changes: ReactionChange[] }
  | { type: "signal"; kind: string; from: string }
  | { type: "unread"; total: number };

/** Short preview text for channel lists and notifications. */
export function previewText(m: ChatMessage | null): string {
  if (!m) return "";
  const c = m.content as Record<string, string | undefined>;
  switch (m.type) {
    case "RC:TxtMsg":
    case "RC:ReferenceMsg":
      return c.text ?? "";
    case "RC:HQVCMsg":
      return "Voice message";
    case "RC:StreamMsg":
      return (c.content as string) ?? "";
    case "LGC:Correction":
      return `Correction: ${c.corrected ?? ""}`;
    case "LGC:VocabCard":
      return `Word: ${c.term ?? ""}`;
    case "LGC:TutorTip":
      return c.title ?? "Tutor tip";
    case "LGC:RoomPrompt":
      return `Today's prompt: ${c.prompt ?? ""}`;
    case "LGC:Notice":
      return c.text ?? "";
    default:
      return "Message";
  }
}
