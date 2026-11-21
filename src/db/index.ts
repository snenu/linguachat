import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url), { schema });
}

type Db = ReturnType<typeof createDb>;
const globalForDb = globalThis as unknown as { __lgcDb?: Db };

export const db: Db = globalForDb.__lgcDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__lgcDb = db;

export { schema };
