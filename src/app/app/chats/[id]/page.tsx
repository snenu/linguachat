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
    <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-5">
      <Link href="/app/chats" aria-label="Back to chats" className="rounded-md p-1.5 text-ink-2 hover:bg-wash lg:hidden">
        <ArrowLeft size={20} />
      </Link>
      <button type="button" onClick={() => setProfileOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left">
        <Avatar name={partner.name} src={partner.avatarUrl} size={40} online={isOnline} />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{partner.name}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
            {activeLabel(partner.lastActiveAt, isOnline)}
            <span aria-hidden="true">·</span>
            native {partner.nativeLanguages.map(languageName).join(", ")}, learning
            <LangTag code={partner.targetLanguage} level={partner.targetLevel} />
          </span>
        </span>
      </button>
      <button type="button" onClick={() => setProfileOpen(true)} aria-label="Profile, block or report" className="rounded-md p-2 text-ink-2 hover:bg-wash">
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
          <div className="mx-auto my-10 max-w-md rounded-lg border border-line bg-surface p-5 text-center">
            <p className="font-display text-lg font-semibold text-ink">Start your exchange with {partner.name}</p>
            <p className="mt-1.5 text-sm text-ink-2">
              Try writing in {languageName(me.targetLanguage)} first. Use the check button to see a correction before you send, and help {partner.name} with{" "}
              {languageName(partner.targetLanguage)} by tapping their message and choosing Correct.
            </p>
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
