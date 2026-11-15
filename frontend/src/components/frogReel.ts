// Pure maths for the reel. The strip holds REPEATS copies of the entry list; strip row `r`
// shows entry `r % count`.
export const REPEATS = 5;

// A random index in [0, count), never `previous` (unless there is only one entry).
// `random` returns a number in [0, 1), like Math.random; tests pass a fixed one.
export function pickNextIndex(count: number, previous: number, random: () => number = Math.random): number {
  if (!Number.isInteger(count) || count < 1) throw new RangeError(`count must be a positive integer, got ${count}`);
  if (count === 1) return 0;
  // Choose among the other count - 1 entries, then step over `previous`. The clamp guards a
  // random() that returns exactly 1 (or a negative value), which Math.random never does.
  const choice = Math.max(0, Math.min(Math.floor(random() * (count - 1)), count - 2));
  return choice >= previous ? choice + 1 : choice;
}

// At rest the entry sits in copy 1, so there is always a row above it.
export const restingOffset = (index: number, count: number) => count + index;

// Every spin lands in copy REPEATS - 2: more than one full turn past any resting row,
// with a whole copy still below it.
export const spinOffset = (index: number, count: number) => count * (REPEATS - 2) + index;
