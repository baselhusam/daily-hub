"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Maximize2, TrendingUp } from "lucide-react";
import type { DashboardActivityPoint } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { labelIndexesFor, smoothPath } from "@/lib/chart-path";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const dotSpring = { type: "spring" as const, stiffness: 420, damping: 32 };

type ActivityTrendProps = {
  activity: DashboardActivityPoint[];
  onExpand: () => void;
};

type AnalysisDialogProps = {
  activity: DashboardActivityPoint[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRange?: 7 | 30 | 90;
};

const chartHeight = 254;
const chartWidth = 760;
const padding = { top: 20, right: 12, bottom: 31, left: 14 };

export function ActivityTrendCard({ activity, onExpand }: ActivityTrendProps) {
  const recent = activity.slice(-7);
  const recentTotal = recent.reduce((sum, point) => sum + point.total, 0);

  return (
    <section
      aria-labelledby="activity-trend-heading"
      className="col-span-2 flex min-h-[112px] overflow-hidden rounded-[12px] border border-border bg-card text-foreground shadow-raised dh:col-span-1"
    >
      <div className="flex min-w-0 flex-1 flex-col px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold tracking-[0.02em] text-faint">
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-signal" />
            <h2 id="activity-trend-heading" className="truncate">Daily rhythm</h2>
          </div>
          <button
            type="button"
            onClick={onExpand}
            className="group grid h-5 w-5 shrink-0 place-items-center rounded text-faint transition-[color,background-color] hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14"
            aria-label="Expand activity trend to choose a longer timeframe"
            title="Expand activity trend"
          >
            <Maximize2 className="h-3 w-3 transition-transform duration-150 group-hover:scale-110" />
          </button>
        </div>
        <div className="mt-1 flex min-h-0 flex-1 items-end gap-3">
          <div className="shrink-0 pb-0.5">
            <div className="text-metric leading-none tabular-nums">{recentTotal}</div>
            <p className="mt-1 text-[11px] text-faint">this week</p>
          </div>
          <div className="min-w-0 flex-1 self-stretch">
            <ActivityLineChart points={recent} mini />
          </div>
        </div>
      </div>
    </section>
  );
}

export function ActivityAnalysisDialog({
  activity,
  open,
  onOpenChange,
  initialRange = 90,
}: AnalysisDialogProps) {
  const [range, setRange] = React.useState<7 | 30 | 90>(initialRange);

  React.useEffect(() => {
    if (open) setRange(initialRange);
  }, [open, initialRange]);

  const points = activity.slice(-range);
  const total = points.reduce((sum, point) => sum + point.total, 0);
  const tasks = points.reduce((sum, point) => sum + point.tasks, 0);
  const habits = points.reduce((sum, point) => sum + point.habits, 0);
  const activeDays = points.filter((point) => point.total > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden dh:max-w-[900px] dh:max-h-[min(88dvh,760px)]">
        <DialogHeader>
          <DialogTitle>Completion rhythm</DialogTitle>
          <DialogDescription>
            Everything you logged, grouped by day.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="min-h-0 gap-4 overflow-y-auto pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-faint">
              Your selected timeframe includes tasks, inbox items, and habits.
            </p>
            <div className="inline-flex rounded-lg border border-border bg-canvas-sunk p-1" aria-label="Activity timeframe">
              {([7, 30, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={range === days}
                  onClick={() => setRange(days)}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-[11.5px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14",
                    range === days
                      ? "bg-card text-foreground shadow-raised"
                      : "text-faint hover:text-foreground"
                  )}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-canvas-sunk px-1.5 pt-3 shadow-inner sm:px-3">
            <ActivityLineChart points={points} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule-soft px-3 py-3 text-[11.5px] text-faint sm:px-1">
              <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-signal" />Combined completions</span>
              <span>Tasks, inbox items, and habits.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Metric label="Completed" value={total} />
            <Metric label="Tasks & inbox" value={tasks} />
            <Metric label="Habits" value={habits} />
            <Metric label="Active days" value={`${activeDays}/${range}`} />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
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

function ActivityLineChart({
  points,
  mini = false,
}: {
  points: DashboardActivityPoint[];
  mini?: boolean;
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const max = Math.max(4, ...points.map((point) => point.total));
  const safePoints = points.length > 1 ? points : [...points, ...points];
  const chartPadding = mini
    ? { top: 14, right: 4, bottom: 6, left: 4 }
    : padding;
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const baseline = chartHeight - chartPadding.bottom;
  const toPoint = (value: number, index: number) => ({
    x: chartPadding.left + (index / (safePoints.length - 1)) * innerWidth,
    y: chartPadding.top + innerHeight - (value / max) * innerHeight,
  });
  const totalPoints = safePoints.map((point, index) => toPoint(point.total, index));
  const totalPath = smoothPath(totalPoints);
  const areaPath = `${totalPath} L ${totalPoints.at(-1)?.x ?? chartWidth} ${baseline} L ${totalPoints[0]?.x ?? 0} ${baseline} Z`;
  const labelIndexes = mini ? [] : labelIndexesFor(safePoints.length, 5);
  const activePoint = activeIndex === null ? null : safePoints[activeIndex];
  const activeChartPoint = activeIndex === null ? null : totalPoints[activeIndex];

  function setIndexFromClientX(
    event: React.PointerEvent<SVGSVGElement>
  ) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const index = Math.round(ratio * (safePoints.length - 1));
    setActiveIndex(Math.max(0, Math.min(safePoints.length - 1, index)));
  }

  function moveActiveIndex(direction: -1 | 1) {
    setActiveIndex((current) => {
      const start = current ?? safePoints.length - 1;
      return Math.max(0, Math.min(safePoints.length - 1, start + direction));
    });
  }

  return (
    <div className={cn("relative", mini ? "h-full min-h-[58px]" : "h-[260px] sm:h-[320px]")}>
      <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className={cn(
        "block w-full cursor-crosshair touch-pan-y outline-none",
        "h-full"
      )}
      role="group"
      tabIndex={0}
      aria-label={
        activePoint
          ? `${activePoint.fullLabel}: ${activePoint.total} completions, ${activePoint.tasks} tasks and ${activePoint.habits} habits.`
          : `${points.reduce((sum, point) => sum + point.total, 0)} completions across ${points.length} days. Hover or use the arrow keys to inspect a day.`
      }
      onPointerMove={setIndexFromClientX}
      onPointerLeave={() => setActiveIndex(null)}
      onFocus={() => setActiveIndex(safePoints.length - 1)}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveActiveIndex(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          moveActiveIndex(1);
        }
        if (event.key === "Home") {
          event.preventDefault();
          setActiveIndex(0);
        }
        if (event.key === "End") {
          event.preventDefault();
          setActiveIndex(safePoints.length - 1);
        }
      }}
    >
      <defs>
        <linearGradient id="activity-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--signal)" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {!mini && [0.25, 0.5, 0.75].map((fraction) => {
        const y = chartPadding.top + innerHeight * (1 - fraction);
        return <line key={fraction} x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} stroke="var(--rule-soft)" strokeDasharray="2 5" />;
      })}
      <motion.path
        d={areaPath}
        fill="url(#activity-fill)"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.15 }}
      />
      <motion.path
        d={totalPath}
        fill="none"
        stroke="var(--signal)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducedMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.65, ease: [0.2, 0.8, 0.3, 1] }}
      />
      {activePoint && activeChartPoint ? (
        <ActivityHoverMarker
          chartPoint={activeChartPoint}
          chartPadding={chartPadding}
          baseline={baseline}
          mini={mini}
          reducedMotion={reducedMotion}
        />
      ) : null}
      {labelIndexes.map((index) => {
        const point = totalPoints[index];
        return (
          <text
            key={`label-${index}`}
            x={point.x}
            y={chartHeight - 8}
            textAnchor={index === 0 ? "start" : index === safePoints.length - 1 ? "end" : "middle"}
            fill="var(--faint)"
            fontSize="10.5"
            fontFamily="var(--font-geist-mono)"
          >
            {safePoints[index]?.label}
          </text>
        );
      })}
      </svg>
      {activePoint && activeChartPoint ? (
        <ChartTooltip
          x={activeChartPoint.x}
          chartWidth={chartWidth}
          title={mini ? activePoint.label : activePoint.fullLabel}
          compact={mini}
          rows={[
            { label: "finished", value: `${activePoint.total}`, color: "var(--signal)" },
            { label: "tasks", value: `${activePoint.tasks}` },
            { label: "habits", value: `${activePoint.habits}` },
          ]}
        />
      ) : null}
    </div>
  );
}

function ActivityHoverMarker({
  chartPoint,
  chartPadding,
  baseline,
  mini,
  reducedMotion,
}: {
  chartPoint: { x: number; y: number };
  chartPadding: { top: number; right: number; bottom: number; left: number };
  baseline: number;
  mini: boolean;
  reducedMotion: boolean | null;
}) {
  return (
    <g pointerEvents="none">
      <line
        x1={chartPoint.x}
        x2={chartPoint.x}
        y1={chartPadding.top}
        y2={baseline}
        stroke="var(--signal)"
        strokeOpacity="0.35"
        strokeDasharray="3 4"
      />
      <motion.circle
        r={mini ? 4.5 : 5.5}
        fill="var(--card)"
        stroke="var(--signal)"
        strokeWidth="2.5"
        animate={{ cx: chartPoint.x, cy: chartPoint.y }}
        transition={reducedMotion ? { duration: 0 } : dotSpring}
      />
    </g>
  );
}
