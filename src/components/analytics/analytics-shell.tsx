"use client";

import * as React from "react";
import { subDays } from "date-fns";
import { EntityAvatar, InboxAvatar } from "@/components/ui/entity-avatar";
import {
  countsByDay,
  cumulative,
  gridTop,
  hourLabel,
  hourProfile,
  longestQuietGap,
  minutesByDay,
  movingAverage,
  peakWindow,
  periodDelta,
  sum,
  weekdayAverages,
  INBOX_ID,
  type AnalyticsDay,
  type AnalyticsEvent,
} from "@/lib/analytics-model";
import type { AnalyticsData, AnalyticsHabit } from "@/lib/analytics";
import { smoothPath } from "@/lib/chart-path";
import { consistency, currentChain, strip, type StripCell } from "@/lib/habit-stats";
import { useDisplayDay } from "@/lib/hydration";
import { formatFocusHours } from "@/lib/today-insights";
import { cn } from "@/lib/utils";
import { useWeekStart, weekdayOrder } from "@/lib/week-start";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];
const CHART_W = 720;
const CHART_H = 190;
const MAX_LINES = 6;
const HABIT_GRID_DAYS = 21;
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const WEEKDAY_ONE = ["S", "M", "T", "W", "T", "F", "S"];

type Series = {
  id: string;
  name: string;
  color: string;
  logoUrl?: string | null;
  iconKey?: string | null;
  counts: number[];
  total: number;
};

function curve(values: number[], top: number, width = CHART_W, height = CHART_H) {
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => ({
    x: +(index * step).toFixed(1),
    y: +(height - (value / top) * height).toFixed(1),
  }));
  if (points.length === 1) return { path: `M0 ${points[0].y} L${width} ${points[0].y}`, points };
  return { path: smoothPath(points, 0.9), points };
}

function sparkPath(values: number[]) {
  const width = 66;
  const height = 22;
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => ({
    x: +((index / Math.max(1, values.length - 1)) * width).toFixed(1),
    y: +(height - 2.5 - (value / max) * (height - 5)).toFixed(1),
  }));
  return points.length > 1 ? smoothPath(points, 0.9) : "";
}

function deltaPill(pct: number | null, suffix = "") {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums",
        up ? "bg-done-wash text-done" : "bg-destructive-wash text-destructive"
      )}
    >
      {up ? "+" : "−"}
      {Math.abs(pct)}
      {suffix}
    </span>
  );
}

function habitLike(habit: AnalyticsHabit) {
  return {
    id: habit.id,
    weekdays: habit.weekdays,
    createdAt: new Date(habit.createdAtISO),
    isActive: habit.isActive,
  };
}

function rateColor(rate: number | null) {
  if (rate === null) return "var(--faint)";
  if (rate >= 80) return "var(--done)";
  if (rate >= 55) return "var(--muted-foreground)";
  return "var(--destructive)";
}

export function AnalyticsShell({ data }: { data: AnalyticsData }) {
  const { today } = useDisplayDay(data.todayISO);
  const weekStartsOn = useWeekStart();
  const [range, setRange] = React.useState<Range>(30);
  const [scope, setScope] = React.useState<string>("all");
  const [mode, setMode] = React.useState<"total" | "lines">("total");
  const [cumul, setCumul] = React.useState(false);
  const [focus, setFocus] = React.useState<string | null>(null);
  const [hover, setHover] = React.useState<number | null>(null);
  const [weekdayHover, setWeekdayHover] = React.useState<number | null>(null);
  const [hourHover, setHourHover] = React.useState<number | null>(null);
  const gradientId = React.useId();

  const days = React.useMemo(() => data.days.slice(-range), [data.days, range]);
  const priorDays = React.useMemo(() => data.days.slice(-range * 2, -range), [data.days, range]);
  const inRange = React.useMemo(() => new Set(days.map((day) => day.date)), [days]);
  const events = React.useMemo(
    () => data.events.filter((event) => inRange.has(event.date)),
    [data.events, inRange]
  );
  const isTask = (event: AnalyticsEvent) => event.kind === "task";

  // ── Headline ────────────────────────────────────────────────────────────
  const taskCounts = React.useMemo(() => countsByDay(events, days, isTask), [events, days]);
  const priorTaskCounts = React.useMemo(
    () => countsByDay(data.events, priorDays, isTask),
    [data.events, priorDays]
  );
  const tasksClosed = sum(taskCounts);
  const priorClosed = sum(priorTaskCounts);
  const tasksDeltaPct = priorClosed === 0 ? null : Math.round(((tasksClosed - priorClosed) / priorClosed) * 100);
  const focusMinutes = sum(minutesByDay(events, days, isTask));
  const priorFocus = sum(minutesByDay(data.events, priorDays, isTask));
  const focusDeltaPct = priorFocus === 0 ? null : Math.round(((focusMinutes - priorFocus) / priorFocus) * 100);
  const activeDays = taskCounts.filter((count) => count > 0).length;
  const priorActiveDays = priorTaskCounts.filter((count) => count > 0).length;

  const habitRates = React.useMemo(() => {
    const active = data.habits.filter((habit) => habit.isActive);
    return active.map((habit) => {
      const keys = new Set(habit.completedOn);
      const like = habitLike(habit);
      return {
        habit,
        keys,
        like,
        rate: consistency(like, keys, today, range).rate,
        priorRate: consistency(like, keys, subDays(today, range), range).rate,
        chain: currentChain(like, keys, today),
      };
    });
  }, [data.habits, today, range]);
  const rated = habitRates.filter((entry) => entry.rate !== null);
  const habitsKept = rated.length ? Math.round(sum(rated.map((entry) => entry.rate ?? 0)) / rated.length) : null;
  const priorRated = habitRates.filter((entry) => entry.priorRate !== null);
  const priorHabitsKept = priorRated.length
    ? Math.round(sum(priorRated.map((entry) => entry.priorRate ?? 0)) / priorRated.length)
    : null;
  const habitsDelta = habitsKept === null || priorHabitsKept === null ? null : habitsKept - priorHabitsKept;
  const slipping = rated.length ? rated.reduce((worst, entry) => ((entry.rate ?? 0) < (worst.rate ?? 0) ? entry : worst)) : null;

  const weekdayAvg = React.useMemo(() => weekdayAverages(taskCounts, days), [taskCounts, days]);
  const weekdayOrdered = weekdayOrder(weekStartsOn);
  const bestWeekday = weekdayOrdered.reduce((best, weekday) => (weekdayAvg[weekday] > weekdayAvg[best] ? weekday : best), weekdayOrdered[0]);
  const worstWeekday = weekdayOrdered.reduce((worst, weekday) => (weekdayAvg[weekday] < weekdayAvg[worst] ? weekday : worst), weekdayOrdered[0]);
  const weekdayMax = Math.max(0.0001, ...weekdayAvg);
  const weekdayMin = Math.min(...weekdayAvg);

  const hours = React.useMemo(() => hourProfile(events, days, isTask), [events, days]);
  const hourMax = Math.max(0.0001, ...hours);
  const peak = peakWindow(hours);
  const focusByHour = React.useMemo(() => {
    const totals = new Array<number>(24).fill(0);
    for (const event of events) {
      if (event.hour !== null && event.kind === "task") totals[event.hour] += event.minutes;
    }
    return totals;
  }, [events]);
  const focusPeak = peakWindow(focusByHour);
  const clockMax = Math.max(1, ...focusByHour);
  const quiet = longestQuietGap(taskCounts, days);

  const lede = `You closed ${tasksClosed} ${tasksClosed === 1 ? "task" : "tasks"} in the last ${range} days${
    habitsKept === null ? "" : `, kept ${habitsKept}% of your habits`
  }, and logged ${formatFocusHours(focusMinutes)} of focus.`;

  // ── Project rhythm ──────────────────────────────────────────────────────
  const series = React.useMemo<Series[]>(() => {
    const all = [
      ...data.projects.map((project) => ({
        id: project.id,
        name: project.name,
        color: project.color,
        logoUrl: project.logoUrl,
        iconKey: project.iconKey,
        counts: countsByDay(events, days, (event) => event.kind === "task" && event.projectId === project.id),
      })),
      {
        id: INBOX_ID,
        name: "Inbox",
        color: "var(--faint)",
        counts: countsByDay(events, days, (event) => event.kind === "task" && event.projectId === null),
      },
    ].map((entry) => ({ ...entry, total: sum(entry.counts) }));
    return all.filter((entry) => entry.total > 0).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [data.projects, events, days]);
  const scoped = scope === "all" ? series : series.filter((entry) => entry.id === scope);
  const effectiveMode = scope === "all" ? mode : "total";
  const lineSeries = effectiveMode === "lines" ? scoped.slice(0, MAX_LINES) : [];
  const dailyTotals = scoped.length ? days.map((_, index) => sum(scoped.map((entry) => entry.counts[index]))) : taskCounts.map(() => 0);
  const shown = cumul ? cumulative(dailyTotals) : dailyTotals;
  const perMax = Math.max(1, ...lineSeries.flatMap((entry) => (cumul ? cumulative(entry.counts) : entry.counts)));
  const { top, step: gridStep } = gridTop(effectiveMode === "lines" ? perMax : Math.max(...shown, 1));
  const totalCurve = curve(shown, top);
  const average = movingAverage(dailyTotals, 7);
  const avgCurve = curve(cumul ? shown : average, top);
  const lines = lineSeries.map((entry) => {
    const values = cumul ? cumulative(entry.counts) : entry.counts;
    return { ...entry, values, curve: curve(values, top) };
  });
  const rhythmTotal = sum(dailyTotals);
  const rhythmActive = dailyTotals.filter((count) => count > 0).length;
  const peakIndex = dailyTotals.indexOf(Math.max(...dailyTotals));
  const half = Math.min(7, Math.floor(range / 2));
  const rhythmDelta = periodDelta(dailyTotals, half);
  const scopeName = scope === "all" ? "Project rhythm" : (series.find((entry) => entry.id === scope)?.name ?? "Project rhythm");
  const lineColor = scope === "all" ? "var(--signal)" : (scoped[0]?.color ?? "var(--signal)");
  const hoverIndex = hover !== null && hover < days.length ? hover : null;
  const hoverRows =
    hoverIndex === null
      ? []
      : (effectiveMode === "lines" ? lines.map((entry) => ({ ...entry, value: entry.values[hoverIndex] })) : scoped.map((entry) => ({ ...entry, value: (cumul ? cumulative(entry.counts) : entry.counts)[hoverIndex] })))
          .filter((entry) => entry.value > 0 || effectiveMode === "lines")
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
  const ticks = days.filter((_, index) => index % Math.max(1, Math.ceil(days.length / 5)) === 0 || index === days.length - 1);

  // ── Time split & progress ───────────────────────────────────────────────
  const timeSplit = React.useMemo(() => {
    const rows = [
      ...data.projects.map((project) => ({
        id: project.id,
        name: project.name,
        color: project.color,
        logoUrl: project.logoUrl as string | null,
        iconKey: project.iconKey as string | null,
        minutes: sum(minutesByDay(events, days, (event) => event.kind === "task" && event.projectId === project.id)),
      })),
      {
        id: INBOX_ID,
        name: "Inbox",
        color: "var(--faint)",
        logoUrl: null,
        iconKey: null,
        minutes: sum(minutesByDay(events, days, (event) => event.kind === "task" && event.projectId === null)),
      },
    ].filter((row) => row.minutes > 0);
    return rows.sort((a, b) => b.minutes - a.minutes);
  }, [data.projects, events, days]);
  const timeMax = Math.max(1, ...timeSplit.map((row) => row.minutes));
  const progressRows = [...data.projects]
    .filter((project) => project.openCount + project.doneCount > 0)
    .map((project) => ({
      ...project,
      pct: Math.round((project.doneCount / (project.openCount + project.doneCount)) * 100),
    }))
    .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));

  // ── Habit grid ──────────────────────────────────────────────────────────
  const gridDays = data.days.slice(-HABIT_GRID_DAYS);
  const habitRows = data.habits
    .filter((habit) => habit.isActive)
    .map((habit) => {
      const keys = new Set(habit.completedOn);
      const like = habitLike(habit);
      const stats = consistency(like, keys, today, range);
      return {
        habit,
        cells: strip(like, keys, today, HABIT_GRID_DAYS),
        chain: currentChain(like, keys, today),
        rate: stats.rate,
        sched:
          habit.weekdays.length === 7
            ? "Every day"
            : habit.weekdays.length === 5 && [1, 2, 3, 4, 5].every((d) => habit.weekdays.includes(d))
              ? "Weekdays"
              : `${habit.weekdays.length}× a week`,
      };
    });
  const gridRated = habitRows.filter((row) => row.rate !== null);
  const gridAvg = gridRated.length ? Math.round(sum(gridRated.map((row) => row.rate ?? 0)) / gridRated.length) : null;

  const weekdayNote =
    weekdayHover !== null
      ? `${WEEKDAY_FULL[weekdayHover]} average ${weekdayAvg[weekdayHover].toFixed(1)} closed · ${
          weekdayHover === bestWeekday
            ? "your best day of the week"
            : `${Math.round((weekdayAvg[weekdayHover] / weekdayMax) * 100)}% of your ${WEEKDAY_SHORT[bestWeekday]} pace`
        }`
      : tasksClosed === 0
        ? "Nothing closed in this range yet."
        : `${WEEKDAY_FULL[bestWeekday].replace(/s$/, "")} is your strongest day; ${WEEKDAY_FULL[worstWeekday].replace(/s$/, "")} is your quietest — and that is fine.`;
  const hourNote =
    hourHover !== null
      ? `${hourLabel(hourHover)} · ${hours[hourHover].toFixed(1)} tasks closed on an average day${hours[hourHover] === 0 ? " — quiet" : ""}`
      : peak
        ? `Most of the closing happens ${hourLabel(peak[0])}–${hourLabel(peak[1])}.`
        : "No timed completions in this range yet.";

  return (
    <div className="page-gutter animate-dh-fade pt-[clamp(18px,2.4vw,26px)] pb-12">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">Last {range} days</div>
            <h1 className="mt-[7px] text-[clamp(1.6rem,3.4vw,1.875rem)] leading-[1.1] tracking-[-0.035em]">Looking back</h1>
            <p className="mt-[7px] max-w-[56ch] text-[14px] text-muted-foreground text-pretty">{lede}</p>
          </div>
          <Segmented
            options={RANGES.map((value) => ({ value, label: `${value} days` }))}
            value={range}
            onChange={(next) => {
              setRange(next);
              setHover(null);
            }}
            ariaLabel="Range"
            size="lg"
          />
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Tasks closed"
            value={String(tasksClosed)}
            unit="tasks"
            delta={deltaPill(tasksDeltaPct, "%")}
            hint={
              tasksClosed === 0
                ? "Nothing closed in this range yet"
                : `${WEEKDAY_FULL[bestWeekday]} are your strongest — ${weekdayAvg[bestWeekday].toFixed(1)} a day`
            }
          >
            <span className="flex h-full items-end gap-1">
              {weekdayOrdered.map((weekday) => {
                const spread = weekdayMax - weekdayMin || 1;
                return (
                  <span key={weekday} className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className="w-full rounded-[3px]"
                      style={{
                        height: `${Math.round(7 + ((weekdayAvg[weekday] - weekdayMin) / spread) * 22)}px`,
                        backgroundColor: weekday === bestWeekday && tasksClosed > 0 ? "var(--signal)" : "var(--border-strong)",
                      }}
                    />
                    <span className={cn("text-[10px]", weekday === bestWeekday ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                      {WEEKDAY_ONE[weekday]}
                    </span>
                  </span>
                );
              })}
            </span>
          </StatCard>
          <StatCard
            label="Habits kept"
            value={habitsKept === null ? "—" : String(habitsKept)}
            unit={habitsKept === null ? "" : "%"}
            delta={deltaPill(habitsDelta, " pts")}
            hint={
              habitRates.length === 0
                ? "No active habits yet"
                : `${habitRates.length} ${habitRates.length === 1 ? "habit" : "habits"} × 7 days${slipping && (slipping.rate ?? 100) < 80 ? ` · ${slipping.habit.title} is the one slipping` : ""}`
            }
          >
            <span className="grid w-[74px] gap-[3px]" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
              {habitRates.slice(0, 6).flatMap((entry) =>
                strip(entry.like, entry.keys, today, 7).map((cell, index) => (
                  <span
                    key={`${entry.habit.id}-${index}`}
                    className="h-1 rounded-[1.5px]"
                    style={{
                      backgroundColor:
                        cell === "kept" || cell === "today-done"
                          ? `color-mix(in srgb, ${entry.habit.color} 60%, var(--card))`
                          : "var(--hover)",
                    }}
                  />
                ))
              )}
            </span>
          </StatCard>
          <StatCard
            label="Focus logged"
            value={formatFocusHours(focusMinutes).replace(/h$/, "")}
            unit={focusMinutes < 60 && focusMinutes > 0 ? "" : "hours"}
            delta={deltaPill(focusDeltaPct, "%")}
            hint={
              focusPeak && focusMinutes > 0
                ? `Deep work lands ${hourLabel(focusPeak[0])}–${hourLabel(focusPeak[1])} · midnight to midnight`
                : "Add estimates to tasks to see where focus lands"
            }
          >
            <span className="flex h-full items-end gap-[2px] pb-[11px]">
              {focusByHour.map((value, hourAt) => {
                const isPeak = focusPeak !== null && hourAt >= focusPeak[0] && hourAt < focusPeak[1] && value > 0;
                return (
                  <span
                    key={hourAt}
                    className="flex-1 rounded-t-[2px] rounded-b-[1px]"
                    style={{
                      height: `${Math.max(3, Math.round((value / clockMax) * 30))}px`,
                      backgroundColor: isPeak ? "var(--chart-ink)" : "var(--border-strong)",
                    }}
                  />
                );
              })}
            </span>
          </StatCard>
          <StatCard
            label="Active days"
            value={String(activeDays)}
            unit={`of last ${range}`}
            delta={
              priorActiveDays === activeDays ? null : (
                <span
                  className={cn(
                    "rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums",
                    activeDays > priorActiveDays ? "bg-done-wash text-done" : "bg-destructive-wash text-destructive"
                  )}
                >
                  {activeDays > priorActiveDays ? "+" : "−"}
                  {Math.abs(activeDays - priorActiveDays)}
                </span>
              )
            }
            hint={
              quiet.length > 1 && quiet.from
                ? `Longest quiet gap ${quiet.length} days, from ${quiet.from.label}`
                : activeDays === days.length
                  ? "Something closed every single day"
                  : "No quiet stretch longer than a day"
            }
          >
            <span className="grid w-full gap-[3px]" style={{ gridTemplateColumns: `repeat(${range === 7 ? 7 : 10}, 1fr)` }}>
              {taskCounts.slice(-30).map((count, index) => (
                <span
                  key={index}
                  className="h-[9px] rounded-[2px]"
                  style={{
                    backgroundColor:
                      count === 0
                        ? "var(--rule-soft)"
                        : count <= 2
                          ? "color-mix(in srgb, var(--signal) 28%, var(--card))"
                          : count <= 5
                            ? "color-mix(in srgb, var(--signal) 58%, var(--card))"
                            : "var(--signal)",
                  }}
                />
              ))}
            </span>
          </StatCard>
        </div>

        <section className="rounded-[12px] border border-border bg-card shadow-raised">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule-soft px-[18px] pt-[15px] pb-[13px]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-[9px]">
                <h2 className="text-[15px] tracking-[-0.01em]">{scopeName}</h2>
                {rhythmDelta.pct !== null ? (
                  <span
                    className={cn(
                      "rounded-[5px] px-[7px] py-0.5 text-[10.5px] font-semibold tabular-nums",
                      rhythmDelta.pct >= 0 ? "bg-done-wash text-done" : "bg-destructive-wash text-destructive"
                    )}
                  >
                    {rhythmDelta.pct >= 0 ? "▲" : "▼"} {Math.abs(rhythmDelta.pct)}% vs prior {half} days
                  </span>
                ) : null}
              </div>
              <p className="mt-[5px] text-[12px] text-muted-foreground">
                {scope === "all" ? `${series.length} ${series.length === 1 ? "project" : "projects"}` : "Single project"} ·{" "}
                {cumul ? "cumulative completions" : "completions per day"} · {rhythmTotal} in {range} days
              </p>
            </div>
            <div className="flex flex-none flex-wrap items-center gap-2">
              <Segmented
                options={[
                  { value: "daily", label: "Daily" },
                  { value: "cumulative", label: "Cumulative" },
                ]}
                value={cumul ? "cumulative" : "daily"}
                onChange={(next) => setCumul(next === "cumulative")}
                ariaLabel="Daily or cumulative"
              />
              <Segmented
                options={[
                  { value: "total", label: "Total" },
                  { value: "lines", label: "By project", disabled: scope !== "all", title: "Pick All projects to compare every line" },
                ]}
                value={effectiveMode}
                onChange={(next) => setMode(next)}
                ariaLabel="Total or by project"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_244px]">
            <div className="flex gap-3 px-5 pt-[18px] pb-3.5">
              <div className="relative w-5 shrink-0 text-right text-[10.5px] text-faint tabular-nums" style={{ height: CHART_H }}>
                {Array.from({ length: 5 }, (_, index) => top - index * gridStep).map((value, index) => (
                  <span key={value} className="absolute right-0 -translate-y-1/2" style={{ top: `${(index / 4) * 100}%` }}>
                    {value}
                  </span>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="relative">
                  <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="block w-full overflow-visible" style={{ height: CHART_H }} aria-hidden>
                    <defs>
                      <linearGradient id={`${gradientId}-total`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity="0.26" />
                        <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
                      </linearGradient>
                      {lines.map((entry) => (
                        <linearGradient key={entry.id} id={`${gradientId}-${entry.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={entry.color} stopOpacity="0.4" />
                          <stop offset="100%" stopColor={entry.color} stopOpacity="0.02" />
                        </linearGradient>
                      ))}
                    </defs>
                    {Array.from({ length: 5 }, (_, index) => (index / 4) * CHART_H).map((y) => (
                      <line key={y} x1="0" x2={CHART_W} y1={y} y2={y} stroke="var(--rule-soft)" strokeWidth="1" strokeDasharray="4 4" />
                    ))}
                    {effectiveMode === "lines" ? (
                      lines.map((entry) => {
                        const dim = focus !== null && focus !== entry.id;
                        const last = entry.curve.points[entry.curve.points.length - 1];
                        return (
                          <g key={entry.id} style={{ opacity: dim ? 0.22 : 1, transition: "opacity 150ms" }}>
                            <path d={`${entry.curve.path} L${CHART_W},${CHART_H} L0,${CHART_H} Z`} fill={`url(#${gradientId}-${entry.id})`} fillOpacity={focus === entry.id ? 0.5 : 0.28} />
                            <path d={entry.curve.path} fill="none" stroke={entry.color} strokeWidth={focus === entry.id ? 2.6 : 2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                            {last && !dim ? <circle cx={last.x} cy={last.y} r={3} fill={entry.color} stroke="var(--card)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" /> : null}
                          </g>
                        );
                      })
                    ) : (
                      <g>
                        <path d={`${totalCurve.path} L${CHART_W},${CHART_H} L0,${CHART_H} Z`} fill={`url(#${gradientId}-total)`} />
                        {!cumul ? (
                          <path d={avgCurve.path} fill="none" stroke="var(--hairline)" strokeWidth={1.6} strokeDasharray="5 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                        ) : null}
                        <path d={totalCurve.path} fill="none" stroke={lineColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                      </g>
                    )}
                    {hoverIndex !== null ? (
                      <g>
                        <line x1={totalCurve.points[hoverIndex]?.x ?? 0} x2={totalCurve.points[hoverIndex]?.x ?? 0} y1="0" y2={CHART_H} stroke="var(--foreground)" strokeOpacity="0.22" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        {effectiveMode === "lines"
                          ? lines
                              .filter((entry) => !(focus !== null && focus !== entry.id))
                              .map((entry) => (
                                <circle key={entry.id} cx={entry.curve.points[hoverIndex]?.x ?? 0} cy={entry.curve.points[hoverIndex]?.y ?? 0} r={3.6} fill="var(--card)" stroke={entry.color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                              ))
                          : <circle cx={totalCurve.points[hoverIndex]?.x ?? 0} cy={totalCurve.points[hoverIndex]?.y ?? 0} r={4.5} fill="var(--card)" stroke={lineColor} strokeWidth={2.2} vectorEffect="non-scaling-stroke" />}
                      </g>
                    ) : null}
                  </svg>
                  {effectiveMode === "total" && !hoverIndex && totalCurve.points.length ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{
                        left: "100%",
                        top: `${((totalCurve.points[totalCurve.points.length - 1]?.y ?? 0) / CHART_H) * 100}%`,
                        backgroundColor: lineColor,
                      }}
                    />
                  ) : null}
                  <div
                    className="absolute inset-0 cursor-crosshair"
                    onMouseMove={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      const fraction = (event.clientX - rect.left) / Math.max(1, rect.width);
                      setHover(Math.max(0, Math.min(days.length - 1, Math.round(fraction * (days.length - 1)))));
                    }}
                    onMouseLeave={() => setHover(null)}
                  />
                  {hoverIndex !== null ? (
                    <div
                      className="pointer-events-none absolute -top-1.5 z-10 min-w-[172px] rounded-[10px] border border-border bg-card px-3 py-2.5 shadow-float"
                      style={{
                        left: `${(hoverIndex / Math.max(1, days.length - 1)) * 100}%`,
                        transform:
                          hoverIndex / Math.max(1, days.length - 1) < 0.16
                            ? "translateX(-12px)"
                            : hoverIndex / Math.max(1, days.length - 1) > 0.84
                              ? "translateX(-100%) translateX(12px)"
                              : "translateX(-50%)",
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-2.5">
                        <span className="text-[11.5px] font-semibold text-foreground">{days[hoverIndex].fullLabel}</span>
                        <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground tabular-nums">{shown[hoverIndex]}</span>
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-muted-foreground tabular-nums">
                        {cumul ? "cumulative to date" : `${average[hoverIndex].toFixed(1)} avg (7d)`}
                      </div>
                      {hoverRows.length ? (
                        <div className="mt-2 flex flex-col gap-1 border-t border-rule-soft pt-2">
                          {hoverRows.map((row) => (
                            <span key={row.id} className="flex items-center gap-[7px] text-[11.5px] text-muted-foreground">
                              <span className="h-[7px] w-[7px] shrink-0 rounded-[2px]" style={{ backgroundColor: row.color }} />
                              <span className="min-w-0 flex-1 truncate">{row.name}</span>
                              <span className="font-semibold text-foreground tabular-nums">{row.value}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="h-px bg-border" />
                <div className="mt-2 flex justify-between text-[10.5px] text-muted-foreground tabular-nums">
                  {ticks.map((day) => (
                    <span key={day.date}>{day.isToday ? "Today" : day.label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex max-h-[290px] flex-col gap-0.5 overflow-y-auto border-t border-rule-soft px-3.5 pt-4 pb-3.5 lg:border-t-0 lg:border-l">
              <div className="flex items-baseline justify-between px-2 pb-2">
                <span className="text-[10px] font-bold tracking-[0.075em] text-muted-foreground uppercase">Projects</span>
                <span className="text-[10.5px] text-faint">
                  {effectiveMode === "lines" ? `Showing ${lines.length} of ${series.length}` : scope === "all" ? `${series.length} active` : "1 of " + series.length}
                </span>
              </div>
              {[{ id: "all", name: "All projects", color: "var(--faint)", counts: taskCounts, total: tasksClosed } as Series, ...series].map((entry) => {
                const on = scope === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setScope(entry.id);
                      setHover(null);
                    }}
                    onMouseEnter={() => setFocus(entry.id === "all" ? null : entry.id)}
                    onMouseLeave={() => setFocus(null)}
                    className={cn(
                      "flex items-center gap-[9px] rounded-[8px] px-2 py-1.5 text-left transition-colors duration-[130ms] hover:bg-canvas-sunk",
                      on && "bg-signal-soft shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--signal)_25%,transparent)]"
                    )}
                  >
                    {entry.id === "all" ? (
                      <span className="h-[18px] w-[18px] shrink-0 rounded-[5px] bg-foreground" />
                    ) : entry.id === INBOX_ID ? (
                      <InboxAvatar size={18} />
                    ) : (
                      <EntityAvatar name={entry.name} color={entry.color} logoUrl={entry.logoUrl} iconKey={entry.iconKey} size={18} />
                    )}
                    <span className={cn("min-w-0 flex-1 truncate text-[12px] text-foreground", on ? "font-semibold" : "font-medium")}>{entry.name}</span>
                    <svg width="66" height="22" viewBox="0 0 66 22" fill="none" className="shrink-0" style={{ opacity: focus !== null && focus !== entry.id ? 0.3 : 1 }} aria-hidden>
                      <path d={sparkPath(cumul ? cumulative(entry.counts) : entry.counts)} stroke={entry.color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="w-6 text-right text-[11.5px] text-muted-foreground tabular-nums">{entry.total}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule-soft px-[18px] py-[11px] text-[11.5px] text-muted-foreground tabular-nums">
            <span>
              {rhythmTotal} closed · active on {rhythmActive} of {range} days
            </span>
            <span className="text-faint">
              {rhythmTotal > 0 && peakIndex >= 0 ? `Peak ${dailyTotals[peakIndex]} on ${days[peakIndex].fullLabel}` : "No peak yet"}
            </span>
          </div>
        </section>

        <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className="flex flex-col rounded-[12px] border border-border bg-card shadow-raised">
            <div className="flex items-center justify-between border-b border-rule-soft px-[18px] py-[15px]">
              <h2 className="text-[15px] tracking-[-0.01em]">Where the time went</h2>
              <span className="text-[11.5px] text-faint">Last {range} days</span>
            </div>
            <div className="flex h-[290px] flex-col gap-3.5 overflow-y-auto p-[18px]">
              {timeSplit.length === 0 ? (
                <p className="text-[13px] text-faint">No focus logged in this range. Estimates on finished tasks land here.</p>
              ) : (
                timeSplit.map((row) => (
                  <div key={row.id}>
                    <div className="mb-[7px] flex items-center gap-[9px]">
                      {row.id === INBOX_ID ? (
                        <InboxAvatar size={18} />
                      ) : (
                        <EntityAvatar name={row.name} color={row.color} logoUrl={row.logoUrl} iconKey={row.iconKey} size={18} />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{row.name}</span>
                      <span className="text-[12.5px] font-semibold tabular-nums">{formatFocusHours(row.minutes)}</span>
                      <span className="w-[38px] text-right text-[11.5px] text-faint tabular-nums">
                        {focusMinutes > 0 ? `${Math.round((row.minutes / focusMinutes) * 100)}%` : ""}
                      </span>
                    </div>
                    <span className="block h-2 overflow-hidden rounded-full bg-track">
                      <span className="block h-full rounded-full" style={{ width: `${Math.round((row.minutes / timeMax) * 100)}%`, backgroundColor: row.color }} />
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="flex flex-col rounded-[12px] border border-border bg-card shadow-raised">
            <div className="flex items-center justify-between border-b border-rule-soft px-[18px] py-[15px]">
              <h2 className="text-[15px] tracking-[-0.01em]">Project progress</h2>
              <span className="text-[11.5px] text-faint">open / done</span>
            </div>
            <div className="h-[290px] overflow-y-auto pt-1.5 pb-2.5">
              {progressRows.length === 0 ? (
                <p className="px-[18px] py-3 text-[13px] text-faint">No projects with tasks yet.</p>
              ) : (
                progressRows.map((project) => (
                  <div key={project.id} className="flex items-center gap-3 px-[18px] py-[9px] transition-colors hover:bg-canvas-sunk">
                    <EntityAvatar name={project.name} color={project.color} logoUrl={project.logoUrl} iconKey={project.iconKey} size={24} />
                    <span className="w-[132px] min-w-0 truncate text-[13px] font-medium">{project.name}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                      <span className="block h-full rounded-full" style={{ width: `${project.pct}%`, backgroundColor: project.color }} />
                    </span>
                    <span className="w-[70px] text-right text-[11.5px] text-faint tabular-nums">
                      {project.openCount} / {project.doneCount}
                    </span>
                    <span className="w-[34px] text-right text-[12.5px] font-semibold tabular-nums">{project.pct}%</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[12px] border border-border bg-card shadow-raised">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule-soft px-[18px] pt-[15px] pb-[13px]">
            <div>
              <h2 className="text-[15px] tracking-[-0.01em]">Habit consistency</h2>
              <p className="mt-[5px] text-[12px] text-muted-foreground">One cell per day, last column is today. Hollow dashes are scheduled off-days.</p>
            </div>
            <span className="flex-none text-[11.5px] text-muted-foreground tabular-nums">
              {gridDays[0]?.label} → today
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="flex min-w-[720px] flex-col px-[18px] pt-3.5 pb-1.5">
              <div className="flex items-center gap-3.5 pb-[7px]">
                <span className="w-[174px] flex-none text-[10px] font-bold tracking-[0.075em] text-faint uppercase">Habit</span>
                <span className="flex flex-1 gap-1">
                  {gridDays.map((day) => (
                    <span
                      key={day.date}
                      className={cn(
                        "flex-1 text-center text-[9.5px]",
                        day.isToday ? "font-bold text-foreground" : day.weekday === 0 || day.weekday === 6 ? "font-medium text-faint" : "font-medium text-muted-foreground"
                      )}
                    >
                      {WEEKDAY_ONE[day.weekday]}
                    </span>
                  ))}
                </span>
                <span className="w-24 flex-none text-right text-[10px] font-bold tracking-[0.075em] text-faint uppercase">Rate</span>
              </div>
              {habitRows.length === 0 ? (
                <p className="py-4 text-[13px] text-faint">No active habits yet.</p>
              ) : (
                habitRows.map((row) => (
                  <div key={row.habit.id} className="flex items-center gap-3.5 border-t border-rule-soft py-[7px] transition-colors hover:bg-canvas-sunk/60">
                    <span className="flex w-[174px] min-w-0 flex-none items-center gap-[9px]">
                      <EntityAvatar
                        name={row.habit.title}
                        logoUrl={row.habit.logoUrl}
                        iconKey={row.habit.iconKey}
                        size={22}
                        className="flex-none"
                      />
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className="truncate text-[12.5px] font-medium">{row.habit.title}</span>
                        <span className="text-[10px] text-faint">{row.sched}</span>
                      </span>
                    </span>
                    <span className="flex flex-1 items-center gap-1">
                      {row.cells.map((cell, index) => (
                        <HabitCell key={index} cell={cell} color={row.habit.color} day={gridDays[index]} title={row.habit.title} />
                      ))}
                    </span>
                    <span className="flex w-24 flex-none items-center justify-end gap-2">
                      <span
                        className={cn(
                          "rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap tabular-nums",
                          row.chain > 0 ? "bg-done-wash text-done" : "bg-destructive-wash text-destructive"
                        )}
                      >
                        {row.chain > 0 ? `${row.chain}d streak` : "broken"}
                      </span>
                      <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: rateColor(row.rate) }}>
                        {row.rate === null ? "—" : `${row.rate}%`}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule-soft px-[18px] py-[11px] text-[11.5px] text-muted-foreground">
            <span className="inline-flex flex-wrap items-center gap-3.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex gap-0.5">
                  {habitRows.slice(0, 3).map((row) => (
                    <span key={row.habit.id} className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: `color-mix(in srgb, ${row.habit.color} 58%, var(--card))` }} />
                  ))}
                </span>
                kept, in each habit&apos;s colour
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-rule-soft" />
                missed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-[3px] w-2.5 rounded-[2px] bg-track" />
                off day
              </span>
            </span>
            <span className="text-faint tabular-nums">
              {gridAvg === null ? "No history yet" : `${gridAvg}% kept across ${habitRows.length} ${habitRows.length === 1 ? "habit" : "habits"}`}
            </span>
          </div>
        </section>

        <div className="grid gap-3.5 lg:grid-cols-2">
          <section className="flex flex-col rounded-[12px] border border-border bg-card shadow-raised transition-[border-color,box-shadow] duration-[140ms] hover:border-border-strong hover:shadow-float">
            <div className="flex items-center justify-between border-b border-rule-soft px-[18px] py-[15px]">
              <h2 className="text-[15px] tracking-[-0.01em]">Best and worst days</h2>
              <span className="text-[11.5px] text-faint">avg closed</span>
            </div>
            <div className="flex flex-1 flex-col justify-end p-[18px]">
              <div className="flex items-end gap-2">
                {weekdayOrdered.map((weekday) => {
                  const hot = weekdayHover === weekday;
                  const best = weekday === bestWeekday && tasksClosed > 0;
                  return (
                    <div key={weekday} onMouseEnter={() => setWeekdayHover(weekday)} onMouseLeave={() => setWeekdayHover(null)} className="flex flex-1 flex-col items-center gap-[7px]">
                      <span className={cn("text-[11px] tabular-nums", hot || best ? "font-bold text-foreground" : "font-semibold text-muted-foreground")}>
                        {weekdayAvg[weekday].toFixed(1)}
                      </span>
                      <span className={cn("flex h-[104px] w-full items-end rounded-[6px]", hot ? "bg-signal-soft shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--signal)_25%,transparent)]" : "bg-canvas-sunk")}>
                        <span
                          className="w-full min-h-[4px] rounded-[6px]"
                          style={{
                            height: `${Math.round((weekdayAvg[weekday] / weekdayMax) * 100)}%`,
                            backgroundColor: hot || best ? "var(--signal)" : weekdayAvg[weekday] < weekdayMax * 0.4 ? "var(--track)" : "var(--border-strong)",
                          }}
                        />
                      </span>
                      <span className={cn("text-[11px]", hot || best ? "font-bold text-foreground" : "font-semibold text-muted-foreground")}>{WEEKDAY_SHORT[weekday]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-rule-soft px-[18px] py-[11px] text-[11.5px] text-muted-foreground text-pretty">{weekdayNote}</div>
          </section>

          <section className="flex flex-col rounded-[12px] border border-border bg-card shadow-raised transition-[border-color,box-shadow] duration-[140ms] hover:border-border-strong hover:shadow-float">
            <div className="flex items-center justify-between border-b border-rule-soft px-[18px] py-[15px]">
              <h2 className="text-[15px] tracking-[-0.01em]">When you actually work</h2>
              <span className="text-[11.5px] text-faint">by hour</span>
            </div>
            <div className="flex flex-1 flex-col justify-end p-[18px]">
              <div className="flex h-[104px] items-end gap-[3px] border-b border-border">
                {hours.map((value, hour) => {
                  const hot = hourHover === hour;
                  return (
                    <span
                      key={hour}
                      onMouseEnter={() => setHourHover(hour)}
                      onMouseLeave={() => setHourHover(null)}
                      title={`${hourLabel(hour)} · ${value.toFixed(1)} closed`}
                      className="flex h-full flex-1 items-end"
                    >
                      <span
                        className="block w-full min-h-[3px] rounded-t-[3px]"
                        style={{
                          height: `${Math.round((value / hourMax) * 100)}%`,
                          backgroundColor: hot
                            ? "var(--foreground)"
                            : value >= hourMax * 0.85 && value > 0
                              ? "var(--signal)"
                              : value === 0
                                ? "var(--rule-soft)"
                                : "color-mix(in srgb, var(--signal) 38%, var(--card))",
                        }}
                      />
                    </span>
                  );
                })}
              </div>
              <div className="mt-[9px] flex justify-between text-[10.5px] text-muted-foreground tabular-nums">
                <span>12a</span>
                <span>6a</span>
                <span>12p</span>
                <span>6p</span>
                <span>11p</span>
              </div>
            </div>
            <div className="border-t border-rule-soft px-[18px] py-[11px] text-[11.5px] text-muted-foreground text-pretty">{hourNote}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

function HabitCell({ cell, color, day, title }: { cell: StripCell; color: string; day?: AnalyticsDay; title: string }) {
  const scheduled = cell !== "off";
  const kept = cell === "kept" || cell === "today-done";
  const isToday = cell === "today-done" || cell === "today-open";
  const label = `${title} · ${day?.label ?? ""}${isToday ? " (today)" : ""} · ${!scheduled ? "off day" : kept ? "kept" : isToday ? "still open" : "missed"}`;
  return (
    <span
      title={label}
      className="flex h-5 flex-1 items-center justify-center rounded-[4px]"
      style={{
        backgroundColor: !scheduled ? "transparent" : kept ? `color-mix(in srgb, ${color} ${isToday ? 100 : 58}%, var(--card))` : "var(--rule-soft)",
        boxShadow: isToday && !kept ? "inset 0 0 0 1.5px var(--border-strong)" : undefined,
      }}
    >
      {!scheduled ? <span className="h-[3px] w-full rounded-[2px] bg-track" /> : null}
    </span>
  );
}

function StatCard({
  label,
  value,
  unit,
  delta,
  hint,
  children,
}: {
  label: string;
  value: string;
  unit: string;
  delta: React.ReactNode;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[12px] border border-border bg-card px-4 pt-[15px] pb-[15px] shadow-raised transition-[border-color,box-shadow] duration-[140ms] hover:border-border-strong hover:shadow-float">
      <div className="flex h-[18px] items-center justify-between">
        <span className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">{label}</span>
        {delta}
      </div>
      <div className="mt-[13px] flex items-baseline gap-1.5">
        <span className="text-[32px] leading-none font-semibold tracking-[-0.035em] tabular-nums">{value}</span>
        <span className="text-[12.5px] text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-3.5 h-[42px]">{children}</div>
      <div className="mt-[11px] text-[11px] text-muted-foreground text-pretty">{hint}</div>
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
}: {
  options: Array<{ value: T; label: string; disabled?: boolean; title?: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "md" | "lg";
}) {
  return (
    <span role="group" aria-label={ariaLabel} className="inline-flex gap-0.5 rounded-[9px] border border-border bg-canvas-sunk p-[3px]">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={on}
            disabled={option.disabled}
            title={option.disabled ? option.title : undefined}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center rounded-[6px] font-semibold tabular-nums transition-colors duration-[120ms]",
              size === "lg" ? "h-7 px-3 text-[12px]" : "h-[26px] px-[11px] text-[11.5px]",
              on ? "bg-card text-foreground shadow-raised" : "text-muted-foreground hover:text-foreground",
              option.disabled && "cursor-not-allowed text-hairline hover:text-hairline"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}
