"use client";

import * as React from "react";
import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { DashboardActivityPoint } from "@/lib/dashboard";
import {
  areaGeometry,
  closedStats,
  closedWindow,
  gridValues,
  weekdayProfile,
  weekdaysOnly,
  type ClosedPoint,
} from "@/lib/closed-series";
import { cn } from "@/lib/utils";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Eyebrow, TodayCard } from "./today-card";
import { ExpandButton } from "./expand-button";

const CARD_DAYS = 14;
const CARD_W = 240;
const CARD_H = 66;

export function toClosedPoints(activity: DashboardActivityPoint[]): ClosedPoint[] {
  return activity.map((point) => ({
    date: point.date,
    label: point.label,
    fullLabel: point.fullLabel,
    value: point.tasks,
    isToday: point.isToday,
  }));
}

function shortDay(point: ClosedPoint) {
  return point.isToday ? "Today" : point.label;
}

type ClosedEachDayCardProps = {
  points: ClosedPoint[];
  onExpand: () => void;
  className?: string;
};

/**
 * Tasks closed per day for the last fortnight as a filled sparkline. The whole
 * card opens the full view; hovering a day draws a guide and a small tip.
 */
export function ClosedEachDayCard({ points, onExpand, className }: ClosedEachDayCardProps) {
  const recent = points.slice(-CARD_DAYS);
  const values = recent.map((point) => point.value);
  const geometry = React.useMemo(
    () => areaGeometry(values, CARD_W, CARD_H, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values.join(",")]
  );
  const [hover, setHover] = React.useState<number | null>(null);
  const total = values.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(0, ...values);
  const hit = hover === null ? null : geometry.points[hover];
  const hovered = hover === null ? null : recent[hover];
  const gradientId = React.useId();
  const foot = hovered
    ? `${shortDay(hovered)} — ${hovered.value} closed`
    : total === 0
      ? "Nothing closed yet"
      : `Peak ${peak} in one day`;
  const rangeLabel =
    recent.length > 0 ? `${recent[0].label} → today` : "";

  return (
    <TodayCard
      interactive
      aria-labelledby="closed-heading"
      className={cn("group/stat flex cursor-pointer flex-col px-4 pt-3.5 pb-3.5", className)}
      onClick={onExpand}
      title="Open full view"
    >
      <div className="flex h-[18px] items-center justify-between gap-3">
        <Eyebrow id="closed-heading">Closed each day</Eyebrow>
        <span className="flex items-center gap-1.5 text-[11px] text-faint">
          last {CARD_DAYS} days
          <ExpandButton onClick={onExpand} label="closed each day" />
        </span>
      </div>

      <div className="mt-2.5 flex items-end gap-3.5">
        <div className="flex shrink-0 items-baseline gap-1.5">
          <span className="text-[34px] leading-none font-semibold tracking-[-0.035em] tabular-nums">
            {total}
          </span>
          <span className="text-[12px] text-muted-foreground">total</span>
        </div>
        <div className="relative min-w-0 flex-1" style={{ height: CARD_H }}>
          <svg
            viewBox={`0 0 ${CARD_W} ${CARD_H}`}
            preserveAspectRatio="none"
            className="block h-full w-full overflow-visible"
            aria-hidden
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" x2={CARD_W} y1={CARD_H - 1} y2={CARD_H - 1} stroke="var(--rule-soft)" />
            <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
            <path
              d={geometry.linePath}
              fill="none"
              stroke="var(--signal)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {geometry.points.length > 0 ? (
              <circle
                cx={geometry.points[geometry.points.length - 1].x}
                cy={geometry.points[geometry.points.length - 1].y}
                r={3}
                fill="var(--card)"
                stroke="var(--signal)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          {hit && hovered ? (
            <>
              <div
                className="pointer-events-none absolute -top-0.5 bottom-0 w-px bg-border-strong"
                style={{ left: `${(hit.x / CARD_W) * 100}%` }}
              />
              <div
                className="pointer-events-none absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_16%,transparent)]"
                style={{ left: `${(hit.x / CARD_W) * 100}%`, top: hit.y }}
              />
              <div
                className="pointer-events-none absolute -top-px flex items-center gap-1.5 rounded-[6px] bg-foreground px-2 py-1 text-[11px] leading-[1.2] whitespace-nowrap text-background shadow-float"
                style={{
                  left: `${(hit.x / CARD_W) * 100}%`,
                  transform:
                    hover !== null && hover >= recent.length - 3
                      ? "translateX(-100%)"
                      : hover !== null && hover <= 1
                        ? "translateX(0)"
                        : "translateX(-50%)",
                }}
              >
                <span className="font-semibold tabular-nums">{hovered.value} closed</span>
                <span className="text-background/55">{shortDay(hovered)}</span>
              </div>
            </>
          ) : null}
          <div
            className="absolute inset-x-[-2px] -top-1.5 bottom-0 flex"
            onMouseLeave={() => setHover(null)}
          >
            {recent.map((point, index) => (
              <div
                key={point.date}
                className="flex-1 cursor-crosshair"
                onMouseEnter={() => setHover(index)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[12px] text-muted-foreground">
        <span className={cn("min-w-0 truncate", hovered && "font-semibold text-foreground")}>
          {foot}
        </span>
        <span className="shrink-0 text-faint">{rangeLabel}</span>
      </div>
    </TodayCard>
  );
}

const RANGES = [7, 14, 30, 90] as const;
type Range = (typeof RANGES)[number];
const DIALOG_W = 960;
const DIALOG_H = 260;
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ClosedEachDayDialogProps = {
  points: ClosedPoint[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The expanded "Closed each day" view: pick a range, switch between an area
 * and bars, overlay the previous period, drop weekends, and see how each
 * weekday averages out.
 */
export function ClosedEachDayDialog({ points, open, onOpenChange }: ClosedEachDayDialogProps) {
  const [range, setRange] = React.useState<Range>(14);
  const [mode, setMode] = React.useState<"area" | "bars">("area");
  const [compare, setCompare] = React.useState(false);
  const [noWeekends, setNoWeekends] = React.useState(false);
  const [hover, setHover] = React.useState<number | null>(null);
  const gradientId = React.useId();

  React.useEffect(() => {
    if (open) setHover(null);
  }, [open, range, noWeekends]);

  const window = React.useMemo(() => closedWindow(points, range), [points, range]);
  const current = noWeekends ? weekdaysOnly(window.current) : window.current;
  // The previous period is aligned by position so the dashed line and the
  // tooltip's "previous" figure refer to the same weekday slot.
  const previous = noWeekends ? weekdaysOnly(window.previous) : window.previous;
  const stats = closedStats(current, previous);
  const values = current.map((point) => point.value);
  const prevValues = previous.map((point) => point.value);
  const top = Math.max(1, ...values, ...(compare ? prevValues : []));
  const area = areaGeometry(values, DIALOG_W, DIALOG_H, 10, top);
  const prevArea = areaGeometry(prevValues, DIALOG_W, DIALOG_H, 10, top);
  const yOf = (value: number) => DIALOG_H - 10 - (value / top) * (DIALOG_H - 20);
  const grid = gridValues(top);
  const hovered = hover === null ? null : current[hover] ?? null;
  const hit = hover === null ? null : area.points[hover] ?? null;
  const narrow = useNarrowViewport();
  const every = Math.max(1, Math.ceil(current.length / (narrow ? 6 : 12)));
  const profile = weekdayProfile(window.current);
  const profileTop = Math.max(...profile, 0.0001);
  const rangeLabel = `Last ${range} days${noWeekends ? " · weekdays only" : ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex w-full flex-col overflow-hidden border border-border bg-card shadow-dialog outline-none",
            "data-[state=open]:animate-dh-pop data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "inset-x-0 bottom-0 top-auto max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-0.75rem))] rounded-t-2xl",
            "dh:inset-auto dh:top-[50%] dh:left-[50%] dh:max-h-[min(90dvh,820px)] dh:w-[min(calc(100%-3rem),920px)] dh:translate-x-[-50%] dh:translate-y-[-50%] dh:rounded-2xl"
          )}
        >
          <div className="flex items-center gap-3 border-b border-rule-soft px-5 py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <DialogPrimitive.Title className="text-[15px] font-semibold tracking-[-0.015em]">
                Closed each day
              </DialogPrimitive.Title>
              <span className="text-[11.5px] text-faint">{rangeLabel} · all projects</span>
            </div>
            <Segmented
              options={RANGES.map((value) => ({ value, label: `${value}d` }))}
              value={range}
              onChange={setRange}
              ariaLabel="Range"
            />
            <DialogPrimitive.Close
              className="grid h-7 w-7 place-items-center rounded-[7px] text-faint transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20"
              aria-label="Close"
            >
              <X className="h-[15px] w-[15px]" />
            </DialogPrimitive.Close>
          </div>

          <div className="grid grid-cols-2 border-b border-rule-soft sm:grid-cols-4">
            <Stat label="Total closed" value={String(stats.total)} note={noWeekends ? "weekdays" : "tasks"} />
            <Stat label="Daily average" value={stats.average.toFixed(1)} note="per day" divided />
            <Stat
              label="Best day"
              value={String(stats.peak)}
              note={stats.best ? shortDay(stats.best) : "—"}
              divided
            />
            <Stat
              label={`vs previous ${range}d`}
              value={stats.deltaPct === null ? "—" : `${stats.deltaPct > 0 ? "+" : ""}${stats.deltaPct}%`}
              note={`${stats.previousTotal} before`}
              tone={stats.deltaPct === null ? undefined : stats.deltaPct >= 0 ? "done" : "late"}
              divided
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-1">
            <div className="relative flex gap-2.5">
              <div className="relative w-[26px] shrink-0" style={{ height: DIALOG_H }}>
                {grid.map((value) => (
                  <span
                    key={value}
                    className="absolute right-0 -translate-y-1/2 text-[10.5px] text-faint/80 tabular-nums"
                    style={{ top: yOf(value) }}
                  >
                    {value}
                  </span>
                ))}
              </div>
              <div className="relative min-w-0 flex-1" style={{ height: DIALOG_H }}>
                {grid.map((value, index) => (
                  <span
                    key={value}
                    className={cn(
                      "absolute inset-x-0 h-px",
                      index === 0 ? "bg-border" : "bg-rule-soft"
                    )}
                    style={{ top: yOf(value) }}
                  />
                ))}

                {mode === "area" ? (
                  <svg
                    viewBox={`0 0 ${DIALOG_W} ${DIALOG_H}`}
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full overflow-visible"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={area.areaPath} fill={`url(#${gradientId})`} />
                    <path
                      d={area.linePath}
                      fill="none"
                      stroke="var(--signal)"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                ) : (
                  <div
                    className="absolute inset-0 flex items-end"
                    style={{ gap: values.length > 40 ? 2 : values.length > 20 ? 4 : 7 }}
                    aria-hidden
                  >
                    {values.map((value, index) => (
                      <span
                        key={current[index].date}
                        className="min-h-[2px] flex-1 rounded-t-[4px] rounded-b-[2px] transition-[height,background-color] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]"
                        style={{
                          height: `${(value / top) * 100}%`,
                          backgroundColor:
                            hover === index
                              ? "var(--signal)"
                              : index === values.length - 1
                                ? "var(--chart-hit-soft)"
                                : value === 0
                                  ? "var(--track)"
                                  : "var(--chart-muted)",
                        }}
                      />
                    ))}
                  </div>
                )}

                {compare && prevValues.length > 1 ? (
                  <svg
                    viewBox={`0 0 ${DIALOG_W} ${DIALOG_H}`}
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    aria-hidden
                  >
                    <path
                      d={prevArea.linePath}
                      fill="none"
                      stroke="var(--chart-muted)"
                      strokeWidth={1.6}
                      strokeDasharray="5 5"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                ) : null}

                {hit && hovered ? (
                  <>
                    <span
                      className="pointer-events-none absolute inset-y-0 w-px bg-border-strong"
                      style={{ left: `${(hit.x / DIALOG_W) * 100}%` }}
                    />
                    <span
                      className="pointer-events-none absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_18%,transparent)]"
                      style={{ left: `${(hit.x / DIALOG_W) * 100}%`, top: `${(hit.y / DIALOG_H) * 100}%` }}
                    />
                    <span
                      className="pointer-events-none absolute top-1.5 flex flex-col gap-0.5 rounded-[8px] bg-foreground px-2.5 py-[7px] whitespace-nowrap text-background shadow-float"
                      style={{
                        left: `${(hit.x / DIALOG_W) * 100}%`,
                        transform:
                          hover !== null && hover >= current.length - 2
                            ? "translateX(-100%)"
                            : hover !== null && hover <= 1
                              ? "translateX(0)"
                              : "translateX(-50%)",
                      }}
                    >
                      <span className="text-[11px] text-background/60">{hovered.fullLabel}</span>
                      <span className="text-[13px] font-semibold tabular-nums">
                        {hovered.value} {hovered.value === 1 ? "task closed" : "tasks closed"}
                      </span>
                      {compare && previous[hover ?? -1] ? (
                        <span className="text-[11px] text-background/60">
                          Previous period: {previous[hover ?? 0].value}
                        </span>
                      ) : null}
                    </span>
                  </>
                ) : null}

                <div className="absolute inset-0 flex" onMouseLeave={() => setHover(null)}>
                  {current.map((point, index) => (
                    <span
                      key={point.date}
                      className="flex-1 cursor-crosshair"
                      onMouseEnter={() => setHover(index)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2 ml-9 flex">
              {current.map((point, index) => (
                <span
                  key={point.date}
                  className={cn(
                    "flex-1 overflow-hidden text-center text-[10.5px] whitespace-nowrap",
                    point.isToday ? "text-foreground" : "text-faint"
                  )}
                >
                  {index % every === 0 || index === current.length - 1 ? shortDay(point) : ""}
                </span>
              ))}
            </div>

            <div className="mt-[22px] mb-4 flex flex-col gap-[9px] rounded-[12px] border border-track bg-canvas-sunk px-4 py-[15px]">
              <span className="text-[10px] font-bold tracking-[0.08em] text-faint uppercase">
                By weekday — average closed
              </span>
              <div className="flex h-[76px] items-end gap-2.5">
                {profile.map((value, index) => {
                  const best = value > 0 && value === profileTop;
                  const weekend = index >= 5;
                  return (
                    <span
                      key={DOW[index]}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span
                        className={cn(
                          "text-[11px] font-semibold tabular-nums",
                          best ? "text-signal" : "text-muted-foreground"
                        )}
                      >
                        {value.toFixed(1)}
                      </span>
                      <span
                        className="w-full min-h-[3px] rounded-t-[4px] rounded-b-[2px]"
                        style={{
                          height: `${Math.round((value / profileTop) * 100)}%`,
                          backgroundColor: best
                            ? "var(--signal)"
                            : weekend
                              ? "var(--track)"
                              : "var(--chart-muted)",
                        }}
                      />
                      <span className="text-[10.5px] text-faint">{DOW[index]}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-rule-soft bg-canvas-sunk px-5 py-[13px]">
            <Segmented
              options={[
                { value: "area", label: "Area" },
                { value: "bars", label: "Bars" },
              ]}
              value={mode}
              onChange={setMode}
              ariaLabel="Chart style"
            />
            <Toggle active={compare} onClick={() => setCompare((value) => !value)}>
              <span
                aria-hidden
                className="h-0.5 w-3.5 rounded-[1px] bg-current opacity-55"
              />
              Compare previous period
            </Toggle>
            <Toggle active={noWeekends} onClick={() => setNoWeekends((value) => !value)}>
              Weekdays only
            </Toggle>
            <span className="ml-auto text-[11.5px] text-faint">
              Peak {stats.peak} in one day · {stats.quietDays} quiet {stats.quietDays === 1 ? "day" : "days"}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

/** Fewer axis labels below 640px, where a 14-day axis already overlaps. */
function useNarrowViewport() {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

function Stat({
  label,
  value,
  note,
  tone,
  divided = false,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "done" | "late";
  divided?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex flex-col gap-1.5 px-5 py-[13px]",
        divided && "sm:border-l sm:border-rule-soft"
      )}
    >
      <span className="text-[10px] font-bold tracking-[0.08em] text-faint uppercase">{label}</span>
      <span className="flex items-baseline gap-[7px]">
        <span className="text-[24px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
          {value}
        </span>
        <span
          className={cn(
            "text-[11.5px] font-semibold",
            tone === "done" ? "text-done" : tone === "late" ? "text-destructive" : "text-faint"
          )}
        >
          {note}
        </span>
      </span>
    </span>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <span role="group" aria-label={ariaLabel} className="flex gap-[3px] rounded-[9px] bg-rule-soft p-[3px]">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-[26px] items-center rounded-[6px] px-[11px] text-[12px] font-semibold transition-colors duration-[120ms]",
              on ? "bg-card text-foreground shadow-raised" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-[31px] items-center gap-[7px] rounded-[8px] border px-3 text-[12px] font-semibold transition-colors duration-[120ms]",
        active
          ? "border-signal bg-signal-soft text-signal"
          : "border-border bg-card text-muted-foreground hover:border-hairline"
      )}
    >
      {children}
    </button>
  );
}
