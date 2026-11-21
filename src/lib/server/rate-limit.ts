import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { HttpError } from "./http";

/**
 * Fixed-window rate limit stored in Postgres (works across serverless instances).
 * Throws 429 when `limit` is exceeded inside the window.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number, message?: string) {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, ${windowStart.toISOString()}, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count
  `);
  const count = Number(rows.rows[0]?.count ?? 0);
  if (count > limit) {
    throw new HttpError(429, message ?? "You're going a bit fast. Wait a moment and try again.", "rate_limited");
  }
}
