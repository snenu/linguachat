/**
 * SM-2 spaced repetition (SuperMemo 2, Wozniak 1990).
 * grade: 0-5 (0-2 = forgot, 3 = hard, 4 = good, 5 = easy).
 */
export interface Sm2State {
  ease: number;
  intervalDays: number;
  repetitions: number;
}

export function sm2(state: Sm2State, grade: number): Sm2State {
  const q = Math.max(0, Math.min(5, Math.round(grade)));
  let { ease, intervalDays, repetitions } = state;
  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
  }
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;
  return { ease: Math.round(ease * 100) / 100, intervalDays, repetitions };
}

/** Next due date. A failed card (grade < 3) comes back in 10 minutes in the same session. */
export function nextDue(grade: number, intervalDays: number, now: Date = new Date()): Date {
  if (grade < 3) return new Date(now.getTime() + 10 * 60 * 1000);
  return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
}

export const GRADE_BUTTONS = [
  { grade: 1, label: "Again", hint: "Forgot" },
  { grade: 3, label: "Hard", hint: "Took effort" },
  { grade: 4, label: "Good", hint: "Remembered" },
  { grade: 5, label: "Easy", hint: "Instantly" },
] as const;
