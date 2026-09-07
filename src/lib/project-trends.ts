import { toDateOnlyString } from "@/lib/dates";
import { projectAccent } from "@/lib/entity-colors";

/** Synthetic bucket id for unassigned tasks and every habit check-in. */
export const INBOX_SERIES_ID = "__inbox__";
export const DEFAULT_INBOX_LABEL = "Inbox & habits";

export type TrendDay = {
  date: string;
  label: string;
  fullLabel: string;
  isToday: boolean;
};

export type ProjectTrendSeries = {
  id: string;
  name: string;
  /** Resolved via projectAccent() — never null. */
  color: string;
  logoUrl: string | null;
  iconKey: string | null;
  /** Completions per day, aligned 1:1 with ProjectTrends.days. */
  daily: number[];
  total: number;
  /** Index into `days` of the most recent day with activity, or -1 when silent. */
  lastActiveIndex: number;
};

export type ProjectTrends = {
  days: TrendDay[];
  /** Sorted by total desc, then name. */
  series: ProjectTrendSeries[];
  maxDaily: number;
  maxCumulative: number;
};

export type ProjectTrendInputProject = {
  id: string;
  name: string;
  color: string | null;
  logoUrl: string | null;
  iconKey: string | null;
  status: string;
};

export type ProjectTrendLog = {
  entityType: "TASK" | "DAILY_TASK";
  entityId: string;
  completedOn: Date;
};

export type BuildProjectTrendsInput = {
  days: TrendDay[];
  projects: ProjectTrendInputProject[];
  /** taskId -> projectId (or null for an unassigned task). */
  taskProjectById: Map<string, string | null>;
  logs: ProjectTrendLog[];
  inboxLabel?: string;
};

function lastActiveIndexOf(daily: number[]): number {
  for (let index = daily.length - 1; index >= 0; index -= 1) {
    if (daily[index] > 0) return index;
  }
  return -1;
}

/**
 * Pure shaping function: turns already-fetched projects, tasks, and
 * completion logs into one line per project (plus a synthetic inbox bucket
 * for unassigned tasks and habit check-ins), aligned to a shared day axis.
 *
 * No DB access here — callers fetch the rows (see src/lib/analytics.ts) so
 * this stays testable in the node vitest environment.
 */
export function buildProjectTrends(input: BuildProjectTrendsInput): ProjectTrends {
  const { days, projects, taskProjectById, logs, inboxLabel = DEFAULT_INBOX_LABEL } = input;

  const dayIndexByDate = new Map(days.map((day, index) => [day.date, index]));
  const dailyByBucket = new Map<string, number[]>();

  function bucketFor(id: string): number[] {
    let daily = dailyByBucket.get(id);
    if (!daily) {
      daily = new Array(days.length).fill(0);
      dailyByBucket.set(id, daily);
    }
    return daily;
  }

  for (const log of logs) {
    const dayIndex = dayIndexByDate.get(toDateOnlyString(log.completedOn));
    if (dayIndex === undefined) continue;

    if (log.entityType === "DAILY_TASK") {
      bucketFor(INBOX_SERIES_ID)[dayIndex] += 1;
      continue;
    }

    const projectId = taskProjectById.get(log.entityId) ?? null;
    bucketFor(projectId ?? INBOX_SERIES_ID)[dayIndex] += 1;
  }

  // Every non-DONE project counts, plus any DONE project that still has at
  // least one completion in the window — "almost all the projects" without
  // letting a graveyard of finished work grow the legend forever.
  const includedProjects = projects.filter((project) => {
    if (project.status !== "DONE") return true;
    const daily = dailyByBucket.get(project.id);
    return daily ? daily.some((value) => value > 0) : false;
  });

  const series: ProjectTrendSeries[] = includedProjects.map((project) => {
    const daily = bucketFor(project.id);
    return {
      id: project.id,
      name: project.name,
      color: projectAccent(project),
      logoUrl: project.logoUrl,
      iconKey: project.iconKey,
      daily,
      total: daily.reduce((sum, value) => sum + value, 0),
      lastActiveIndex: lastActiveIndexOf(daily),
    };
  });

  const inboxDaily = bucketFor(INBOX_SERIES_ID);
  series.push({
    id: INBOX_SERIES_ID,
    name: inboxLabel,
    color: "var(--muted-foreground)",
    logoUrl: null,
    iconKey: null,
    daily: inboxDaily,
    total: inboxDaily.reduce((sum, value) => sum + value, 0),
    lastActiveIndex: lastActiveIndexOf(inboxDaily),
  });

  series.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const maxDaily = series.reduce(
    (max, entry) => Math.max(max, ...entry.daily),
    0
  );
  const maxCumulative = series.reduce((max, entry) => {
    let running = 0;
    let peak = 0;
    for (const value of entry.daily) {
      running += value;
      if (running > peak) peak = running;
    }
    return Math.max(max, peak);
  }, 0);

  return { days, series, maxDaily, maxCumulative };
}
