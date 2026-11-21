import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { updateUserInfo } from "@/lib/nexconn/server";
import { handler, HttpError, json } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/session";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  await rateLimit(`avatar:${user.id}`, 10, 3600);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose an image to upload", "invalid_input");
  const ext = TYPES[file.type];
  if (!ext) throw new HttpError(400, "Use a JPG, PNG or WebP image", "invalid_input");
  if (file.size > 2 * 1024 * 1024) throw new HttpError(400, "Images must be 2 MB or smaller", "invalid_input");

  const blob = await put(`avatars/${user.id}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });
  await db.update(schema.users).set({ avatarUrl: blob.url }).where(eq(schema.users.id, user.id));
  await updateUserInfo(user.nexconnId, user.displayName, blob.url);
  return json({ avatarUrl: blob.url });
});

export const DELETE = handler(async () => {
  const user = await requireUser();
  await db.update(schema.users).set({ avatarUrl: null }).where(eq(schema.users.id, user.id));
  return json({ ok: true });
});
