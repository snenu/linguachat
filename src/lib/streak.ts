import { addDays } from "./day";

/**
 * Current streak: consecutive days (ending today or yesterday) on which the learner met their
 * daily target. Today only counts once the goal is met; an unfinished today keeps the streak alive.
 */
export function currentStreak(countsByDay: Map<string, number>, today: string, target: number): number {
  let day = today;
  if ((countsByDay.get(day) ?? 0) < target) day = addDays(day, -1);
  let streak = 0;
  while ((countsByDay.get(day) ?? 0) >= target) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function longestStreak(countsByDay: Map<string, number>, target: number): number {
  const days = [...countsByDay.entries()]
    .filter(([, c]) => c >= target)
    .map(([d]) => d)
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
