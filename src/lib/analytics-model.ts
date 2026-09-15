/**
 * Pure maths behind the Analytics page. The loader ships one flat list of
 * completion events for the trailing 90 days; the page slices it per range
 * on the client, so switching 7 → 30 → 90 days never refetches.
 */

/** Synthetic series id for tasks that belong to no project. */
export const INBOX_ID = "__inbox__";

export type AnalyticsDay = {
  date: string;
  /** "12 Aug" */
  label: string;
  /** "Wednesday, 12 August" */
  fullLabel: string;
  /** 0 = Sunday. */
  weekday: number;
  isToday: boolean;
};

export type AnalyticsEvent = {
  date: string;
  /** Local hour of completion, null for logs without a timestamp. */
  hour: number | null;
  kind: "task" | "habit";
  projectId: string | null;
  entityId: string;
  minutes: number;
};

export type PeriodDelta = {
  recent: number;
  prior: number;
  /** Percent change, null when the prior period was empty. */
  pct: number | null;
};

/** Per-day counts for the given days, from events matching `keep`. */
export function countsByDay(
  events: AnalyticsEvent[],
  days: AnalyticsDay[],
  keep: (event: AnalyticsEvent) => boolean = () => true
): number[] {
  const index = new Map(days.map((day, position) => [day.date, position]));
  const counts = new Array<number>(days.length).fill(0);
  for (const event of events) {
    const at = index.get(event.date);
    if (at !== undefined && keep(event)) counts[at] += 1;
  }
  return counts;
}

/** Per-day minute totals, same shape as `countsByDay`. */
export function minutesByDay(
  events: AnalyticsEvent[],
  days: AnalyticsDay[],
  keep: (event: AnalyticsEvent) => boolean = () => true
): number[] {
  const index = new Map(days.map((day, position) => [day.date, position]));
  const totals = new Array<number>(days.length).fill(0);
  for (const event of events) {
    const at = index.get(event.date);
    if (at !== undefined && keep(event)) totals[at] += event.minutes;
  }
  return totals;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** The last `half` values against the `half` before them. */
export function periodDelta(values: number[], half: number): PeriodDelta {
  const size = Math.max(1, Math.min(half, Math.floor(values.length / 2)));
  const recent = sum(values.slice(values.length - size));
  const prior = sum(values.slice(values.length - size * 2, values.length - size));
  return {
    recent,
    prior,
    pct: prior === 0 ? null : Math.round(((recent - prior) / prior) * 100),
  };
}

/** Average per weekday (index 0 = Sunday) over the days given. */
export function weekdayAverages(counts: number[], days: AnalyticsDay[]): number[] {
  const totals = new Array<number>(7).fill(0);
  const hits = new Array<number>(7).fill(0);
  days.forEach((day, index) => {
    totals[day.weekday] += counts[index] ?? 0;
    hits[day.weekday] += 1;
  });
  return totals.map((total, weekday) => (hits[weekday] ? total / hits[weekday] : 0));
}

/** Completions per hour of day, averaged per day in the window. */
export function hourProfile(
  events: AnalyticsEvent[],
  days: AnalyticsDay[],
  keep: (event: AnalyticsEvent) => boolean = () => true
): number[] {
  const inRange = new Set(days.map((day) => day.date));
  const totals = new Array<number>(24).fill(0);
  for (const event of events) {
    if (event.hour === null || !inRange.has(event.date) || !keep(event)) continue;
    totals[event.hour] += 1;
  }
  const divisor = Math.max(1, days.length);
  return totals.map((total) => total / divisor);
}

/** Trailing moving average, same length as the input. */
export function movingAverage(values: number[], window = 7): number[] {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - window + 1), index + 1);
    return sum(slice) / slice.length;
  });
}

export function cumulative(values: number[]): number[] {
  let running = 0;
  return values.map((value) => (running += value));
}

/** The longest run of zero days, with where it started. */
export function longestQuietGap(
  counts: number[],
  days: AnalyticsDay[]
): { length: number; from: AnalyticsDay | null } {
  let best = { length: 0, from: null as AnalyticsDay | null };
  let run = 0;
  let runStart = -1;
  counts.forEach((count, index) => {
    if (count === 0) {
      if (run === 0) runStart = index;
      run += 1;
      if (run > best.length) best = { length: run, from: days[runStart] ?? null };
    } else {
      run = 0;
    }
  });
  return best;
}

/** Whole-number grid ceiling: four steps that land exactly on their labels. */
export function gridTop(max: number): { top: number; step: number } {
  const raw = Math.max(1, max);
  let step = Math.ceil(raw / 4);
  if (step > 4) step = Math.ceil(step / 2) * 2;
  return { top: step * 4, step };
}

/** The busiest contiguous two-hour window, as [startHour, endHourExclusive]. */
export function peakWindow(profile: number[], width = 2): [number, number] | null {
  if (profile.every((value) => value === 0)) return null;
  let best = 0;
  let bestSum = -1;
  for (let start = 0; start + width <= profile.length; start += 1) {
    const total = sum(profile.slice(start, start + width));
    if (total > bestSum) {
      bestSum = total;
      best = start;
    }
  }
  return [best, best + width];
}

export function hourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}
