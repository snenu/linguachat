import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/server/env";

/**
 * Nexconn Platform Chat API client (server only).
 * Auth: App-Key, Nonce, Timestamp, Signature = sha1(appSecret + nonce + timestamp).
 * Docs: https://docs.nexconn.ai/platform-chat-api
 */

export class NexconnError extends Error {
  constructor(
    public path: string,
    public code: number | string,
    message: string,
  ) {
    super(`Nexconn ${path} failed (${code}): ${message}`);
  }
}

type NcResponse<T> = { code: number; result?: T; errorMessage?: string };

function signedHeaders() {
  const nonce = randomBytes(8).toString("hex");
  const timestamp = String(Date.now());
  const signature = createHash("sha1").update(env.nexconnAppSecret + nonce + timestamp).digest("hex");
  return {
    "App-Key": env.nexconnAppKey,
    Nonce: nonce,
    Timestamp: timestamp,
    Signature: signature,
    "Content-Type": "application/json",
  };
}

const BACKUP_BASE = "https://api-b.sg-light-api.com";

async function call<T = unknown>(path: string, body: unknown, attempt = 0): Promise<T | undefined> {
  const base = attempt >= 2 ? BACKUP_BASE : env.nexconnApiBase;
  let res: Response;
  try {
    res = await fetch(base + path, {
      method: "POST",
      headers: signedHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      return call<T>(path, body, attempt + 1);
    }
    throw new NexconnError(path, "network", err instanceof Error ? err.message : String(err));
  }
  if (res.status >= 500 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    return call<T>(path, body, attempt + 1);
  }
  const text = await res.text();
  let data: NcResponse<T>;
  try {
    data = JSON.parse(text) as NcResponse<T>;
  } catch {
    throw new NexconnError(path, res.status, text.slice(0, 200));
  }
  if (data.code !== 0 && data.code !== 200) {
    throw new NexconnError(path, data.code, data.errorMessage ?? "unknown error");
  }
  return data.result;
}

/** Registers (if needed) and issues an access token for a user. */
export async function issueToken(userId: string, name: string, avatarUrl?: string | null): Promise<string> {
  const result = await call<{ userId: string; accessToken: string }>("/v4/auth/access-token/issue", {
    userId,
    name: name.slice(0, 64),
    ...(avatarUrl ? { avatarUrl } : {}),
  });
  if (!result?.accessToken) throw new NexconnError("/v4/auth/access-token/issue", "no_token", "missing accessToken");
  return result.accessToken;
}

/** Updates the user's display name / avatar stored by Nexconn (used in push and SDK user info). */
export async function updateUserInfo(userId: string, name: string, avatarUrl?: string | null) {
  await call("/v4/user/update", { userId, name: name.slice(0, 64), ...(avatarUrl ? { avatarUrl } : {}) }).catch(
    () => undefined,
  );
}

export interface SendDirectOptions {
  fromUserId: string;
  toUserIds: string[];
  messageType: string;
  content: Record<string, unknown>;
  pushContent?: string;
  echoToSender?: boolean;
  persist?: boolean;
  metadata?: Record<string, string>;
  verifyBlocklist?: boolean;
}

/** Sends a direct-channel message as `fromUserId` (bots, notices, signals). Returns per-recipient ids. */
export async function sendDirect(opts: SendDirectOptions) {
  const result = await call<{ messageIds: { userId: string; messageId: string }[] }>("/v4/direct-channel/message/send", {
    fromUserId: opts.fromUserId,
    toUserIds: opts.toUserIds,
    messageType: opts.messageType,
    content: JSON.stringify(opts.content),
    ...(opts.pushContent ? { pushContent: opts.pushContent } : {}),
    isEchoToSender: opts.echoToSender ? 1 : 0,
    shouldPersist: opts.persist === false ? 0 : 1,
    verifyBlocklist: opts.verifyBlocklist ? 1 : 0,
    ...(opts.metadata ? { hasMetadata: true, metadata: opts.metadata } : { hasMetadata: true }),
  });
  return result?.messageIds ?? [];
}

export interface SendGroupOptions {
  fromUserId: string;
  groupId: string;
  messageType: string;
  content: Record<string, unknown>;
  pushContent?: string;
}

export async function sendGroup(opts: SendGroupOptions) {
  const result = await call<{ messageIds: { channelId: string; messageId: string }[] }>("/v4/group-channel/message/send", {
    fromUserId: opts.fromUserId,
    toChannelIds: [opts.groupId],
    messageType: opts.messageType,
    content: JSON.stringify(opts.content),
    ...(opts.pushContent ? { pushContent: opts.pushContent } : {}),
    isEchoToSender: 0,
    hasMetadata: true,
  });
  return result?.messageIds?.[0]?.messageId ?? null;
}

/**
 * Streams a direct-channel RC:StreamMsg from a bot. Call with chunks; the first call returns the
 * message id used for continuation chunks. `seq` must start at 1 and increase by 1.
 */
export async function streamDirectChunk(opts: {
  fromUserId: string;
  toUserId: string;
  text: string;
  seq: number;
  complete: boolean;
  messageId?: string;
  extra?: Record<string, string>;
  metadata?: Record<string, string>;
}): Promise<string | undefined> {
  const content: Record<string, unknown> = {
    content: opts.text,
    complete: opts.complete,
    seq: opts.seq,
  };
  if (opts.messageId) content.messageId = opts.messageId;
  else {
    content.type = "text";
    if (opts.extra) content.extra = opts.extra;
  }
  const result = await call<{ messageId?: string }>("/v4/direct-channel/message/stream/send", {
    fromUserId: opts.fromUserId,
    toUserId: opts.toUserId,
    messageType: "RC:StreamMsg",
    content,
    isEchoToSender: 0,
    shouldPersist: 1,
    ...(opts.seq === 1 && opts.metadata ? { metadata: opts.metadata } : {}),
  });
  return result?.messageId ?? opts.messageId;
}

/**
 * Sets metadata (message expansion) on a direct (channelType 1) or group (3) message.
 * The original message must have been sent with metadata enabled.
 */
export async function setMessageMetadata(opts: {
  messageId: string;
  operatorUserId: string;
  channelType: 1 | 3;
  channelId: string;
  metadata: Record<string, string>;
}) {
  await call("/v4/channel-type/message/metadata/set", {
    messageId: opts.messageId,
    userId: opts.operatorUserId,
    channelType: opts.channelType,
    channelId: opts.channelId,
    metadata: opts.metadata,
    isEchoToSender: 1,
  });
}

export async function createGroup(opts: { groupId: string; name: string; ownerId: string; introduction?: string }) {
  await call("/v4/group-channel/create", {
    channelId: opts.groupId,
    name: opts.name.slice(0, 64),
    owner: opts.ownerId,
    permissions: { joinPerm: 1, memInvitePerm: 0, removePerm: 0, profilePerm: 0 },
    ...(opts.introduction ? { groupProfile: { introduction: opts.introduction.slice(0, 512) } } : {}),
  });
}

export async function joinGroup(groupId: string, userIds: string[]) {
  const result = await call<{ memberCount?: number }>("/v4/group-channel/join", { channelId: groupId, userIds });
  return result?.memberCount ?? null;
}

export async function quitGroup(groupId: string, userIds: string[]) {
  await call("/v4/group-channel/leave", { channelId: groupId, userIds });
}

export async function addToBlocklist(userId: string, targetUserIds: string[]) {
  await call("/v4/user/blocklist/add", { userId, targetUserIds });
}

export async function removeFromBlocklist(userId: string, blockedUserIds: string[]) {
  await call("/v4/user/blocklist/remove", { userId, blockedUserIds });
}

export async function isOnline(userId: string): Promise<boolean> {
  const result = await call<{ status: string }>("/v4/user/connection-status/get", { userId });
  return result?.status === "1";
}
