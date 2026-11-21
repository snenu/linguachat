"use client";

import { Bot, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { useInView } from "./reveal";

const REPLY =
  "Bonjour ! Bienvenue au Café des Amis. Vous désirez quelque chose à boire ? Nous avons un très bon chocolat chaud aujourd'hui.";

/** The tutor's reply streams in word by word, the way Nexconn streaming messages arrive in the app. */
export function TutorDemo() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4 });
  const [words, setWords] = useState(0);
  const total = REPLY.split(" ").length;

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWords(total);
      return;
    }
    let n = 0;
    const start = setTimeout(() => {
      const iv = setInterval(() => {
        n += 1;
        setWords(n);
        if (n >= total) clearInterval(iv);
      }, 95);
      cleanup = () => clearInterval(iv);
    }, 600);
    let cleanup = () => clearTimeout(start);
    return () => cleanup();
  }, [inView, total]);

  const done = words >= total;
  return (
    <div ref={ref} className="rounded-xl border border-line bg-surface shadow-md" aria-label="Example AI tutor conversation in French" role="img">
      <div aria-hidden="true">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white">
            <Bot size={20} />
          </span>
          <div>
            <p className="font-semibold text-ink">Camille (AI French tutor)</p>
            <p className="text-xs text-ink-3">Scene: ordering at a café, A2</p>
          </div>
        </div>
        <div className="flex min-h-[17rem] flex-col gap-2.5 px-4 py-4" lang="fr">
          <div className="max-w-[88%] self-start rounded-2xl rounded-bl-md border border-line bg-paper px-3.5 py-2.5 text-ink">
            {REPLY.split(" ").slice(0, words).join(" ")}
            {!done && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-accent" />}
          </div>
          <div className={`max-w-[80%] self-end rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-white transition-all duration-500 ${done ? "opacity-100" : "translate-y-2 opacity-0"}`}>
            Oui, je voudrais un chocolat chaud, s&apos;il vous plaît.
          </div>
          <div
            className={`max-w-[92%] self-start rounded-xl border border-marker/60 bg-marker-wash px-3.5 py-2.5 transition-all delay-300 duration-500 ${done ? "opacity-100" : "translate-y-2 opacity-0"}`}
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Lightbulb size={13} /> Help me reply
            </p>
            <p className="mt-1 text-sm text-ink-2">
              Try: <span className="font-semibold text-ink">Avec de la crème, s&apos;il vous plaît.</span> (With cream, please.)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
