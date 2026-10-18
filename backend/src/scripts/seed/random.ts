export function createRandom(seed = 20260101) {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number): number => Math.floor(next() * (max - min + 1)) + min,
    float: (min: number, max: number, decimals = 2): number => Number((min + next() * (max - min)).toFixed(decimals)),
    pick: <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)]!,
    chance: (probability: number): boolean => next() < probability,
    sample: <T>(list: readonly T[], count: number): T[] => {
      const copy = [...list];
      const out: T[] = [];
      while (copy.length && out.length < count) out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]!);
      return out;
    },
    digits: (length: number): string => Array.from({ length }, () => String(Math.floor(next() * 10))).join(''),
  };
}

export type Random = ReturnType<typeof createRandom>;

export const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 86_400_000);
export const addHours = (date: Date, hours: number): Date => new Date(date.getTime() + hours * 3_600_000);
export const atHour = (date: Date, hour: number, minute = 0): Date => {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
};
