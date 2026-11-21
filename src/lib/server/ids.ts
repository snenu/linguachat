import "server-only";
import { randomBytes } from "node:crypto";
import { env } from "./env";

/** Random, non-sequential Nexconn id: prefix + kind + random hex (letters and digits only). */
export function newNexconnId(kind: string): string {
  return `${env.idPrefix}${kind}${randomBytes(8).toString("hex")}`;
}

/** Deterministic ids for app-owned bots and rooms (stable across deploys, still prefixed). */
export function botId(name: string): string {
  return `${env.idPrefix}bot${name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;
}

export function roomGroupId(roomId: string): string {
  return `${env.idPrefix}room${roomId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;
}
