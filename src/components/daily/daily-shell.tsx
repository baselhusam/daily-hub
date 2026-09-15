"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { SelectMenu } from "@/components/ui/select-menu";
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/dates";
import type { HabitsPageData, HabitRow } from "@/lib/habits-page";
import type { StripCell } from "@/lib/habit-stats";
import { cn } from "@/lib/utils";
import { useWeekStart, weekdayOrder } from "@/lib/week-start";
import { DailyTaskFormDialog } from "./daily-task-form-dialog";
import { DeleteDailyTaskDialog, type DeleteDailyTaskTarget } from "./delete-daily-task-dialog";

type Filter = "all" | "active" | "paused";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All habits" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
];

function rateColor(rate: number | null) {
  if (rate === null) return "var(--faint)";
  if (rate >= 80) return "var(--done)";
  if (rate >= 55) return "var(--muted-foreground)";
  return "var(--destructive)";
}

function stripColor(cell: StripCell) {
  switch (cell) {
    case "kept":
      return "var(--chart-ink)";
    case "today-done":
      return "var(--signal)";
    default:
      return "var(--track)";
  }
}

function chainLabel(habit: HabitRow) {
  if (!habit.isActive) return "Paused";
  if (habit.chain === 0) return habit.scheduled === 0 ? "New" : "Chain broken";
  return `${habit.chain}-day chain`;
}

export function DailyShell({ data }: { data: HabitsPageData }) {
  const weekStartsOn = useWeekStart();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [editing, setEditing] = React.useState<HabitRow | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<DeleteDailyTaskTarget | null>(null);
  const { habits, tiles } = data;
  const visible = habits.filter((habit) =>
    filter === "all" ? true : filter === "active" ? habit.isActive : !habit.isActive
  );
  const keptLine = `${habits.filter((h) => h.isActive).length} ${
    habits.filter((h) => h.isActive).length === 1 ? "habit" : "habits"
  } · ${tiles.keptToday} kept today`;

  React.useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const weeklyMax = Math.max(1, ...tiles.weekly.map((week) => week.rate ?? 0));
  const longest = tiles.longest;
  const worst = tiles.atRisk[0] ?? null;

  return (
    <div className="page-gutter animate-dh-fade pt-[clamp(18px,2.4vw,26px)] pb-12">
      {editing ? (
        <DailyTaskFormDialog
          task={{
            id: editing.id,
            title: editing.title,
            iconKey: editing.iconKey,
            logoUrl: editing.logoUrl,
            weekdays: editing.weekdays,
            isActive: editing.isActive,
          }}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          onRequestDelete={(target) => {
            setEditing(null);
            setPendingDelete(target);
          }}
        />
      ) : null}
      <DeleteDailyTaskDialog
        task={pendingDelete}
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      />

      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">Recurring</div>
            <h1 className="mt-[7px] text-[clamp(1.6rem,3.4vw,1.875rem)] leading-[1.1] tracking-[-0.035em]">
              Habits
            </h1>
            <p className="mt-[7px] text-[14px] text-muted-foreground">
              Set the schedule here. Check them off on Today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {habits.length > 0 ? (
              <SelectMenu
                value={filter}
                onValueChange={(next) => setFilter(next as Filter)}
                options={FILTERS}
                variant="plain"
                ariaLabel="Filter habits"
                className="h-[34px] max-w-none gap-2 rounded-[8px] border border-border bg-card px-3 text-[12.5px] font-medium text-foreground shadow-raised hover:border-border-strong hover:bg-card"
                contentClassName="min-w-[160px]"
              />
            ) : null}
            <DailyTaskFormDialog />
          </div>
        </header>

        {habits.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              label="Kept today"
              value={`${tiles.keptToday}/${tiles.dueToday}`}
              unit="habits"
              foot={
                tiles.dueToday === 0
                  ? "nothing scheduled today"
                  : tiles.dueToday - tiles.keptToday === 0
                    ? "all done for today"
                    : `${tiles.dueToday - tiles.keptToday} still open today`
              }
            >
              <span className="flex h-full w-full items-end gap-[5px]">
                {Array.from({ length: Math.max(tiles.dueToday, 1) }, (_, index) => (
                  <span
                    key={index}
                    className="h-[22px] flex-1 rounded-[3px]"
                    style={{
                      backgroundColor:
                        tiles.dueToday === 0
                          ? "var(--track)"
                          : index < tiles.keptToday
                            ? "var(--signal)"
                            : "var(--track)",
                    }}
                  />
                ))}
              </span>
            </Tile>
            <Tile
              label="Average consistency"
              value={tiles.averageRate === null ? "—" : String(tiles.averageRate)}
              unit={tiles.averageRate === null ? "" : "%"}
              foot={
                tiles.weeklyDelta === null
                  ? "12 weeks"
                  : tiles.weeklyDelta === 0
                    ? "12 weeks · level with last week"
                    : `12 weeks · ${tiles.weeklyDelta > 0 ? "up" : "down"} ${Math.abs(tiles.weeklyDelta)} pts`
              }
            >
              <span className="flex h-full w-full items-end gap-1">
                {tiles.weekly.map((week, index) => (
                  <span
                    key={index}
                    title={week.rate === null ? "No scheduled days" : `${week.rate}%`}
                    className="min-h-[4px] flex-1 rounded-[2px]"
                    style={{
                      height: `${week.rate === null ? 4 : Math.max(4, Math.round((week.rate / weeklyMax) * 30))}px`,
                      backgroundColor:
                        index === tiles.weekly.length - 1
                          ? "var(--signal)"
                          : week.rate === null
                            ? "var(--track)"
                            : "var(--border-strong)",
                    }}
                  />
                ))}
              </span>
            </Tile>
            <Tile
              label="Longest chain"
              value={longest ? String(longest.chain) : "0"}
              unit={longest?.chain === 1 ? "day" : "days"}
              valueClassName={longest && longest.chain > 0 ? "text-signal" : undefined}
              foot={longest && longest.chain > 0 ? `${longest.title} · unbroken` : "no chain running yet"}
            >
              {longest ? <ChainSparkline history={longest.history} /> : null}
            </Tile>
            <Tile
              label="At risk"
              value={String(tiles.atRisk.length)}
              unit={tiles.atRisk.length === 1 ? "habit under 50%" : "habits under 50%"}
              valueClassName={tiles.atRisk.length > 0 ? "text-destructive" : undefined}
              foot={worst ? `${worst.title} · ${worst.missed} of ${worst.scheduled} missed` : "every habit above 50%"}
            >
              <span className="flex h-full w-full items-end gap-[3px]">
                {Array.from({ length: worst ? Math.max(worst.scheduled, 1) : 14 }, (_, index) => (
                  <span
                    key={index}
                    className="h-[22px] w-[5px] flex-none rounded-[3px]"
                    style={{
                      backgroundColor: worst && index < worst.missed ? "var(--destructive)" : "var(--track)",
                    }}
                  />
                ))}
              </span>
            </Tile>
          </div>
        ) : null}

        {habits.length === 0 ? (
          <div className="flex flex-col items-center gap-[9px] rounded-[12px] border border-dashed border-border-strong bg-canvas-sunk px-5 pt-14 pb-[60px] text-center">
            <p className="text-[13.5px] text-muted-foreground">No habits yet. Set one up and it shows on Today.</p>
            <DailyTaskFormDialog
              trigger={
                <button
                  type="button"
                  className="inline-flex h-[30px] items-center rounded-[8px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:border-border-strong"
                >
                  Create the first one
                </button>
              }
            />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-[9px] rounded-[12px] border border-dashed border-border-strong bg-canvas-sunk px-5 pt-14 pb-[60px] text-center">
            <p className="text-[13.5px] text-muted-foreground">Nothing in this status.</p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="inline-flex h-[30px] items-center rounded-[8px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:border-border-strong"
            >
              Show all habits
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[12px] border border-border bg-card shadow-raised">
            <div className="overflow-x-auto">
              {/* A table from `sm` up (the name column keeps room for a logo, a
                  name and the status chip); below that each row stacks into a
                  card: name and actions, then the schedule, then the strip. */}
              <div className="sm:min-w-[850px]">
                <div className="hidden grid-cols-[minmax(230px,1fr)_216px_140px_92px_72px] items-center gap-4 border-b border-border bg-canvas-sunk px-[18px] py-[11px] text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase sm:grid">
                  <span>Habit</span>
                  <span>Schedule</span>
                  <span>Last 14 days</span>
                  <span className="text-right">Consistency</span>
                  <span />
                </div>
                {visible.map((habit) => (
                  <div
                    key={habit.id}
                    id={`habit-${habit.id}`}
                    className="group grid grid-cols-[minmax(0,1fr)_92px] items-center gap-x-4 gap-y-3 border-b border-rule-soft px-[18px] py-3.5 transition-colors duration-[120ms] last:border-b-0 hover:bg-canvas-sunk sm:grid-cols-[minmax(230px,1fr)_216px_140px_92px_72px] sm:gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <EntityAvatar
                        name={habit.title}
                        logoUrl={habit.logoUrl}
                        iconKey={habit.iconKey}
                        size={34}
                        rounded="lg"
                        className={cn(!habit.isActive && "opacity-60")}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-[7px]">
                          <span
                            className={cn(
                              "truncate text-[14.5px] font-semibold tracking-[-0.01em]",
                              habit.isActive ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {habit.title}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-[5px] px-1.5 py-px text-[10px] font-bold tracking-[0.02em]",
                              habit.isActive ? "bg-done-wash text-done" : "bg-paper text-muted-foreground"
                            )}
                          >
                            {habit.isActive ? "Active" : "Paused"}
                          </span>
                        </div>
                        <div className="mt-[3px] text-[11.5px] text-faint">{chainLabel(habit)}</div>
                      </div>
                    </div>
                    <div className="col-span-2 flex gap-[5px] sm:col-span-1" aria-label={habit.scheduleLabel} title={habit.scheduleLabel}>
                      {weekdayOrder(weekStartsOn).map((index) => {
                        const on = habit.weekdays.includes(index);
                        return (
                          <span
                            key={index}
                            aria-label={WEEKDAY_SHORT[index]}
                            className={cn(
                              "grid h-[25px] w-[25px] place-items-center rounded-[8px] border text-[11px] font-semibold",
                              on
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-paper text-faint"
                            )}
                          >
                            {WEEKDAY_LABELS[index]}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex gap-[3px]" aria-label={`Last 14 days: ${habit.rate === null ? "no history" : `${habit.rate}% kept`}`}>
                      {habit.strip.map((cell, index) => (
                        <span
                          key={index}
                          className="h-4 flex-1 rounded-[3px]"
                          style={{ backgroundColor: stripColor(cell) }}
                        />
                      ))}
                    </div>
                    <div className="text-right">
                      <div className="text-[14px] font-semibold tabular-nums" style={{ color: rateColor(habit.rate) }}>
                        {habit.rate === null ? "—" : `${habit.rate}%`}
                      </div>
                      <div className="mt-[5px] h-[3px] overflow-hidden rounded-full bg-track">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${habit.rate ?? 0}%`, backgroundColor: rateColor(habit.rate) }}
                        />
                      </div>
                    </div>
                    <div className="col-start-2 row-start-1 flex justify-end gap-0.5 sm:col-auto sm:row-auto">
                      <button
                        type="button"
                        onClick={() => setEditing(habit)}
                        aria-label={`Edit ${habit.title}`}
                        className="grid h-7 w-7 place-items-center rounded-[7px] text-hairline transition-colors hover:bg-hover hover:text-foreground"
                      >
                        <Pencil className="h-[15px] w-[15px]" strokeWidth={1.7} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingDelete({
                            id: habit.id,
                            title: habit.title,
                            iconKey: habit.iconKey,
                            logoUrl: habit.logoUrl,
                          })
                        }
                        aria-label={`Delete ${habit.title}`}
                        className="grid h-7 w-7 place-items-center rounded-[7px] text-hairline transition-colors hover:bg-destructive-wash hover:text-destructive"
                      >
                        <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.7} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-[18px] py-3 text-[11.5px] text-faint">
              <span className="inline-flex items-center gap-3.5">
                <Legend color="var(--chart-ink)">kept</Legend>
                <Legend color="var(--signal)">today</Legend>
                <Legend color="var(--track)">missed or off-day</Legend>
              </span>
              <span>{keptLine}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  valueClassName,
  foot,
  children,
}: {
  label: string;
  value: string;
  unit: string;
  valueClassName?: string;
  foot: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[11px] border border-border bg-card px-4 pt-3.5 pb-3.5 shadow-raised">
      <div className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">{label}</div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className={cn("text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums", valueClassName)}>
          {value}
        </span>
        <span className="text-[12px] text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-3 flex h-[30px] items-end">{children}</div>
      <div className="mt-[9px] truncate text-[10.5px] text-muted-foreground">{foot}</div>
    </div>
  );
}

function ChainSparkline({ history }: { history: number[] }) {
  const width = 92;
  const height = 30;
  const max = Math.max(1, ...history);
  const points = history.map((value, index) => ({
    x: history.length > 1 ? (index / (history.length - 1)) * width : width,
    y: height - (value / max) * (height - 3) - 1.5,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const gradientId = React.useId();
  return (
    // The SVG stretches to the tile (preserveAspectRatio none), which would
    // squash an SVG circle; the end dot is an HTML element positioned over it.
    <span className="relative block h-[30px] w-full">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block h-full w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M0 ${height} ${line.slice(1)} L${width} ${height} Z`} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="var(--signal)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {last ? (
        <span
          aria-hidden
          className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal ring-[1.5px] ring-card"
          style={{ left: `${(last.x / width) * 100}%`, top: `${(last.y / height) * 100}%` }}
        />
      ) : null}
    </span>
  );
}

function Legend({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-[9px] w-[9px] rounded-[3px]" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}
