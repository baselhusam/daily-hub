"use client";

import * as React from "react";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { motion, useReducedMotion } from "motion/react";
import type { MomentumDay, MomentumInfo } from "@/lib/momentum";
import { cn } from "@/lib/utils";
import {
  MOMENTUM_LEGEND_STEPS,
  momentumTextColor,
  momentumTileBorder,
  momentumTileColor,
} from "@/lib/momentum-colors";
import { MetricTile } from "@/components/ui/metric-tile";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useWeekStart, weekdayOrder } from "@/lib/week-start";
import { Eyebrow, TodayCard } from "./today-card";
import { ExpandButton } from "./expand-button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MomentumCardProps = {
  momentum: MomentumInfo;
  habitsDone: number;
  habitsDue: number;
  onExpand: () => void;
};

type MomentumAnalysisDialogProps = {
  momentum: MomentumInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CARD_DAYS = 30;
const cellHoverSpring = { type: "spring" as const, stiffness: 420, damping: 32 };

/** Swatches for the "Less … More" legend, weakest first. */
const LEGEND_RATIOS = [0, 0.5, 0.85, 1];

/**
 * Streak plus a single 30-cell strip, one tile per day. Hovering a tile
 * rewrites the footer instead of floating a tooltip, so the strip stays
 * uncovered while it is being read.
 */
export function MomentumCard({
  momentum,
  habitsDone,
  habitsDue,
  onExpand,
}: MomentumCardProps) {
  const visibleDays = momentum.days.slice(-CARD_DAYS);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const activeDay = activeIndex === null ? null : visibleDays[activeIndex] ?? null;
  const activeDays = visibleDays.filter((day) => day.completed > 0).length;
  const foot = activeDay
    ? activeDay.isToday
      ? "Today — in progress"
      : `${activeDay.label} — ${daySummary(activeDay)}`
    : `${activeDays} of ${visibleDays.length} days active`;

  return (
    <TodayCard
      interactive
      aria-labelledby="momentum-heading"
      className="group/stat flex flex-col px-4 pt-3.5 pb-3.5"
    >
      <div className="flex h-[18px] items-center justify-between gap-3">
        <Eyebrow id="momentum-heading">Momentum</Eyebrow>
        <span className="flex items-center gap-1.5 text-[11px] text-faint">
          last {CARD_DAYS} days
          <ExpandButton onClick={onExpand} label="momentum history" />
        </span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-[34px] leading-none font-semibold tracking-[-0.035em] tabular-nums">
          {momentum.streak}
        </span>
        <span className="pb-0.5 text-[12px] text-muted-foreground">
          day streak
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-paper px-2 py-[3px] text-[11px] font-semibold text-ink-soft tabular-nums">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: habitsDone > 0 ? "var(--signal)" : "var(--border-strong)",
            }}
          />
          {habitsDone}/{habitsDue} today
        </span>
      </div>

      <div
        className="mt-3.5 grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
        role="list"
        aria-label={`Daily completion over the last ${CARD_DAYS} days`}
        onMouseLeave={() => setActiveIndex(null)}
      >
        {visibleDays.map((day, index) => (
          <div key={day.date} role="listitem" className="min-w-0">
            <motion.button
              type="button"
              aria-label={`${day.fullLabel}: ${daySummary(day)}`}
              aria-current={day.isToday ? "date" : undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={onExpand}
              whileHover={reducedMotion ? undefined : { scaleY: 1.12 }}
              transition={cellHoverSpring}
              className={cn(
                "block h-6 w-full min-w-0 rounded-[3px] outline outline-[1.5px] outline-offset-[1.5px] outline-transparent transition-[outline-color] duration-[130ms]",
                "hover:outline-foreground focus-visible:outline-foreground",
                day.isToday && "bg-paper shadow-[inset_0_0_0_1.5px_var(--signal)]"
              )}
              style={
                day.isToday ? undefined : { backgroundColor: momentumTileColor(day.ratio) }
              }
            >
              <span className="sr-only">{daySummary(day)}</span>
            </motion.button>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[12px] text-muted-foreground">
        <span
          className={cn("min-w-0 truncate", activeDay && "font-semibold text-foreground")}
          aria-live="polite"
        >
          {foot}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-faint">
          Less
          {LEGEND_RATIOS.map((ratio) => (
            <span
              key={ratio}
              aria-hidden
              className="h-[9px] w-[9px] rounded-[3px]"
              style={{ backgroundColor: momentumTileColor(ratio) }}
            />
          ))}
          More
        </span>
      </div>
    </TodayCard>
  );
}

const RANGE_OPTIONS = [
  { value: 365, label: "Full year" },
  { value: 90, label: "90 days" },
  { value: 60, label: "60 days" },
  { value: 30, label: "30 days" },
] as const;

type MomentumRange = (typeof RANGE_OPTIONS)[number]["value"];

export function MomentumAnalysisDialog({
  momentum,
  open,
  onOpenChange,
}: MomentumAnalysisDialogProps) {
  const [range, setRange] = React.useState<MomentumRange>(365);
  const [activeDate, setActiveDate] = React.useState<string | null>(null);
  const days = momentum.days.slice(-range);
  const rangeLabel = range === 365 ? "the past year" : `the last ${range} days`;
  const activeDay =
    days.find((day) => day.date === activeDate) ?? days.at(-1) ?? momentum.today;
  const completedDays = days.filter((day) => day.isComplete).length;
  const commitmentDays = days.filter((day) => day.total > 0).length;
  const completedItems = days.reduce((sum, day) => sum + day.completed, 0);
  const dueItems = days.reduce((sum, day) => sum + day.total, 0);
  const completionRate = completedItems / Math.max(1, dueItems);

  React.useEffect(() => {
    if (open) setActiveDate(momentum.today.date);
  }, [open, momentum.today.date]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden dh:max-w-[900px] dh:max-h-[min(88dvh,760px)]">
        <DialogHeader>
          <DialogTitle>Momentum history</DialogTitle>
          <DialogDescription>
            Completion across habits, Inbox, and project work—one tile per day.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="min-h-0 gap-4 overflow-y-auto pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-faint">
              <span className="font-semibold text-foreground tabular-nums">
                {completedItems}
              </span>{" "}
              completed items in {rangeLabel}
            </p>
            <SegmentedControl
              aria-label="Momentum timeframe"
              options={RANGE_OPTIONS}
              value={range}
              onChange={(next) => {
                setRange(next);
                setActiveDate(momentum.today.date);
              }}
            />
          </div>

          <ContributionCalendar
            days={days}
            activeDate={activeDay.date}
            onActiveDateChange={setActiveDate}
            range={range}
          />

          <MomentumDetail day={activeDay} />

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <MetricTile
              label="Current streak"
              value={`${momentum.streak} ${momentum.streak === 1 ? "day" : "days"}`}
            />
            <MetricTile
              label="Fully finished"
              value={`${completedDays}/${commitmentDays}`}
              hint="days with everything done"
            />
            <MetricTile
              label="Completion rate"
              value={`${Math.round(completionRate * 100)}%`}
              hint={`${completedItems} of ${dueItems} items`}
            />
            <MetricTile
              label="Timeframe"
              value={range === 365 ? "Full year" : `${range} days`}
            />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

type ContributionCalendarProps = {
  days: MomentumDay[];
  activeDate: string;
  onActiveDateChange: (date: string) => void;
  range: number;
};

/**
 * Tile geometry is driven by numbers rather than Tailwind size classes: the
 * weekday gutter and the month strip both derive their positions from the same
 * pitch, which is the only way they stay locked to the rows and columns they
 * label at every range.
 */
function calendarGeometry(range: number) {
  if (range >= 365) return { cell: 12, gap: 2 };
  if (range >= 90) return { cell: 15, gap: 3 };
  if (range >= 60) return { cell: 17, gap: 3 };
  return { cell: 20, gap: 4 };
}

/** Row labels by weekday (0 = Sunday); alternate rows stay blank for air. */
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function ContributionCalendar({
  days,
  activeDate,
  onActiveDateChange,
  range,
}: ContributionCalendarProps) {
  const weekStartsOn = useWeekStart();
  const weeks = React.useMemo(
    () => buildContributionWeeks(days, weekStartsOn),
    [days, weekStartsOn]
  );
  const { cell, gap } = calendarGeometry(range);
  const pitch = cell + gap;
  const monthLabels = React.useMemo(
    () => getMonthLabels(weeks, pitch),
    [weeks, pitch]
  );

  return (
    <div className="rounded-xl border border-border bg-canvas-sunk p-3 shadow-inner sm:p-4">
      <div className="overflow-x-auto">
        {/* Centres short ranges instead of stranding five columns against the
            left edge of a full-width panel. */}
        <div className="flex min-w-max justify-center gap-2 px-1">
          <div
            className="grid shrink-0 text-right text-[10px] leading-none font-medium text-faint"
            style={{
              gridTemplateRows: `repeat(7, ${cell}px)`,
              gap: `${gap}px`,
              marginTop: `${18 + gap}px`,
            }}
            aria-hidden="true"
          >
            {weekdayOrder(weekStartsOn).map((weekday) => (
              <span
                key={weekday}
                className="flex items-center justify-end"
                style={{ height: `${cell}px` }}
              >
                {WEEKDAY_LABELS[weekday]}
              </span>
            ))}
          </div>

          <div className="relative shrink-0">
            <div
              className="relative text-[10px] leading-none font-medium text-faint"
              style={{ height: "18px" }}
              aria-hidden="true"
            >
              {monthLabels.map((month) => (
                <span
                  key={month.key}
                  className="absolute top-0 whitespace-nowrap"
                  style={{ left: `${month.offset}px` }}
                >
                  {month.label}
                </span>
              ))}
            </div>
            <div
              className="flex"
              style={{ gap: `${gap}px`, marginTop: `${gap}px` }}
              role="list"
              aria-label={`Daily momentum contribution calendar over the last ${range} days`}
            >
              {weeks.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  className="flex flex-col"
                  style={{ gap: `${gap}px`, width: `${cell}px` }}
                >
                  {week.map(({ date, day }) =>
                    day ? (
                      <div key={day.date} role="listitem">
                        <button
                          type="button"
                          aria-label={`${day.fullLabel}: ${daySummary(day)}`}
                          aria-pressed={activeDate === day.date}
                          onMouseEnter={() => onActiveDateChange(day.date)}
                          onFocus={() => onActiveDateChange(day.date)}
                          onClick={() => onActiveDateChange(day.date)}
                          className={cn(
                            "block rounded-[3px] border transition-[transform,box-shadow] duration-150",
                            "hover:scale-110 hover:shadow-raised",
                            "focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-[2.5px] focus-visible:ring-signal/25",
                            activeDate === day.date &&
                              "ring-[1.5px] ring-signal ring-offset-1 ring-offset-canvas-sunk",
                            day.isToday &&
                              activeDate !== day.date &&
                              "ring-1 ring-signal/50"
                          )}
                          style={{
                            width: `${cell}px`,
                            height: `${cell}px`,
                            backgroundColor: momentumTileColor(day.ratio),
                            borderColor: momentumTileBorder(day.ratio),
                          }}
                        >
                          <span className="sr-only">{daySummary(day)}</span>
                        </button>
                      </div>
                    ) : (
                      <span
                        key={format(date, "yyyy-MM-dd")}
                        className="block"
                        style={{ width: `${cell}px`, height: `${cell}px` }}
                        aria-hidden="true"
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <CalendarLegend />
    </div>
  );
}

/**
 * "Less → More" alone was misleading: the top of the ramp is a hue change to
 * green, which means "everything due that day is done" rather than simply
 * "more". The finished and off states are called out separately.
 */
function CalendarLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-[10.5px] text-faint">
      <span className="inline-flex items-center gap-1.5">
        <LegendSwatch ratio={null} />
        Nothing due
      </span>
      <span className="inline-flex items-center gap-1.5">
        Less
        {MOMENTUM_LEGEND_STEPS.map((step) => (
          <LegendSwatch key={step.label} ratio={step.ratio} title={step.label} />
        ))}
        More
      </span>
      <span className="inline-flex items-center gap-1.5">
        <LegendSwatch ratio={1} />
        All done
      </span>
    </div>
  );
}

function LegendSwatch({ ratio, title }: { ratio: number | null; title?: string }) {
  return (
    <span
      title={title}
      className="h-3 w-3 rounded-[3px] border"
      style={{
        backgroundColor: momentumTileColor(ratio),
        borderColor:
          ratio === null ? "var(--border)" : "color-mix(in srgb, black 6%, transparent)",
      }}
    />
  );
}

function buildContributionWeeks(days: MomentumDay[], weekStartsOn: 0 | 1) {
  if (days.length === 0) return [] as Array<Array<{ date: Date; day?: MomentumDay }>>;

  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const firstDate = parseISO(days[0].date);
  const lastDate = parseISO(days.at(-1)!.date);
  const firstWeek = startOfWeek(firstDate, { weekStartsOn });
  const lastWeek = startOfWeek(lastDate, { weekStartsOn });
  const weeks: Array<Array<{ date: Date; day?: MomentumDay }>> = [];

  for (let weekStart = firstWeek; weekStart <= lastWeek; weekStart = addDays(weekStart, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      return { date, day: dayByDate.get(format(date, "yyyy-MM-dd")) };
    }));
  }

  return weeks;
}

/**
 * Month labels are absolutely positioned over the week columns, so a three-
 * letter month is never squeezed into one 12px column. Labels closer together
 * than three columns are dropped rather than allowed to collide.
 */
function getMonthLabels(
  weeks: Array<Array<{ date: Date; day?: MomentumDay }>>,
  pitch: number
) {
  const labels: Array<{ key: string; label: string; offset: number }> = [];
  let lastMonth: string | null = null;
  let lastIndex = -Infinity;

  weeks.forEach((week, index) => {
    const anchor = week.find(({ day }) => day) ?? week[0];
    if (!anchor) return;
    const month = format(anchor.date, "yyyy-MM");
    if (month === lastMonth) return;
    lastMonth = month;
    if (index - lastIndex < 3) return;
    lastIndex = index;
    labels.push({
      key: `${month}-${index}`,
      label: format(anchor.date, "MMM"),
      offset: index * pitch,
    });
  });

  return labels;
}

function MomentumDetail({ day }: { day: MomentumDay }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-3 shadow-raised">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{day.fullLabel}</p>
          <p
            className="mt-1 flex items-center gap-1.5 text-[11.5px]"
            style={{ color: momentumTextColor(day.ratio) }}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-inset ring-black/5"
              style={{ backgroundColor: momentumTileColor(day.ratio) }}
            />
            {daySummary(day)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-canvas-sunk px-2 py-1 text-[10px] font-semibold text-faint">
          {day.isComplete ? "Day finished" : day.total ? "In progress" : "No commitments"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <SourceMetric label="Habits" value={day.habits} />
        <SourceMetric label="Inbox" value={day.inbox} />
        <SourceMetric label="Projects" value={day.projects} />
      </div>
    </div>
  );
}

function SourceMetric({ label, value }: { label: string; value: { completed: number; total: number } }) {
  const ratio = value.total === 0 ? null : value.completed / value.total;
  return (
    <div className="rounded-lg bg-canvas-sunk px-2 py-2">
      <p className="text-[10px] font-semibold tracking-[0.04em] text-faint uppercase">{label}</p>
      <p className="mt-1 text-[14px] font-semibold tabular-nums text-foreground">
        {value.completed}/{value.total}
      </p>
      <span
        aria-hidden="true"
        className="mx-auto mt-1.5 block h-[3px] w-8 rounded-full"
        style={{ backgroundColor: momentumTileColor(ratio) }}
      />
    </div>
  );
}

/** Only the sources that actually had something due that day. */
function daySummary(day: MomentumDay): string {
  if (day.total === 0) return "No commitments due";
  if (day.isComplete) return `${day.completed} of ${day.total} complete · all done`;
  return `${day.completed} of ${day.total} complete`;
}
