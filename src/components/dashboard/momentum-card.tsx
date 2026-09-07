"use client";

import * as React from "react";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { motion, useReducedMotion } from "motion/react";
import { Flame, Maximize2 } from "lucide-react";
import type { MomentumDay, MomentumInfo } from "@/lib/momentum";
import { cn } from "@/lib/utils";
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
  onExpand: () => void;
};

type MomentumAnalysisDialogProps = {
  momentum: MomentumInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const cellHoverSpring = { type: "spring" as const, stiffness: 420, damping: 32 };

export function MomentumCard({ momentum, onExpand }: MomentumCardProps) {
  const visibleDays = momentum.days.slice(-30);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const activeDay =
    activeIndex === null ? momentum.today : visibleDays[activeIndex] ?? momentum.today;
  const activeDayIndex =
    activeIndex === null
      ? Math.max(0, visibleDays.findIndex((day) => day.isToday))
      : activeIndex;

  return (
    <section
      aria-labelledby="momentum-heading"
      className="col-span-2 flex min-h-[126px] overflow-visible rounded-[12px] border border-border bg-card text-foreground shadow-raised transition-[border-color] duration-[120ms] hover:border-border-strong dh:col-span-1"
    >
      <div className="flex min-w-0 flex-1 flex-col px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold tracking-[0.02em] text-faint">
            <Flame className="h-3.5 w-3.5 shrink-0 text-signal" strokeWidth={2.3} />
            <h2 id="momentum-heading" className="truncate">Daily momentum</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[11px] text-faint">last 30 days</span>
            <button
              type="button"
              onClick={onExpand}
              className="group grid h-5 w-5 place-items-center rounded text-faint transition-[color,background-color] hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14"
              aria-label="Expand daily momentum to choose a longer timeframe"
              title="Expand daily momentum"
            >
              <Maximize2 className="h-3 w-3 transition-transform duration-150 group-hover:scale-110" />
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex items-end gap-3">
          <div className="shrink-0 pb-0.5">
            <div className="text-metric leading-none tabular-nums">{momentum.streak}</div>
            <p className="mt-1 text-[11px] text-faint">day streak</p>
          </div>
          <p
            className="min-w-0 pb-0.5 text-[12px] leading-[1.25]"
            style={{ color: completionColor(activeDay.ratio) }}
          >
            {daySummary(activeDay)}
          </p>
        </div>

        <div
          className="relative mt-3"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <div
            className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1"
            role="list"
            aria-label="Daily completion over the last 30 days"
          >
            {visibleDays.map((day, index) => (
              <div key={day.date} role="listitem">
                <motion.button
                  type="button"
                  aria-label={`${day.fullLabel}: ${daySummary(day)}`}
                  aria-current={day.isToday ? "date" : undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                  whileHover={reducedMotion ? undefined : { scale: 1.18 }}
                  transition={cellHoverSpring}
                  className={cn(
                    "relative h-5 w-full min-w-0 rounded-[3px] border border-transparent transition-[box-shadow,background-color] duration-150 hover:shadow-raised focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20",
                    day.isToday && "ring-2 ring-signal ring-offset-2 ring-offset-card"
                  )}
                  style={{ backgroundColor: completionColor(day.ratio) }}
                >
                  <span className="sr-only">{daySummary(day)}</span>
                </motion.button>
              </div>
            ))}
          </div>

          {activeIndex !== null && (
            <MomentumHoverCard
              day={activeDay}
              index={activeDayIndex}
              length={visibleDays.length}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export function MomentumAnalysisDialog({
  momentum,
  open,
  onOpenChange,
}: MomentumAnalysisDialogProps) {
  const [range, setRange] = React.useState<30 | 60 | 90 | 365>(365);
  const [activeDate, setActiveDate] = React.useState<string | null>(null);
  const days = momentum.days.slice(-range);
  const rangeLabel = range === 365 ? "the past year" : `the last ${range} days`;
  const activeDay =
    days.find((day) => day.date === activeDate) ?? days.at(-1) ?? momentum.today;
  const completedDays = days.filter((day) => day.isComplete).length;
  const commitmentDays = days.filter((day) => day.total > 0).length;
  const completionRate =
    days.reduce((sum, day) => sum + day.completed, 0) /
    Math.max(1, days.reduce((sum, day) => sum + day.total, 0));
  const completedItems = days.reduce((sum, day) => sum + day.completed, 0);

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
              <span className="font-semibold text-foreground">{completedItems}</span> completed items in {rangeLabel}
            </p>
            <div className="inline-flex rounded-lg border border-border bg-canvas-sunk p-1" aria-label="Momentum timeframe">
              {([
                { value: 365, label: "Full year" },
                { value: 90, label: "90 days" },
                { value: 60, label: "60 days" },
                { value: 30, label: "30 days" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={range === value}
                  onClick={() => {
                    setRange(value);
                    setActiveDate(momentum.today.date);
                  }}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-[11.5px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14",
                    range === value
                      ? "bg-card text-foreground shadow-raised"
                      : "text-faint hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ContributionCalendar
            days={days}
            activeDate={activeDay.date}
            onActiveDateChange={setActiveDate}
            range={range}
          />

          <MomentumDetail day={activeDay} />

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Metric label="Current streak" value={`${momentum.streak} days`} />
            <Metric label="Fully finished" value={`${completedDays}/${commitmentDays || 0}`} />
            <Metric label="Completion rate" value={`${Math.round(completionRate * 100)}%`} />
            <Metric label="Timeframe" value={range === 365 ? "Full year" : `${range} days`} />
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

function ContributionCalendar({
  days,
  activeDate,
  onActiveDateChange,
  range,
}: ContributionCalendarProps) {
  const weeks = React.useMemo(() => buildContributionWeeks(days), [days]);
  const monthLabels = React.useMemo(() => getMonthLabels(weeks), [weeks]);
  const isFullYear = range === 365;
  const gapClass = isFullYear ? "gap-0.5" : "gap-1";
  const tileSizeClass = isFullYear
    ? "h-3 w-3"
    : "h-[14px] w-[14px] sm:h-4 sm:w-4";
  const tileWidthClass = isFullYear ? "w-3" : "w-[14px] sm:w-4";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-canvas-sunk p-3 shadow-inner sm:p-4">
      <div className="flex min-w-0 gap-2">
        <div className="grid shrink-0 grid-rows-7 gap-1 pt-[19px] text-right text-[9px] font-medium leading-3 text-faint sm:text-[10px]">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((label, index) => (
            <span key={`${label}-${index}`} className="h-3">{label}</span>
          ))}
        </div>
        <div className="min-w-0 overflow-x-auto scroll-px-2">
          <div className="inline-block min-w-max px-2 pt-1.5 pb-2">
            <div className={cn("mb-1 flex text-[9px] font-medium text-faint sm:text-[10px]", gapClass)} aria-hidden="true">
              {monthLabels.map((label, index) => (
                <span key={`${label ?? "blank"}-${index}`} className={cn("h-3 whitespace-nowrap", tileSizeClass)}>
                  {label}
                </span>
              ))}
            </div>
            <div
              className={cn("flex", gapClass)}
              role="list"
              aria-label={`Daily momentum contribution calendar over the last ${range} days`}
            >
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className={cn("flex flex-col", gapClass, tileWidthClass)}>
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
                            "block rounded-[3px] border border-transparent transition-[transform,box-shadow] duration-150 hover:scale-110 hover:shadow-raised focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20",
                            tileSizeClass,
                            activeDate === day.date && "ring-2 ring-signal ring-offset-2 ring-offset-canvas-sunk",
                            day.isToday && activeDate !== day.date && "ring-1 ring-signal/60 ring-offset-1 ring-offset-canvas-sunk"
                          )}
                          style={{ backgroundColor: contributionColor(day.ratio) }}
                        >
                          <span className="sr-only">{daySummary(day)}</span>
                        </button>
                      </div>
                    ) : (
                      <span key={format(date, "yyyy-MM-dd")} className={cn("block", tileSizeClass)} aria-hidden="true" />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10.5px] text-faint">
        <span>Less</span>
        {[null, 0.25, 0.5, 0.8, 1].map((ratio, index) => (
          <span
            key={index}
            className="h-3.5 w-3.5 rounded-[3px] border border-border/60"
            style={{ backgroundColor: contributionColor(ratio) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function buildContributionWeeks(days: MomentumDay[]) {
  if (days.length === 0) return [] as Array<Array<{ date: Date; day?: MomentumDay }>>;

  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const firstDate = parseISO(days[0].date);
  const lastDate = parseISO(days.at(-1)!.date);
  const firstWeek = startOfWeek(firstDate, { weekStartsOn: 0 });
  const lastWeek = startOfWeek(lastDate, { weekStartsOn: 0 });
  const weeks: Array<Array<{ date: Date; day?: MomentumDay }>> = [];

  for (let weekStart = firstWeek; weekStart <= lastWeek; weekStart = addDays(weekStart, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      return { date, day: dayByDate.get(format(date, "yyyy-MM-dd")) };
    }));
  }

  return weeks;
}

function getMonthLabels(weeks: Array<Array<{ date: Date; day?: MomentumDay }>>) {
  return weeks.map((week, index) => {
    const firstOfMonth = week.find(({ date }) => date.getDate() === 1);
    const firstVisibleDay = week.find(({ day }) => day);

    if (firstOfMonth) return format(firstOfMonth.date, "MMM");
    if (index === 0 && firstVisibleDay) return format(firstVisibleDay.date, "MMM");
    return null;
  });
}

function MomentumDetail({ day }: { day: MomentumDay }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-3 shadow-raised">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-foreground">{day.fullLabel}</p>
          <p className="mt-0.5 text-[11.5px]" style={{ color: completionColor(day.ratio) }}>
            {daySummary(day)}
          </p>
        </div>
        <span className="rounded-full bg-canvas-sunk px-2 py-1 text-[10px] font-semibold text-faint">
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
  return (
    <div className="rounded-lg bg-canvas-sunk px-2 py-2">
      <p className="text-[10px] font-semibold tracking-[0.04em] text-faint uppercase">{label}</p>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-foreground">{value.completed}/{value.total}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-canvas-sunk px-3 py-2.5">
      <p className="text-[10.5px] font-semibold tracking-[0.04em] text-faint uppercase">{label}</p>
      <p className="mt-1 text-[18px] font-semibold tracking-[-0.02em] tabular-nums">{value}</p>
    </div>
  );
}

function MomentumHoverCard({
  day,
  index,
  length,
}: {
  day: MomentumDay;
  index: number;
  length: number;
}) {
  const position = `${((index + 0.5) / length) * 100}%`;

  return (
    <div
      className="pointer-events-none absolute z-20 mt-2 w-[162px] rounded-[9px] border border-border bg-card/95 px-2.5 py-2 shadow-float backdrop-blur-sm transition-opacity duration-150"
      style={{
        left: `clamp(81px, ${position}, calc(100% - 81px))`,
        transform: "translateX(-50%)",
      }}
    >
      <p className="text-[11.5px] font-semibold text-foreground">{day.fullLabel}</p>
      <p className="mt-0.5 text-[11px]" style={{ color: completionColor(day.ratio) }}>
        {daySummary(day)}
      </p>
      <p className="mt-1 text-[10px] text-faint">
        {sourceSummary(day)}
      </p>
    </div>
  );
}

function daySummary(day: MomentumDay): string {
  if (day.total === 0) return "No commitments due";
  if (day.isComplete) return `${day.completed} of ${day.total} complete · all done`;
  return `${day.completed} of ${day.total} complete`;
}

function sourceSummary(day: MomentumDay): string {
  return [
    `${day.habits.completed}/${day.habits.total} habits`,
    `${day.inbox.completed}/${day.inbox.total} Inbox`,
    `${day.projects.completed}/${day.projects.total} projects`,
  ].join(" · ");
}

function completionColor(ratio: number | null): string {
  if (ratio === null || ratio === 0) return "var(--track)";
  if (ratio === 1) return "var(--done)";
  if (ratio >= 0.75) return "var(--signal)";
  return "var(--chart-hit-soft)";
}

function contributionColor(ratio: number | null): string {
  if (ratio === null || ratio === 0) return "var(--track)";
  if (ratio === 1) return "var(--done)";
  if (ratio >= 0.75) return "var(--signal)";
  if (ratio >= 0.4) return "var(--chart-hit-soft)";
  return "color-mix(in srgb, var(--chart-hit-soft) 58%, var(--track))";
}
