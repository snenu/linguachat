"use client";

import { Briefcase, Coffee, ListRestart, MessageCircle, PenLine, Plane, Sparkles, Stethoscope } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import useSWR from "swr";
import { useMe } from "@/components/app/providers";
import { HintButton, Thread } from "@/components/chat/thread";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError, Textarea } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/client/api";
import type { BotInfo, TutorSession } from "@/lib/client/types";
import { languageName, TUTOR_SCENARIOS } from "@/lib/languages";

/** Learner-facing look of each scene: icon, tint and a line on what you'll practise. */
const SCENES: Record<string, { icon: typeof Coffee; tint: string; blurb: string }> = {
  cafe: { icon: Coffee, tint: "bg-marker-wash text-[#8A4B06]", blurb: "Order drinks and snacks, ask about the menu." },
  interview: { icon: Briefcase, tint: "bg-accent-wash text-accent-ink", blurb: "Answer typical questions about you and your work." },
  travel: { icon: Plane, tint: "bg-mint-wash text-mint", blurb: "Ask for directions, tickets and local tips." },
  doctor: { icon: Stethoscope, tint: "bg-red-wash text-red-ink", blurb: "Describe how you feel and understand advice." },
  smalltalk: { icon: MessageCircle, tint: "bg-[#EEE6FA] text-[#5B2B9E]", blurb: "Chat about hobbies, weekends and life." },
  custom: { icon: PenLine, tint: "bg-wash text-ink-2", blurb: "Any situation you describe." },
};

function timeAgo(iso: string | null) {
  if (!iso) return "not started";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function ScenePicker({ onStart, busy }: { onStart: (scenario: string, custom?: string) => void; busy: string | null }) {
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const customId = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {TUTOR_SCENARIOS.filter((s) => s.id !== "custom").map((s) => {
          const { icon: Icon, tint, blurb } = SCENES[s.id];
          return (
            <button
              key={s.id}
              type="button"
              disabled={!!busy}
              onClick={() => onStart(s.id)}
              title={blurb}
              className="group relative flex flex-col items-start gap-2 rounded-lg border border-line bg-surface p-3 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent-line hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-md ${tint}`} aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="text-sm leading-snug font-bold text-ink">{s.title}</span>
              {busy === s.id && (
                <span className="absolute top-2.5 right-2.5 flex gap-0.5" aria-label="Starting">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
        <div className="flex flex-col justify-center rounded-lg border border-dashed border-line-strong p-3 text-xs text-ink-3">
          Every scene adapts to your level and corrects you as you go.
        </div>
      </div>
      <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
        <label htmlFor={customId} className="flex items-center gap-2 text-sm font-bold text-ink">
          <Sparkles size={15} className="text-accent" aria-hidden="true" /> Your own scenario
        </label>
        <Textarea
          id={customId}
          value={custom}
          maxLength={300}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="e.g. Returning a broken phone to a shop"
          className="mt-2 min-h-16 text-sm"
        />
        {error && (
          <div className="mt-2">
            <FormError message={error} />
          </div>
        )}
        <Button
          size="sm"
          className="mt-2.5"
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

  if (!data || !channel) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem-4rem)] min-h-0 lg:h-screen" aria-busy="true">
        <div className="hidden w-[22rem] shrink-0 flex-col gap-3 border-r border-line p-5 lg:flex">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-line bg-surface px-5 py-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }
  const target = languageName(me.targetLanguage);
  const persona = data.bot.name.split(" ")[0];

  const sidebar = (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="font-display text-base font-bold text-ink">Start a scene</h2>
        <p className="mt-0.5 mb-3 text-sm text-ink-2">
          {persona} plays the other person, in {target} at {me.targetLevel}.
        </p>
        <ScenePicker onStart={start} busy={busy} />
      </div>
      {data.sessions.length > 0 && (
        <div>
          <h2 className="font-display text-base font-bold text-ink">Recent scenes</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {data.sessions.map((s) => {
              const scene = SCENES[s.scenario] ?? SCENES.custom;
              const Icon = scene.icon;
              const current = s.id === activeId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(s.id);
                      setPickerOpen(false);
                    }}
                    aria-current={current ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      current ? "bg-surface shadow-sm ring-1 ring-accent-line" : "hover:bg-surface"
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${scene.tint}`} aria-hidden="true">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${current ? "font-bold text-ink" : "font-semibold text-ink"}`}>{s.title}</span>
                      <span className="block text-xs text-ink-3">
                        {s.turns} {s.turns === 1 ? "turn" : "turns"}, {timeAgo(s.lastTurnAt ?? s.startedAt)}
                      </span>
                    </span>
                    {current && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );

  const activeScene = active ? (SCENES[active.scenario] ?? SCENES.custom) : null;
  const header = (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-5">
      <Avatar name={data.bot.name} size={42} bot />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{data.bot.name}</p>
        {active && activeScene ? (
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-ink-2">
            <activeScene.icon size={13} className="shrink-0 text-ink-3" aria-hidden="true" />
            <span className="truncate">{active.title}</span>
            <span className="shrink-0 rounded-full bg-accent-wash px-1.5 font-semibold text-accent-ink">{active.level}</span>
          </p>
        ) : (
          <p className="truncate text-xs text-ink-3">Pick a scene to begin</p>
        )}
      </div>
      <Button size="sm" variant="secondary" className="lg:hidden" icon={<ListRestart size={15} />} onClick={() => setPickerOpen(true)}>
        Scenes
      </Button>
    </header>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] min-h-0 lg:h-screen">
      <aside className="scroll-thin hidden w-[22rem] shrink-0 overflow-y-auto border-r border-line bg-paper p-5 lg:block">
        <h1 className="font-display text-2xl font-bold text-ink">AI tutor</h1>
        <p className="mt-1 mb-6 text-sm text-ink-2">Real conversations, no pressure. Corrections appear quietly under your messages.</p>
        {sidebar}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-paper">
        <Thread
          channel={channel}
          mode="tutor"
          tutorSessionId={activeId}
          botName={persona}
          header={header}
          onTurnSettled={() => void mutate()}
          composerExtra={active ? <HintButton onClick={hint} loading={hinting} /> : undefined}
          placeholder={active ? `Reply in ${target}` : "Pick a scene to start"}
          empty={
            <div className="animate-pop-in mx-auto my-8 w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-md">
              <div className="flex items-center gap-3 border-b border-line bg-accent-wash/70 px-5 py-4">
                <Avatar name={data.bot.name} size={44} bot />
                <div>
                  <p className="font-display text-lg font-bold text-ink">Practise {target} with {persona}</p>
                  <p className="text-xs text-ink-2">Your AI tutor, at {me.targetLevel}</p>
                </div>
              </div>
              <ol className="flex flex-col gap-3 px-5 py-4 text-sm text-ink-2">
                {[
                  "Choose a scene. The tutor opens the conversation.",
                  "Reply in your own words. Corrections attach to your messages.",
                  "Stuck? Tap Help me reply for phrases you could use.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-accent text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
              <div className="px-5 pb-5 lg:hidden">
                <Button className="w-full" onClick={() => setPickerOpen(true)}>
                  Choose a scene
                </Button>
              </div>
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
