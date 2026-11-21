import { isBlockedEitherWay, usersByIds } from "@/lib/server/domain";
import { handler, HttpError, json } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";
import { relationsFor, toCandidate } from "@/lib/server/social";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireOnboardedUser();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Learner not found", "not_found");
  const [user] = await usersByIds([id]);
  if (!user || !user.onboardedAt || user.id === me.id || (await isBlockedEitherWay(me.id, user.id))) {
    throw new HttpError(404, "Learner not found", "not_found");
  }
  const relations = await relationsFor(me);
  return json(toCandidate(me, user, relations.get(user.id)));
});
