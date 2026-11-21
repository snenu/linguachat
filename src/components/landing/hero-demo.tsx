"use client";

import { Bookmark, CheckCheck, PenLine, SendHorizontal, SpellCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Part = string | { wrong: string; right: string };

interface Scene {
  id: string;
  label: string;
  stamp: [string, string];
  lang: string;
  partner: { name: string; about: string; bg: string; fg: string };
  partnerSays: string;
  you: string;
  parts: Part[];
  why: string;
  whyLang?: string;
  whyNote?: string;
  saved: string;
  reply: string;
}

const SCENES: Scene[] = [
  {
    id: "es",
    label: "Español",
    stamp: ["English", "Español"],
    lang: "es",
    partner: { name: "Lucía", about: "native Spanish speaker", bg: "#FCE6E9", fg: "#A3192C" },
    partnerSays: "¿Qué tal tu día?",
    you: "Bien, pero soy muy cansado hoy.",
    parts: ["Bien, pero ", { wrong: "soy", right: "estoy" }, " muy cansado hoy."],
    why: "Use estar for how you feel right now: estoy cansado.",
    saved: "estar",
    reply: "¡Descansa! Hablamos mañana.",
  },
  {
    id: "en",
    label: "English",
    stamp: ["हिन्दी", "English"],
    lang: "en",
    partner: { name: "Sam", about: "native English speaker", bg: "#E8ECFB", fg: "#1B2F9E" },
    partnerSays: "How was your weekend?",
    you: "Yesterday I go to the market and buyed mangoes.",
    parts: ["Yesterday I ", { wrong: "go", right: "went" }, " to the market and ", { wrong: "buyed", right: "bought" }, " mangoes."],
    why: "भूतकाल में go का रूप went और buy का रूप bought होता है।",
    whyLang: "hi",
    whyNote: "Explained in Hindi, your language",
    saved: "bought",
    reply: "Nice! Which kind did you get?",
  },
  {
    id: "ja",
    label: "日本語",
    stamp: ["English", "日本語"],
    lang: "ja",
    partner: { name: "Yui", about: "native Japanese speaker", bg: "#DFF3EA", fg: "#0D6B48" },
    partnerSays: "週末は何をしましたか？",
    you: "友達と映画を見るました。",
    parts: ["友達と映画を", { wrong: "見るました", right: "見ました" }, "。"],
    why: "The polite past of 見る (to watch) is 見ました: drop the る.",
    saved: "見ました",
    reply: "いいですね！何の映画ですか？",
  },
];

/** Milliseconds from the start of a scene at which each step begins. */
const STEPS = [250, 1100, 2500, 3200, 3700, 4400, 5100, 6000, 7100, 8000];
const SCENE_MS = 10_800;

/**
 * The product's core moment, played as a loop: a partner asks, you answer with a mistake,
 * the coach strikes it through and writes the fix, the word is saved, the partner replies.
 */
export function HeroDemo() {
  const [scene, setScene] = useState(0);
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");
  const [active, setActive] = useState(true);
  const [still, setStill] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Play only while on screen and the tab is visible.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let visible = true;
    let onScreen = true;
    const update = () => setActive(visible && onScreen);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      update();
    });
    io.observe(el);
    const vis = () => {
      visible = document.visibilityState === "visible";
      update();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  useEffect(() => {
    if (still) {
      setStep(STEPS.length);
      setTyped("");
      return;
    }
    if (!active) return;
    setStep(0);
    setTyped("");
    const timers: ReturnType<typeof setTimeout | typeof setInterval>[] = [];
    STEPS.forEach((at, i) => timers.push(setTimeout(() => setStep(i + 1), at)));
    // Type the learner's sentence into the composer between steps 2 and 3.
    const text = SCENES[scene].you;
    const start = STEPS[1];
    const span = STEPS[2] - STEPS[1] - 250;
    timers.push(
      setTimeout(() => {
        let n = 0;
        const iv = setInterval(() => {
          n += Math.max(1, Math.round(text.length / 26));
          setTyped(text.slice(0, n));
          if (n >= text.length) clearInterval(iv);
        }, span / 26);
        timers.push(iv);
      }, start),
    );
    timers.push(setTimeout(() => setTyped(""), STEPS[2]));
    timers.push(setTimeout(() => setStep(-1), SCENE_MS - 500));
    timers.push(setTimeout(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS));
    return () => timers.forEach((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  }, [scene, active, still]);

  const s = SCENES[scene];
  const on = (n: number) => step >= n;
  const show = (n: number) =>
    `transition-[opacity,transform] duration-500 ease-[var(--ease-out)] ${on(n) ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"}`;

  return (
    <div ref={root} className="relative">
      <figure
        className="airmail relative overflow-visible rounded-xl shadow-lg"
        aria-label="Example: a learner's sentence is corrected by the AI coach while chatting with a native speaker"
      >
        <Postmark key={s.id} top={s.stamp[0]} bottom={s.stamp[1]} />
        <div aria-hidden="true" className={`transition-opacity duration-500 ${step === -1 ? "opacity-0" : "opacity-100"}`}>
          <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: s.partner.bg, color: s.partner.fg }}
            >
              {s.partner.name[0]}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{s.partner.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-ink-3">
                <span className="live-ring h-2 w-2 rounded-full bg-mint" /> Online now, {s.partner.about}
              </p>
            </div>
          </div>

          <div className="flex min-h-[23.5rem] flex-col gap-2.5 bg-paper/60 px-4 py-4 sm:min-h-[22rem] sm:px-5" lang={s.lang}>
            <div className={`max-w-[80%] self-start rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 text-ink shadow-sm ${show(1)}`}>
              {s.partnerSays}
            </div>

            <div className={`flex max-w-[88%] flex-col items-end self-end ${show(3)}`}>
              <div className="rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-white shadow-sm">{s.you}</div>
              <span className={`mt-1 flex items-center gap-1 text-[0.7rem] text-ink-3 transition-opacity duration-300 ${on(10) ? "opacity-100" : "opacity-0"}`}>
                <CheckCheck size={12} className="text-accent" /> Read
              </span>
            </div>

            <div className={`max-w-[92%] self-end rounded-xl border border-accent-line bg-surface px-3.5 py-2.5 shadow-sm ${show(4)}`}>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-ink">
                <PenLine size={13} /> Coach note: grammar
              </p>
              <p className="mt-1.5 leading-relaxed text-ink">
                {s.parts.map((p, i) =>
                  typeof p === "string" ? (
                    <span key={i}>{p}</span>
                  ) : (
                    <span key={i}>
                      <span className="demo-strike" data-on={on(5)}>
                        {p.wrong}
                      </span>{" "}
                      <span className="demo-write corrected" data-on={on(6)}>
                        {p.right}
                      </span>
                    </span>
                  ),
                )}
              </p>
              <div className={`transition-[opacity,max-height] duration-500 ${on(7) ? "max-h-24 opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
                <p className="mt-1.5 text-sm text-ink-2" lang={s.whyLang ?? "en"}>
                  {s.why}
                </p>
                {s.whyNote && <p className="mt-0.5 text-xs text-ink-3">{s.whyNote}</p>}
              </div>
            </div>

            <div className={`flex items-center gap-2 self-end text-sm text-ink-2 ${show(8)}`}>
              <Bookmark size={14} className="text-marker" fill="var(--marker)" />
              <span className="marker px-0.5 font-semibold text-ink">{s.saved}</span> saved to your flashcards
            </div>

            {on(9) && !on(10) && (
              <div className="animate-ink-in flex gap-1 self-start rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-3.5">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-3" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
            {on(10) && (
              <div className="animate-pop-in max-w-[80%] self-start rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 text-ink shadow-sm">
                {s.reply}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-line bg-surface px-3 py-3 sm:px-4">
            <div className="flex h-10 min-w-0 flex-1 items-center truncate rounded-full border border-line-strong bg-paper px-4 text-sm" lang={s.lang}>
              {typed ? (
                <span className="truncate text-ink">
                  {typed}
                  <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-ink" />
                </span>
              ) : (
                <span className="text-ink-3">Write in {s.label}</span>
              )}
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2" title="Check before sending">
              <SpellCheck size={18} />
            </span>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors ${typed ? "bg-accent" : "bg-accent/40"}`}>
              <SendHorizontal size={17} />
            </span>
          </div>
        </div>
      </figure>

      <div className="mt-5 flex items-center justify-center gap-2" role="group" aria-label="Choose an example language">
        {SCENES.map((sc, i) => (
          <button
            key={sc.id}
            type="button"
            aria-pressed={i === scene}
            onClick={() => setScene(i)}
            className={`h-8 rounded-full px-3.5 text-sm font-semibold transition-[background-color,color,box-shadow] ${
              i === scene ? "bg-ink text-white shadow-sm" : "text-ink-2 hover:bg-surface hover:text-ink"
            }`}
            lang={sc.lang}
          >
            {sc.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A rubber-stamp postmark naming the language pair. */
function Postmark({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div
      aria-hidden="true"
      className="animate-pop-in absolute -top-7 -right-3 z-10 flex h-[5.5rem] w-[5.5rem] rotate-[9deg] flex-col items-center justify-center rounded-full border-[2.5px] border-red bg-surface/90 text-center text-red-ink shadow-sm backdrop-blur-sm sm:-right-6"
    >
      <span className="absolute inset-1 rounded-full border border-dashed border-red/60" />
      <span className="text-[0.7rem] leading-tight font-bold">{top}</span>
      <span className="text-[0.65rem] leading-none">⇄</span>
      <span className="text-[0.7rem] leading-tight font-bold">{bottom}</span>
    </div>
  );
}
