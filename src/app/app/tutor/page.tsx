"use client";

import { Coffee, Briefcase, Plane, Stethoscope, Smile, PenLine, GraduationCap, ListRestart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useMe } from "@/components/app/providers";
import { HintButton, Thread } from "@/components/chat/thread";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError, Textarea } from "@/components/ui/form";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import type { BotInfo, TutorSession } from "@/lib/client/types";
import { languageName, TUTOR_SCENARIOS } from "@/lib/languages";

const ICONS: Record<string, typeof Coffee> = { cafe: Coffee, interview: Briefcase, travel: Plane, doctor: Stethoscope, smalltalk: Smile, custom: PenLine };

function ScenePicker({ onStart, busy }: { onStart: (scenario: string, custom?: string) => void; busy: string | null }) {
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      {TUTOR_SCENARIOS.filter((s) => s.id !== "custom").map((s) => {
        const Icon = ICONS[s.id];
        return (
          <button
            key={s.id}
            type="button"
            disabled={!!busy}
            onClick={() => onStart(s.id)}
            className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 text-left text-sm text-ink transition-colors hover:border-ink disabled:opacity-60"
          >
            <Icon size={17} className="text-accent" aria-hidden="true" />
            <span className="flex-1 font-semibold">{s.title}</span>
            {busy === s.id && <span className="text-xs text-ink-3">Starting…</span>}
          </button>
        );
      })}
      <div className="mt-2 rounded-md border border-line bg-surface p-3">
        <label htmlFor="custom-scene" className="text-sm font-semibold text-ink">
          Your own scenario
        </label>
        <Textarea
          id="custom-scene"
          value={custom}
          maxLength={300}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="e.g. Returning a broken phone to a shop"
          className="mt-1.5 min-h-16 text-sm"
        />
        <FormError message={error} />
        <Button
          size="sm"
          className="mt-2"
          loading={busy === "custom"}
          disabled={!!busy}
          onClick={() => {
            if (!custom.trim()) return setError("Describe the situation you want to practise.");
            setError(null);
            onStart("custom", custom.trim());
          }}
        >
          Start my scenario
        </Button>
      </div>
    </div>
  );
}

export default function TutorPage() {
  const { me } = useMe();
  const toast = useToast();
  const { data, mutate } = useSWR<{ bot: BotInfo; sessions: TutorSession[] }>("/api/tutor");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [hinting, setHinting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!activeId && data?.sessions[0]) setActiveId(data.sessions[0].id);
  }, [data, activeId]);

  const active = data?.sessions.find((s) => s.id === activeId) ?? null;
  const channel = useMemo(() => (data ? { kind: "direct" as const, id: data.bot.nexconnId } : null), [data]);

  async function start(scenario: string, custom?: string) {
    setBusy(scenario);
    try {
      const res = await api<{ session: TutorSession }>("/api/tutor/sessions", { body: { scenario, custom } });
      await mutate();
      setActiveId(res.session.id);
      setPickerOpen(false);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function hint() {
    if (!activeId) return;
    setHinting(true);
    try {
      await api("/api/tutor/hint", { body: { sessionId: activeId } });
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setHinting(false);
    }
  }

  if (!data || !channel) return <PageLoader label="Loading your tutor" />;
  const target = languageName(me.targetLanguage);

  const sidebar = (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Start a scene</h2>
        <p className="mt-0.5 text-xs text-ink-3">The tutor plays the other person, in {target} at {me.targetLevel}.</p>
        <div className="mt-3">
          <ScenePicker onStart={start} busy={busy} />
        </div>
      </div>
      {data.sessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-ink">Recent scenes</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {data.sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(s.id);
                    setPickerOpen(false);
                  }}
                  aria-current={s.id === activeId ? "true" : undefined}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${s.id === activeId ? "bg-ink text-surface" : "text-ink hover:bg-wash"}`}
                >
                  <span className="truncate">{s.title}</span>
                  <span className={`shrink-0 text-xs ${s.id === activeId ? "text-surface/70" : "text-ink-3"}`}>
                    {s.turns} {s.turns === 1 ? "turn" : "turns"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const header = (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-5">
      <Avatar name={data.bot.name} size={40} bot />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{data.bot.name}</p>
        <p className="truncate text-xs text-ink-3">{active ? `Scene: ${active.title}` : "Pick a scene to begin"}</p>
      </div>
      <Button size="sm" variant="secondary" className="lg:hidden" icon={<ListRestart size={15} />} onClick={() => setPickerOpen(true)}>
        Scenes
      </Button>
    </header>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] min-h-0 lg:h-screen">
      <aside className="scroll-thin hidden w-80 shrink-0 overflow-y-auto border-r border-line bg-paper p-4 lg:block">
        <h1 className="font-serif text-xl font-semibold text-ink">AI tutor</h1>
        <p className="mt-1 mb-5 text-sm text-ink-2">Real conversations, no pressure. Corrections appear under your messages.</p>
        {sidebar}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-paper">
        <Thread
          channel={channel}
          mode="tutor"
          tutorSessionId={activeId}
          botName={data.bot.name.split(" ")[0]}
          header={header}
          onTurnSettled={() => void mutate()}
          composerExtra={active ? <HintButton onClick={hint} loading={hinting} /> : undefined}
          placeholder={active ? `Reply in ${target}` : "Pick a scene to start"}
          empty={
            <div className="mx-auto my-8 max-w-md rounded-lg border border-line bg-surface p-5">
              <GraduationCap size={24} className="text-accent" aria-hidden="true" />
              <p className="mt-2 font-serif text-lg font-semibold text-ink">Practise {target} with your AI tutor</p>
              <p className="mt-1 text-sm text-ink-2">
                Choose a scene. The tutor opens the conversation, replies at your level and corrects you quietly. Stuck? Tap Help me reply.
              </p>
              <Button className="mt-4 lg:hidden" onClick={() => setPickerOpen(true)}>
                Choose a scene
              </Button>
            </div>
          }
        />
      </section>
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} title="Scenes">
        {sidebar}
      </Dialog>
    </div>
  );
}
