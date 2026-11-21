import { isBlockedEitherWay, logActivity, partnershipExists, usersByIds } from "@/lib/server/domain";
import { handler, HttpError, json, parseBody } from "@/lib/server/http";
import { logMistake } from "@/lib/server/mistakes";
import { rateLimit } from "@/lib/server/rate-limit";
import { requireOnboardedUser } from "@/lib/server/session";
import { correctionSchema } from "@/lib/validation";

/**
 * Records a manual correction card a partner sent (the card itself travels as a Nexconn custom
 * message). Saves it to the corrected partner's mistake log and counts it for both people.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireOnboardedUser();
  const input = await parseBody(req, correctionSchema);
  await rateLimit(`correction:${me.id}`, 120, 3600);
  const [partner] = await usersByIds([input.partnerUserId]);
  if (!partner || !(await partnershipExists(me.id, partner.id)) || (await isBlockedEitherWay(me.id, partner.id))) {
    throw new HttpError(403, "You can only correct your partners", "forbidden");
  }
  if (input.original === input.corrected) throw new HttpError(400, "The corrected version is the same as the original", "invalid_input");

  await logMistake({
    userId: partner.id,
    language: partner.targetLanguage ?? "en",
    original: input.original,
    correction: { corrected: input.corrected, explanation: input.note, category: input.category, tag: "" },
    source: "partner",
    messageId: input.messageId ?? null,
    correctedBy: me.id,
  });
  const ref = input.messageId ?? `${Date.now()}`;
  await logActivity(me, "correction_given", partner.targetLanguage, ref);
  await logActivity(partner, "correction_received", partner.targetLanguage, ref);
  return json({ ok: true }, { status: 201 });
});
