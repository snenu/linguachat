import { myPartners, publicProfile, tutorBot } from "@/lib/server/domain";
import { handler, json } from "@/lib/server/http";
import { requireOnboardedUser } from "@/lib/server/session";

/** My accepted partners plus my AI tutor bot, used to label direct channels. */
export const GET = handler(async () => {
  const me = await requireOnboardedUser();
  const partners = await myPartners(me.id);
  return json({
    partners: partners.map(publicProfile),
    tutor: tutorBot(me.targetLanguage),
  });
});
