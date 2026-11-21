"use client";

import { ArrowLeft, Lightbulb, LogOut, UsersRound } from "lucide-react";
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

  const header = (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-5">
      <Link href="/app/rooms" aria-label="Back to rooms" className="rounded-md p-1.5 text-ink-2 hover:bg-wash">
        <ArrowLeft size={20} />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold text-ink">{data.room.name}</h1>
        <p className="text-xs text-ink-3">
          {data.members.length} {data.members.length === 1 ? "member" : "members"} · {onlineCount} online
        </p>
      </div>
      <Button size="sm" variant="secondary" icon={<UsersRound size={15} />} onClick={() => setMembersOpen(true)}>
        Members
      </Button>
    </header>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] min-h-0 flex-col lg:h-screen">
      {!data.joined || !channel ? (
        <>
          {header}
          <div className="mx-auto w-full max-w-xl px-4 py-10">
            <h2 className="font-display text-2xl font-semibold text-ink">{data.room.name}</h2>
            <p className="mt-2 text-ink-2">
              Practise {data.room.topicName.toLowerCase()} with other learners at {data.room.bandLabel}. Each day the room host posts a new conversation
              prompt. Your messages get the same quiet coach notes as in your chats.
            </p>
            <p className="mt-4 text-sm text-ink-3">{data.members.length ? `${data.members.length} learners are here.` : "Be the first to join."}</p>
            <Button className="mt-6" size="lg" loading={busy} onClick={join}>
              Join room
            </Button>
          </div>
        </>
      ) : (
        <Thread
          channel={channel}
          mode="room"
          header={header}
          top={
            prompt ? (
              <div className="mb-3 rounded-lg border border-ink bg-surface p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-ink-2">
                  <Lightbulb size={14} aria-hidden="true" /> Today&apos;s prompt
                </p>
                <p className="mt-1.5 font-pen text-lg text-ink" lang={data.room.language}>
                  {prompt.prompt}
                </p>
                {prompt.hint && (
                  <p className="mt-1 text-sm text-ink-2" lang={data.room.language}>
                    Useful: {prompt.hint}
                  </p>
                )}
              </div>
            ) : null
          }
          empty={<p className="py-8 text-center text-ink-2">It&apos;s quiet here. Answer today&apos;s prompt to start the conversation.</p>}
        />
      )}
      <Dialog open={membersOpen} onClose={() => setMembersOpen(false)} title="Members">
        <ul className="flex flex-col gap-2.5">
          {data.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <Avatar name={m.name} src={m.avatarUrl} size={36} online={m.id === me.id || !!online[m.nexconnId]} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {m.name}
                  {m.id === me.id ? " (you)" : ""}
                </p>
                <div className="flex flex-wrap gap-1 text-xs text-ink-3">
                  native {m.nativeLanguages.map((l) => <LangTag key={l} code={l} />)}
                  {m.targetLanguage && <LangTag code={m.targetLanguage} level={m.targetLevel} />}
                </div>
              </div>
            </li>
          ))}
          {data.members.length === 0 && <li className="text-sm text-ink-2">No members yet.</li>}
        </ul>
        {data.joined && (
          <Button variant="secondary" className="mt-5" icon={<LogOut size={15} />} loading={busy} onClick={leave}>
            Leave room
          </Button>
        )}
      </Dialog>
    </div>
  );
}
