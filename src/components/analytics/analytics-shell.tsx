"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type {
  AnalyticsData,
  AnalyticsStatKey,
  CompletionDayPoint,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCardBody } from "@/components/ui/surface-card";
import { EntityAvatar, InboxAvatar } from "@/components/ui/entity-avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";

type Focus =
  | { kind: "stat"; key: AnalyticsStatKey }
  | { kind: "day"; date: string }
  | { kind: "weekday"; id: number }
  | { kind: "project"; id: string }
  | { kind: "habit"; id: string }
  | { kind: "tod"; name: string }
  | { kind: "series"; series: "tasks" | "habits" };

type Tip = { x: number; y: number; title: string; detail: string };

const spring = { type: "spring" as const, stiffness: 420, damping: 32 };
const interact =
  "cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14";

function sameFocus(a: Focus | null, b: Focus | null) {
  if (!a || !b || a.kind !== b.kind) return false;
  switch (a.kind) {
    case "stat":
      return a.key === (b as typeof a).key;
    case "day":
      return a.date === (b as typeof a).date;
    case "weekday":
      return a.id === (b as typeof a).id;
    case "project":
      return a.id === (b as typeof a).id;
    case "habit":
      return a.id === (b as typeof a).id;
    case "tod":
      return a.name === (b as typeof a).name;
    case "series":
      return a.series === (b as typeof a).series;
  }
}

function formatFocusTime(minutes: number) {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function describeFocus(focus: Focus, data: AnalyticsData) {
  switch (focus.kind) {
    case "stat":
      return (
        data.bigStats.find((stat) => stat.key === focus.key)?.hint ??
        "Filtered to this metric"
      );
    case "day": {
      const day = data.completionsByDay.find((item) => item.date === focus.date);
      if (!day) return "One day in this window";
      if (day.total === 0) return `${day.fullLabel} · nothing logged`;
      return `${day.fullLabel} · ${day.tasks} tasks, ${day.daily} habits`;
    }
    case "weekday": {
      const weekday = data.weekdays.find((item) => item.id === focus.id);
      if (!weekday) return "Weekday average";
      const note = weekday.isBest
        ? "strongest day"
        : weekday.isWeakest
          ? "weakest day"
          : "average";
      return `${weekday.name} · ${weekday.count} ${note}`;
    }
    case "project": {
      const project =
        data.byProject.find((item) => item.id === focus.id) ??
        data.focusByProject.find((item) => item.id === focus.id);
      return project ? `${project.name} · pinned` : "Project pinned";
    }
    case "habit": {
      const habit = data.dailyTaskStats.find((item) => item.id === focus.id);
      return habit
        ? `${habit.title} · ${habit.rate}% of scheduled days`
        : "Habit pinned";
    }
    case "tod": {
      const band = data.timeOfDay.find((item) => item.name === focus.name);
      if (!band) return "Time of day";
      return `${band.name} (${band.range}) · ${band.count} completions${band.isPeak ? " · peak" : ""}`;
    }
    case "series":
      return focus.series === "tasks"
        ? "Showing tasks only"
        : "Showing habit check-ins only";
  }
}

function seriesFromFocus(active: Focus | null): "all" | "tasks" | "habits" {
  if (!active) return "all";
  if (active.kind === "series") return active.series;
  if (active.kind === "stat") {
    if (active.key === "tasks") return "tasks";
    if (active.key === "habits") return "habits";
  }
  return "all";
}

function cardIsLit(
  active: Focus | null,
  card: "activity" | "focus" | "projects" | "habits" | "weekdays" | "tod"
) {
  if (!active) return false;
  if (active.kind === "day" || active.kind === "series") return card === "activity";
  if (active.kind === "weekday") return card === "weekdays" || card === "activity";
  if (active.kind === "project") return card === "focus" || card === "projects";
  if (active.kind === "habit") return card === "habits" || card === "activity";
  if (active.kind === "tod") return card === "tod";
  if (active.kind === "stat") {
    if (active.key === "focus") return card === "focus";
    if (active.key === "habits") return card === "activity" || card === "habits";
    return card === "activity";
  }
  return false;
}

export function AnalyticsShell({ data }: { data: AnalyticsData }) {
  const [focus, setFocus] = React.useState<Focus | null>(null);
  const [hover, setHover] = React.useState<Focus | null>(null);
  const [tip, setTip] = React.useState<Tip | null>(null);
  const active = hover ?? focus;
  const series = seriesFromFocus(active);
  const maxDay = Math.max(1, ...data.completionsByDay.map((day) => day.total));

  const activeDay =
    active?.kind === "day"
      ? data.completionsByDay.find((day) => day.date === active.date)
      : null;
  const activeWeekdayId =
    active?.kind === "weekday" ? active.id : (activeDay?.weekday ?? null);
  const selectedHabit =
    active?.kind === "habit"
      ? data.dailyTaskStats.find((habit) => habit.id === active.id)
      : null;
  const habitHitDates = new Set(
    selectedHabit?.dots
      .filter((dot) => dot.status === "hit")
      .map((dot) => dot.date) ?? []
  );

  const pin = React.useCallback((next: Focus) => {
    setFocus((current) => (sameFocus(current, next) ? null : next));
  }, []);

  const showTip = React.useCallback(
    (event: React.SyntheticEvent<HTMLElement>, title: string, detail: string) => {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.min(
        window.innerWidth - 20,
        Math.max(20, rect.left + rect.width / 2)
      );
      setTip({ x, y: rect.top, title, detail });
    },
    []
  );

  const hideTip = React.useCallback(() => setTip(null), []);

  React.useEffect(() => {
    const onScroll = () => setTip(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  function dayMuted(day: CompletionDayPoint) {
    if (!active) return false;
    if (active.kind === "day") return day.date !== active.date;
    if (active.kind === "weekday") return day.weekday !== active.id;
    if (active.kind === "habit") return !habitHitDates.has(day.date);
    return false;
  }

  return (
    <div className="page-gutter animate-dh-fade py-[clamp(18px,2.6vw,32px)]">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-5">
        <PageHeader
          eyebrow={data.rangeLabel}
          title="Looking back"
          description={data.lede}
          actions={
            <AnimatePresence>
              {focus ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="flex max-w-[360px] items-center gap-2 rounded-lg border border-signal/25 bg-signal-wash px-3 py-2"
                >
                  <p className="min-w-0 flex-1 text-[12.5px] font-medium text-ink-soft">
                    {describeFocus(focus, data)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 shrink-0 px-2 text-[12px]"
                    onClick={() => setFocus(null)}
                  >
                    Clear
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          }
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-3">
          {data.bigStats.map((stat, index) => {
            const selected = sameFocus(focus, { kind: "stat", key: stat.key });
            const lit = sameFocus(active, { kind: "stat", key: stat.key });
            return (
              <motion.button
                key={stat.key}
                type="button"
                aria-pressed={selected}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: index * 0.04 }}
                className={cn(
                  "rounded-[12px] border bg-card px-4 py-[15px] text-left transition-[border-color,box-shadow,background-color] duration-[120ms]",
                  interact,
                  lit
                    ? "border-signal shadow-[0_0_0_3px_var(--signal-wash)]"
                    : "border-border hover:border-border-strong hover:shadow-float"
                )}
                onMouseEnter={(event) => {
                  setHover({ kind: "stat", key: stat.key });
                  showTip(event, stat.label, stat.hint);
                }}
                onMouseLeave={() => {
                  setHover(null);
                  hideTip();
                }}
                onFocus={(event) => {
                  setHover({ kind: "stat", key: stat.key });
                  showTip(event, stat.label, stat.hint);
                }}
                onBlur={() => {
                  setHover(null);
                  hideTip();
                }}
                onClick={() => pin({ kind: "stat", key: stat.key })}
              >
                <p className="text-[11.5px] font-semibold tracking-[0.02em] text-faint">
                  {stat.label}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <AnimatedMetric value={stat.value} color={stat.color} />
                  {stat.unit ? (
                    <span className="text-[12px] text-faint">{stat.unit}</span>
                  ) : null}
                </div>
              </motion.button>
            );
          })}
        </div>

        <InteractiveCard active={cardIsLit(active, "activity")}>
          <SurfaceCardBody>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-section">Activity over time</h2>
                <p className="mt-1 text-[12.5px] text-faint">
                  {activeDay
                    ? `${activeDay.fullLabel} · ${activeDay.total} logged`
                    : "Tap a day to pin"}
                </p>
              </div>
              <div className="flex gap-1.5 text-[11.5px] text-faint">
                <LegendButton
                  label="Tasks"
                  swatch="var(--chart-ink)"
                  pressed={series !== "habits"}
                  dimmed={series === "habits"}
                  onHover={(on) =>
                    setHover(on ? { kind: "series", series: "tasks" } : null)
                  }
                  onClick={() => pin({ kind: "series", series: "tasks" })}
                />
                <LegendButton
                  label="Habits"
                  swatch="var(--chart-muted)"
                  pressed={series !== "tasks"}
                  dimmed={series === "tasks"}
                  onHover={(on) =>
                    setHover(on ? { kind: "series", series: "habits" } : null)
                  }
                  onClick={() => pin({ kind: "series", series: "habits" })}
                />
              </div>
            </div>
            <div className="flex h-[150px] items-end gap-[clamp(3px,0.9vw,9px)]">
              {data.completionsByDay.map((day, index) => {
                const muted = dayMuted(day);
                const selected = sameFocus(focus, {
                  kind: "day",
                  date: day.date,
                });
                const lit = sameFocus(active, { kind: "day", date: day.date });
                const tasksDim = series === "habits";
                const habitsDim = series === "tasks";
                const detail =
                  day.total === 0
                    ? "No completions"
                    : `${day.tasks} tasks · ${day.daily} habits`;
                return (
                  <button
                    key={day.date}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${day.fullLabel}: ${detail}`}
                    className={cn(
                      "group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-md px-0.5 transition-opacity duration-200",
                      interact,
                      muted ? "opacity-30" : "opacity-100"
                    )}
                    onMouseEnter={(event) => {
                      setHover({ kind: "day", date: day.date });
                      showTip(event, day.fullLabel, detail);
                    }}
                    onMouseLeave={() => {
                      setHover(null);
                      hideTip();
                    }}
                    onFocus={(event) => {
                      setHover({ kind: "day", date: day.date });
                      showTip(event, day.fullLabel, detail);
                    }}
                    onBlur={() => {
                      setHover(null);
                      hideTip();
                    }}
                    onClick={() => pin({ kind: "day", date: day.date })}
                  >
                    <span
                      className={cn(
                        "text-[10px] tabular-nums transition-opacity",
                        lit || day.total > 0
                          ? "text-faint opacity-100"
                          : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                      )}
                    >
                      {day.total}
                    </span>
                    <div className="flex w-full flex-1 flex-col justify-end gap-0.5">
                      <motion.div
                        className="w-full rounded-t-[3px] transition-opacity duration-200"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{
                          delay: 0.12 + index * 0.025,
                          duration: 0.4,
                          ease: [0.2, 0.8, 0.3, 1],
                        }}
                        style={{
                          originY: 1,
                          opacity: habitsDim ? 0.18 : 1,
                          height: `${(day.daily / maxDay) * 100}%`,
                          minHeight: day.daily ? 3 : 0,
                          backgroundColor: day.isToday
                            ? "var(--chart-hit-soft)"
                            : "var(--chart-muted)",
                          boxShadow: lit
                            ? "0 0 0 2px color-mix(in srgb, var(--signal) 35%, transparent)"
                            : undefined,
                        }}
                      />
                      <motion.div
                        className="w-full rounded-b-[3px] transition-[filter,opacity] duration-150 group-hover:brightness-110"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{
                          delay: 0.18 + index * 0.025,
                          duration: 0.45,
                          ease: [0.2, 0.8, 0.3, 1],
                        }}
                        style={{
                          originY: 1,
                          opacity: tasksDim ? 0.18 : 1,
                          height: `${(day.tasks / maxDay) * 100}%`,
                          minHeight: day.tasks ? 4 : lit ? 3 : 0,
                          backgroundColor: day.isToday
                            ? "var(--chart-hit)"
                            : "var(--chart-ink)",
                        }}
                      />
                      {!day.total && !lit ? (
                        <span className="mx-auto h-0.5 w-3/5 rounded-full bg-track" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-[clamp(3px,0.9vw,9px)]">
              {data.completionsByDay.map((day) => {
                const lit =
                  sameFocus(active, { kind: "day", date: day.date }) ||
                  activeWeekdayId === day.weekday;
                return (
                  <div
                    key={`${day.date}-label`}
                    className="min-w-0 flex-1 text-center text-[11px] tracking-[-0.02em] tabular-nums transition-colors"
                    style={{
                      color: lit || day.isToday ? "var(--signal)" : "var(--faint)",
                      fontWeight: lit ? 600 : 400,
                    }}
                  >
                    {day.label}
                  </div>
                );
              })}
            </div>
          </SurfaceCardBody>
        </InteractiveCard>

        <div className="grid grid-cols-1 gap-3.5 min-[720px]:grid-cols-2">
          <InteractiveCard active={cardIsLit(active, "focus")}>
            <SurfaceCardBody>
              <h2 className="text-section">Where the time went</h2>
              <p className="mb-4 text-[12.5px] text-faint">
                Focus hours by project — tap a row
              </p>
              <div className="flex flex-col gap-1">
                {data.focusByProject.length === 0 ? (
                  <p className="text-[13.5px] text-faint">
                    No focus time logged yet.
                  </p>
                ) : (
                  data.focusByProject.map((bucket) => {
                    const selected = sameFocus(focus, {
                      kind: "project",
                      id: bucket.id,
                    });
                    const lit = sameFocus(active, {
                      kind: "project",
                      id: bucket.id,
                    });
                    const muted =
                      active?.kind === "project" && active.id !== bucket.id;
                    return (
                      <button
                        key={bucket.id}
                        type="button"
                        aria-pressed={selected}
                        className={cn(
                          "-mx-1.5 rounded-lg px-1.5 py-2 text-left transition-[background-color,opacity] duration-150",
                          interact,
                          lit ? "bg-canvas-sunk" : "hover:bg-canvas-sunk",
                          muted && "opacity-35"
                        )}
                        onMouseEnter={(event) => {
                          setHover({ kind: "project", id: bucket.id });
                          showTip(
                            event,
                            bucket.name,
                            `${formatFocusTime(bucket.minutes)} · ${bucket.share} of focus`
                          );
                        }}
                        onMouseLeave={() => {
                          setHover(null);
                          hideTip();
                        }}
                        onFocus={(event) => {
                          setHover({ kind: "project", id: bucket.id });
                          showTip(
                            event,
                            bucket.name,
                            `${formatFocusTime(bucket.minutes)} · ${bucket.share} of focus`
                          );
                        }}
                        onBlur={() => {
                          setHover(null);
                          hideTip();
                        }}
                        onClick={() => pin({ kind: "project", id: bucket.id })}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            {bucket.iconKey || bucket.logoUrl ? (
                              <EntityAvatar
                                name={bucket.name}
                                color={bucket.color}
                                logoUrl={bucket.logoUrl}
                                iconKey={bucket.iconKey}
                                size={18}
                              />
                            ) : (
                              <InboxAvatar size={18} />
                            )}
                            <span className="truncate text-[13.5px] font-semibold">
                              {bucket.name}
                            </span>
                          </span>
                          <span className="text-[12px] text-muted-foreground tabular-nums">
                            {formatFocusTime(bucket.minutes)} · {bucket.share}
                          </span>
                        </div>
                        <ProgressBar
                          value={lit ? Math.max(bucket.barWidth, 8) : bucket.barWidth}
                          color={bucket.color}
                          height="md"
                          animated
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </SurfaceCardBody>
          </InteractiveCard>

          <InteractiveCard active={cardIsLit(active, "projects")}>
            <SurfaceCardBody>
              <h2 className="text-section">Project progress</h2>
              <p className="mb-4 text-[12.5px] text-faint">
                Done vs. still open — tap to compare
              </p>
              <div className="flex flex-col gap-1">
                {data.byProject.length === 0 ? (
                  <p className="text-[13.5px] text-faint">No projects yet.</p>
                ) : (
                  data.byProject.map((project) => {
                  const selected = sameFocus(focus, {
                    kind: "project",
                    id: project.id,
                  });
                  const lit = sameFocus(active, {
                    kind: "project",
                    id: project.id,
                  });
                  const muted =
                    active?.kind === "project" && active.id !== project.id;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        "-mx-1.5 rounded-lg px-1.5 py-2 text-left transition-[background-color,opacity] duration-150",
                        interact,
                        lit ? "bg-canvas-sunk" : "hover:bg-canvas-sunk",
                        muted && "opacity-35"
                      )}
                      onMouseEnter={(event) => {
                        setHover({ kind: "project", id: project.id });
                        showTip(event, project.name, project.note);
                      }}
                      onMouseLeave={() => {
                        setHover(null);
                        hideTip();
                      }}
                      onFocus={(event) => {
                        setHover({ kind: "project", id: project.id });
                        showTip(event, project.name, project.note);
                      }}
                      onBlur={() => {
                        setHover(null);
                        hideTip();
                      }}
                      onClick={() => pin({ kind: "project", id: project.id })}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <EntityAvatar
                            name={project.name}
                            color={project.color}
                            logoUrl={project.logoUrl}
                            iconKey={project.iconKey}
                            size={18}
                          />
                          <span className="truncate text-[13.5px] font-semibold">
                            {project.name}
                          </span>
                        </span>
                        <span
                          className="text-[12px] tabular-nums"
                          style={{ color: project.noteColor }}
                        >
                          {project.note}
                        </span>
                      </div>
                      <ProgressBar
                        value={project.barWidth}
                        color={project.color}
                        height="md"
                        animated
                      />
                    </button>
                  );
                })
                )}
              </div>
            </SurfaceCardBody>
          </InteractiveCard>
        </div>

        <InteractiveCard active={cardIsLit(active, "habits")}>
          <SurfaceCardBody>
            <h2 className="text-section">Habit consistency</h2>
            <p className="mb-4 text-[12.5px] text-faint">
              Scheduled days only · tap a square or habit
            </p>
            <div className="flex flex-col gap-1">
              {data.dailyTaskStats.length === 0 ? (
                <p className="text-[13.5px] text-faint">No habits yet.</p>
              ) : (
                data.dailyTaskStats.map((habit) => {
                const selected = sameFocus(focus, {
                  kind: "habit",
                  id: habit.id,
                });
                const lit = sameFocus(active, { kind: "habit", id: habit.id });
                const muted = active?.kind === "habit" && active.id !== habit.id;
                return (
                  <div
                    key={habit.id}
                    className={cn(
                      "-mx-1.5 flex flex-wrap items-center gap-3.5 rounded-lg px-1.5 py-2 transition-[background-color,opacity] duration-150",
                      lit ? "bg-canvas-sunk" : "hover:bg-canvas-sunk",
                      muted && "opacity-35"
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      className="flex min-w-0 flex-1 basis-[150px] items-center gap-2 text-left cursor-pointer"
                      onClick={() => pin({ kind: "habit", id: habit.id })}
                      onMouseEnter={() =>
                        setHover({ kind: "habit", id: habit.id })
                      }
                      onMouseLeave={() => setHover(null)}
                    >
                      <EntityAvatar
                        name={habit.title}
                        logoUrl={habit.logoUrl}
                        iconKey={habit.iconKey}
                        size={22}
                        rounded="lg"
                      />
                      <span className="truncate text-[13.5px] font-semibold">
                        {habit.title}
                      </span>
                    </button>
                    <div className="flex min-w-0 flex-[2] gap-[3px]">
                      {habit.dots.map((dot) => {
                        const day = data.completionsByDay.find(
                          (item) => item.date === dot.date
                        );
                        const statusLabel =
                          dot.status === "hit"
                            ? "checked in"
                            : dot.status === "miss"
                              ? "missed"
                              : "not scheduled";
                        const hot =
                          active?.kind === "day" && active.date === dot.date;
                        return (
                          <button
                            key={dot.date}
                            type="button"
                            aria-label={`${day?.fullLabel ?? dot.date}: ${statusLabel}`}
                            className={cn(
                              "h-4 min-w-0 flex-1 rounded-[2px] cursor-pointer transition-transform duration-150 hover:scale-y-125 hover:brightness-95 focus-visible:scale-y-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal",
                              hot && "ring-2 ring-signal ring-offset-1 ring-offset-card"
                            )}
                            style={{ backgroundColor: dot.color }}
                            onMouseEnter={(event) => {
                              setHover({ kind: "day", date: dot.date });
                              showTip(
                                event,
                                day?.fullLabel ?? dot.date,
                                `${habit.title} · ${statusLabel}`
                              );
                            }}
                            onMouseLeave={() => {
                              setHover(null);
                              hideTip();
                            }}
                            onFocus={(event) => {
                              setHover({ kind: "day", date: dot.date });
                              showTip(
                                event,
                                day?.fullLabel ?? dot.date,
                                `${habit.title} · ${statusLabel}`
                              );
                            }}
                            onBlur={() => {
                              setHover(null);
                              hideTip();
                            }}
                            onClick={() =>
                              pin({ kind: "day", date: dot.date })
                            }
                          />
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="w-[46px] text-right text-[13px] font-semibold tabular-nums"
                      style={{ color: habit.rateColor }}
                      onClick={() => pin({ kind: "habit", id: habit.id })}
                      onMouseEnter={(event) => {
                        setHover({ kind: "habit", id: habit.id });
                        showTip(
                          event,
                          habit.title,
                          `${habit.rate}% of scheduled days`
                        );
                      }}
                      onMouseLeave={() => {
                        setHover(null);
                        hideTip();
                      }}
                    >
                      {habit.rate}%
                    </button>
                  </div>
                );
              })
              )}
            </div>
          </SurfaceCardBody>
        </InteractiveCard>

        <div className="grid grid-cols-1 gap-3.5 min-[720px]:grid-cols-2">
          <InteractiveCard active={cardIsLit(active, "weekdays")}>
            <SurfaceCardBody>
              <h2 className="text-section">Best and worst days</h2>
              <p className="mb-4 text-[12.5px] text-faint">
                {data.weekdayNote}
              </p>
              <div className="flex h-[110px] items-end gap-2">
                {data.weekdays.map((weekday, index) => {
                  const selected = sameFocus(focus, {
                    kind: "weekday",
                    id: weekday.id,
                  });
                  const lit = activeWeekdayId === weekday.id;
                  const muted =
                    activeWeekdayId !== null && activeWeekdayId !== weekday.id;
                  const note = weekday.isBest
                    ? "your strongest day"
                    : weekday.isWeakest
                      ? "your weakest day"
                      : "average completions";
                  return (
                    <button
                      key={weekday.id}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        "flex h-full flex-1 flex-col items-center justify-end gap-1.5 transition-opacity duration-200",
                        interact,
                        muted && "opacity-30"
                      )}
                      onMouseEnter={(event) => {
                        setHover({ kind: "weekday", id: weekday.id });
                        showTip(
                          event,
                          weekday.name,
                          `${weekday.count} avg · ${note}`
                        );
                      }}
                      onMouseLeave={() => {
                        setHover(null);
                        hideTip();
                      }}
                      onFocus={(event) => {
                        setHover({ kind: "weekday", id: weekday.id });
                        showTip(
                          event,
                          weekday.name,
                          `${weekday.count} avg · ${note}`
                        );
                      }}
                      onBlur={() => {
                        setHover(null);
                        hideTip();
                      }}
                      onClick={() =>
                        pin({ kind: "weekday", id: weekday.id })
                      }
                    >
                      <span className="text-[10px] text-faint tabular-nums">
                        {weekday.count}
                      </span>
                      <motion.div
                        className="w-full rounded-t"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: lit ? 1.04 : 1 }}
                        transition={{
                          delay: 0.2 + index * 0.04,
                          duration: 0.4,
                          ease: [0.2, 0.8, 0.3, 1],
                        }}
                        style={{
                          originY: 1,
                          height: `${weekday.barHeight}%`,
                          backgroundColor: weekday.isBest
                            ? "var(--signal)"
                            : weekday.barHeight <= 3
                              ? "var(--track)"
                              : lit
                                ? "var(--chart-ink)"
                                : "var(--chart-muted)",
                        }}
                      />
                      <span
                        className="text-[11.5px] font-semibold tabular-nums"
                        style={{
                          color: lit ? "var(--signal)" : weekday.labelColor,
                        }}
                      >
                        {weekday.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SurfaceCardBody>
          </InteractiveCard>

          <InteractiveCard active={cardIsLit(active, "tod")}>
            <SurfaceCardBody>
              <h2 className="text-section">When you actually work</h2>
              <p className="mb-4 text-[12.5px] text-faint">
                {data.timeOfDayNote}
              </p>
              <div className="flex flex-col gap-1">
                {data.timeOfDay.map((band) => {
                  const selected = sameFocus(focus, {
                    kind: "tod",
                    name: band.name,
                  });
                  const lit = sameFocus(active, {
                    kind: "tod",
                    name: band.name,
                  });
                  const muted =
                    active?.kind === "tod" && active.name !== band.name;
                  return (
                    <button
                      key={band.name}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        "-mx-1.5 flex items-center gap-3 rounded-lg px-1.5 py-2 text-left transition-[background-color,opacity] duration-150",
                        interact,
                        lit ? "bg-canvas-sunk" : "hover:bg-canvas-sunk",
                        muted && "opacity-35"
                      )}
                      onMouseEnter={(event) => {
                        setHover({ kind: "tod", name: band.name });
                        showTip(
                          event,
                          band.name,
                          `${band.range} · ${band.count} completions${band.isPeak ? " · peak stretch" : ""}`
                        );
                      }}
                      onMouseLeave={() => {
                        setHover(null);
                        hideTip();
                      }}
                      onFocus={(event) => {
                        setHover({ kind: "tod", name: band.name });
                        showTip(
                          event,
                          band.name,
                          `${band.range} · ${band.count} completions${band.isPeak ? " · peak stretch" : ""}`
                        );
                      }}
                      onBlur={() => {
                        setHover(null);
                        hideTip();
                      }}
                      onClick={() => pin({ kind: "tod", name: band.name })}
                    >
                      <span className="w-[4.75rem] shrink-0 truncate text-[13px] font-semibold sm:w-[88px]">
                        {band.name}
                      </span>
                      <div className="h-5 flex-1 overflow-hidden rounded bg-track">
                        <motion.div
                          className="h-full rounded"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{
                            duration: 0.55,
                            ease: [0.2, 0.8, 0.3, 1],
                          }}
                          style={{
                            originX: 0,
                            width: `${lit ? Math.max(band.barWidth, 12) : band.barWidth}%`,
                            backgroundColor: band.isPeak
                              ? "var(--signal)"
                              : lit
                                ? "var(--chart-ink)"
                                : "var(--chart-muted)",
                          }}
                        />
                      </div>
                      <span className="w-[34px] text-right text-[12px] text-muted-foreground tabular-nums">
                        {band.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SurfaceCardBody>
          </InteractiveCard>
        </div>
      </div>

      <FloatingTip tip={tip} />
    </div>
  );
}

function InteractiveCard({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "overflow-visible rounded-[12px] border bg-card transition-[border-color,box-shadow,background-color] duration-[120ms]",
        active
          ? "border-signal shadow-[0_0_0_3px_var(--signal-wash)]"
          : "border-border hover:border-border-strong hover:shadow-float"
      )}
    >
      {children}
    </motion.div>
  );
}

function LegendButton({
  label,
  swatch,
  pressed,
  dimmed,
  onHover,
  onClick,
}: {
  label: string;
  swatch: string;
  pressed: boolean;
  dimmed: boolean;
  onHover: (on: boolean) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed && !dimmed}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-opacity hover:bg-hover cursor-pointer",
        dimmed && "opacity-40"
      )}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
    >
      <span
        className="h-2 w-2 rounded-sm"
        style={{ backgroundColor: swatch }}
      />
      {label}
    </button>
  );
}

function AnimatedMetric({ value, color }: { value: string; color: string }) {
  const reduced = useReducedMotion();
  const numeric = Number(value);
  const isNumeric = Number.isFinite(numeric);
  const [display, setDisplay] = React.useState(value);
  const skipIntro = React.useRef(true);

  React.useEffect(() => {
    if (!isNumeric || reduced || skipIntro.current) {
      skipIntro.current = false;
      setDisplay(value);
      return;
    }
    const decimals = value.includes(".") ? (value.split(".")[1]?.length ?? 0) : 0;
    const start = performance.now();
    const duration = 700;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = numeric * eased;
      setDisplay(
        decimals ? current.toFixed(decimals) : String(Math.round(current))
      );
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isNumeric, numeric, reduced, value]);

  return (
    <span className="text-metric" style={{ color }}>
      {display}
    </span>
  );
}

function FloatingTip({ tip }: { tip: Tip | null }) {
  return (
    <AnimatePresence>
      {tip ? (
        <motion.div
          role="tooltip"
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.14 }}
          className="pointer-events-none fixed z-[80] max-w-[min(16rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-border bg-popover px-2.5 py-1.5 shadow-[var(--shadow-dialog)]"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="text-[12px] font-semibold text-foreground">{tip.title}</p>
          <p className="text-[11.5px] text-muted-foreground">{tip.detail}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
