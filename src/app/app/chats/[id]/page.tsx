"use client";

import { ArrowLeft, MoreVertical } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useMe, usePresence } from "@/components/app/providers";
import { Thread } from "@/components/chat/thread";
import { activeLabel } from "@/components/partners/partner-card";
import { ProfileDialog } from "@/components/partners/profile-dialog";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, LangTag } from "@/components/ui/misc";
import { PageLoader } from "@/components/ui/spinner";
import type { BotInfo, Candidate, Profile } from "@/lib/client/types";
import { languageName } from "@/lib/languages";

export default function PartnerChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me } = useMe();
  const { data, error } = useSWR<{ partners: Profile[]; tutor: BotInfo }>("/api/partners/mine");
  const partner = data?.partners.find((p) => p.nexconnId === id) ?? null;
  const { data: candidate, mutate } = useSWR<Candidate>(partner ? `/api/users/${partner.id}` : null);
  const online = usePresence([id]);
  const [profileOpen, setProfileOpen] = useState(false);
  const channel = useMemo(() => ({ kind: "direct" as const, id }), [id]);

  const isTutor = !!data?.tutor && id === data.tutor.nexconnId;
  useEffect(() => {
    if (isTutor) router.replace("/app/tutor");
  }, [isTutor, router]);
  if (isTutor) return null;
  if (!data && !error) return <PageLoader label="Opening chat" />;
  if (!partner) {
    return (
      <div className="p-6">
        <EmptyState title="This conversation isn't available" action={<ButtonLink href="/app/partners">Find partners</ButtonLink>}>
          You can only chat with accepted partners. If you blocked this person or they blocked you, the chat is closed.
        </EmptyState>
      </div>
    );
  }

  const isOnline = !!online[id];
  const header = (
    <header className="flex items-center gap-2 border-b border-line bg-surface px-2 py-2.5 sm:gap-3 sm:px-5">
      <Link href="/app/chats" aria-label="Back to chats" className="rounded-full p-2 text-ink-2 transition-colors hover:bg-wash hover:text-ink lg:hidden">
        <ArrowLeft size={20} />
      </Link>
      <button type="button" onClick={() => setProfileOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-0.5 pr-2 text-left transition-colors hover:bg-wash/70">
        <Avatar name={partner.name} src={partner.avatarUrl} size={42} online={isOnline} />
        <span className="min-w-0">
          <span className="block truncate font-display text-[1.05rem] font-bold text-ink">{partner.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={isOnline ? "font-semibold text-mint" : "text-ink-3"}>{activeLabel(partner.lastActiveAt, isOnline)}</span>
            <span className="hidden items-center gap-1.5 text-ink-3 sm:inline-flex">
              speaks <span className="font-semibold text-ink-2">{partner.nativeLanguages.map(languageName).join(", ")}</span>, learning
              <LangTag code={partner.targetLanguage} level={partner.targetLevel} />
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        aria-label="Profile, block or report"
        className="rounded-full p-2.5 text-ink-2 transition-colors hover:bg-wash hover:text-ink"
      >
        <MoreVertical size={18} />
      </button>
    </header>
  );

  return (
    <>
      <Thread
        channel={channel}
        mode="partner"
        partner={{ id: partner.id, name: partner.name, nexconnId: partner.nexconnId }}
        header={header}
        empty={
          <div className="mx-auto my-10 w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface text-center shadow-sm">
            <div className="p-6">
              <div className="flex justify-center">
                <Avatar name={partner.name} src={partner.avatarUrl} size={56} online={isOnline} />
              </div>
              <p className="mt-3 font-display text-xl font-bold text-ink">Start your exchange with {partner.name}</p>
              <p className="mt-1.5 text-sm text-ink-2">
                Try writing in {languageName(me.targetLanguage)} first. Use the check button to see a correction before you send, and help {partner.name} with{" "}
                {languageName(partner.targetLanguage)} by tapping their message and choosing Correct.
              </p>
            </div>
          </div>
        }
      />
      <ProfileDialog
        candidate={profileOpen && candidate ? candidate : null}
        online={isOnline}
        onClose={() => setProfileOpen(false)}
        onChanged={() => {
          void mutate();
          setProfileOpen(false);
        }}
      />
    </>
  );
}
