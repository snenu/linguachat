"use client";

import { RotateCw } from "lucide-react";
import { useState } from "react";

/** A spaced-repetition flashcard that turns over when tapped. */
export function FlipCard() {
  const [back, setBack] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setBack((b) => !b)}
      aria-pressed={back}
      aria-label={back ? "Flashcard answer: bought, past tense of buy. Tap to turn back." : "Flashcard: bought. Tap to see the answer."}
      className="group block w-full text-left [perspective:1000px]"
    >
      <span
        className="relative block h-44 transition-transform duration-700 ease-[var(--ease-spring)] [transform-style:preserve-3d]"
        style={{ transform: back ? "rotateY(180deg)" : "none" }}
      >
        <span className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border border-line bg-surface shadow-md [backface-visibility:hidden]">
          <span className="font-pen text-3xl font-semibold text-ink">bought</span>
          <span className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
            <RotateCw size={12} /> Tap to turn over
          </span>
        </span>
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg border border-accent-line bg-accent-wash px-5 text-center shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="text-sm text-ink-3">verb, past tense of buy</span>
          <span className="font-display text-xl font-bold text-ink">खरीदा</span>
          <span className="text-sm text-ink-2 italic">I bought mangoes at the market.</span>
        </span>
      </span>
    </button>
  );
}
