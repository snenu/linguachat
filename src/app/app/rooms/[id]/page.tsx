"use client";

import { ArrowLeft, Hash, Lightbulb, LogOut, MessageCircle, UsersRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useMe, usePresence } from "@/components/app/providers";
import { Thread } from "@/components/chat/thread";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, LangTag } from "@/components/ui/misc";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import { language } from "@/lib/languages";
import type { RoomDef } from "@/lib/rooms";

interface Member {
  id: string;
  nexconnId: string;
  name: string;
  avatarUrl: string | null;
  nativeLanguages: string[];
  targetLanguage: string | null;
  targetLevel: string | null;
  blocked: boolean;
}

interface RoomDetail {
  room: RoomDef;
  groupId: string | null;
  joined: boolean;
  members: Member[];
  prompt: { prompt: string; hint: string; day: string } | null;
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();
  const toast = useToast();
  const { data, error, mutate } = useSWR<RoomDetail>(`/api/rooms/${id}`);
  const [busy, setBusy] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [prompt, setPrompt] = useState<RoomDetail["prompt"]>(null);
  const online = usePresence((data?.members ?? []).slice(0, 100).map((m) => m.nexconnId));
  const onlineCount = (data?.members ?? []).filter((m) => online[m.nexconnId] || m.id === me.id).length;

  // First visit of the day: the server generates today's prompt and the room host bot posts it.
  useEffect(() => {
    if (!data?.joined) return;
    setPrompt(data.prompt);
    if (data.prompt) return;
    api<{ prompt: RoomDetail["prompt"] }>(`/api/rooms/${id}/visit`, { method: "POST" })
      .then((r) => r.prompt && setPrompt(r.prompt))
      .catch(() => undefined);
  }, [data?.joined, data?.prompt, id]);

  const channel = useMemo(() => (data?.groupId ? { kind: "group" as const, id: data.groupId } : null), [data?.groupId]);

  async function join() {
    setBusy(true);
    try {
      await api(`/api/rooms/${id}/join`, { method: "POST" });
      await mutate();
      toast("You joined the room");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      await api(`/api/rooms/${id}/leave`, { method: "POST" });
      await mutate();
      setMembersOpen(false);
      toast("You left the room");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState title="Room not found">This room doesn&apos;t exist.</EmptyState>
      </div>
    );
  }
  if (!data) return <PageLoader label="Opening room" />;

  const lang = language(data.room.language);
  const isHere = (m: Member) => m.id === me.id || !!online[m.nexconnId];
  const sortedMembers = [...data.members].sort((a, b) => Number(isHere(b)) - Number(isHere(a)));
  const header = (
    <header className="flex items-center gap-2 border-b border-line bg-surface px-2 py-2.5 sm:gap-3 sm:px-5">
      <Link href="/app/rooms" aria-label="Back to rooms" className="rounded-full p-2 text-ink-2 transition-colors hover:bg-wash hover:text-ink">
        <ArrowLeft size={20} />
      </Link>
      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marker-wash text-ink sm:flex" aria-hidden="true">
        <Hash size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[1.05rem] font-bold text-ink">{data.room.name}</h1>
        <p className="mt-0.5 flex items-center gap-3 text-xs text-ink-3">
          <span>
            {data.members.length} {data.members.length === 1 ? "member" : "members"}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-mint">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" /> {onlineCount} online
          </span>
        </p>
      </div>
      <Button size="sm" variant="secondary" icon={<UsersRound size={15} />} onClick={() => setMembersOpen(true)} className="rounded-full">
        Members
      </Button>
    </header>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] min-h-0 flex-col lg:h-screen">
      {!data.joined || !channel ? (
        <>
          {header}
          <div className="paper-grid flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-10 sm:items-center">
            <div className="animate-ink-in w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-md sm:p-8">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-marker-wash text-ink" aria-hidden="true">
                <Hash size={26} />
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-ink">{data.room.name}</h2>
              <p className="mt-2 flex flex-wrap gap-1.5">
                {lang && <span className="rounded-full bg-accent-wash px-2.5 py-0.5 text-xs font-semibold text-accent-ink">{lang.name}</span>}
                <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-ink-2">Levels {data.room.bandLabel}</span>
                <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-ink-2">{data.room.topicName}</span>
              </p>
              <p className="mt-4 text-ink-2">
                Practise {data.room.topicName.toLowerCase()} with other learners at {data.room.bandLabel}. Each day the room host posts a new conversation
                prompt. Your messages get the same quiet coach notes as in your chats.
              </p>
              <div className="mt-5 flex items-center gap-3">
                {data.members.length > 0 && (
                  <span className="flex -space-x-2" aria-hidden="true">
                    {data.members.slice(0, 5).map((m) => (
                      <span key={m.id} className="rounded-full ring-2 ring-surface">
                        <Avatar name={m.name} src={m.avatarUrl} size={30} />
                      </span>
                    ))}
                  </span>
                )}
                <p className="text-sm text-ink-3">
                  {data.members.length
                    ? `${data.members.length} ${data.members.length === 1 ? "learner is" : "learners are"} here.`
                    : "Be the first to join."}
                </p>
              </div>
              <Button className="mt-6 w-full sm:w-auto" size="lg" loading={busy} onClick={join}>
                Join room
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Thread
          channel={channel}
          mode="room"
          header={header}
          top={
            prompt ? (
              <div className="mb-4 rounded-xl border border-marker/60 bg-marker-wash/70 p-4 shadow-sm">
                <p className="flex items-center gap-2 text-xs font-semibold text-ink-2">
                  <Lightbulb size={14} className="text-ink" fill="var(--marker)" aria-hidden="true" /> Today&apos;s prompt
                </p>
                <p className="mt-1.5 font-pen text-lg leading-snug text-ink" lang={data.room.language}>
                  {prompt.prompt}
                </p>
                {prompt.hint && (
                  <p className="mt-1.5 text-sm text-ink-2" lang={data.room.language}>
                    Useful: <span className="font-semibold text-ink">{prompt.hint}</span>
                  </p>
                )}
              </div>
            ) : null
          }
          empty={
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-marker-wash text-ink" aria-hidden="true">
                <MessageCircle size={22} />
              </span>
              <p className="text-ink-2">It&apos;s quiet here. Answer today&apos;s prompt to start the conversation.</p>
            </div>
          }
        />
      )}
      <Dialog open={membersOpen} onClose={() => setMembersOpen(false)} title="Members">
        <p className="mb-3 text-sm text-ink-3">
          {data.members.length} {data.members.length === 1 ? "member" : "members"}, {onlineCount} online now
        </p>
        <ul className="flex flex-col gap-1">
          {sortedMembers.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-lg px-1 py-2">
              <Avatar name={m.name} src={m.avatarUrl} size={38} online={isHere(m)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {m.name}
                  {m.id === me.id && <span className="font-normal text-ink-3"> (you)</span>}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ink-3">
                  speaks {m.nativeLanguages.map((l) => <LangTag key={l} code={l} />)}
                  {m.targetLanguage && (
                    <>
                      <span className="ml-1">learning</span> <LangTag code={m.targetLanguage} level={m.targetLevel} />
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
          {data.members.length === 0 && <li className="text-sm text-ink-2">No members yet.</li>}
        </ul>
        {data.joined && (
          <Button variant="danger" className="mt-5" icon={<LogOut size={15} />} loading={busy} onClick={leave}>
            Leave room
          </Button>
        )}
      </Dialog>
    </div>
  );
}
