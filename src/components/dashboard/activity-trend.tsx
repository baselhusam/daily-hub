"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { TrendingUp } from "lucide-react";
import type { DashboardActivityPoint } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { labelIndexesFor, smoothPath } from "@/lib/chart-path";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { MetricTile } from "@/components/ui/metric-tile";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  StatCardHeader,
  StatCardMetric,
  StatCardShell,
} from "@/components/ui/stat-card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const dotSpring = { type: "spring" as const, stiffness: 420, damping: 32 };

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

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
  const busiest = recent.reduce<DashboardActivityPoint | null>(
    (best, point) => (best === null || point.total > best.total ? point : best),
    null
  );

  return (
    <StatCardShell
      aria-labelledby="activity-trend-heading"
      className="col-span-2 lg:col-span-1"
    >
      <StatCardHeader
        labelId="activity-trend-heading"
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        label="Daily rhythm"
        meta="last 7 days"
        onExpand={onExpand}
        expandLabel="completion rhythm"
      />
      <div className="mt-2 flex min-h-0 flex-1 items-start gap-3">
        <StatCardMetric value={recentTotal} caption="this week" />
        {/* The chart hangs from the metric's baseline and fills the rest of the
            card, so the number lines up with its neighbours instead of being
            pushed to the floor by a bottom-aligned row. */}
        <div className="-mb-1 min-w-0 flex-1 self-stretch">
          <ActivityLineChart points={recent} mini />
        </div>
      </div>
      <p className="mt-1 truncate text-[11px] text-faint">
        {busiest && busiest.total > 0
          ? `Best day ${busiest.label} · ${busiest.total} finished`
          : "Nothing logged yet this week"}
      </p>
    </StatCardShell>
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
  const peak = points.reduce(
    (best, point) => (point.total > best.total ? point : best),
    points[0] ?? { total: 0, label: "—" }
  );

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
            <SegmentedControl
              aria-label="Activity timeframe"
              options={RANGE_OPTIONS}
              value={range}
              onChange={setRange}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-canvas-sunk shadow-inner">
            <div className="px-1.5 pt-3 sm:px-3">
              <ActivityLineChart points={points} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-rule-soft px-3 py-2.5 text-[11.5px] text-faint sm:px-4">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-1.5 w-1.5 rounded-full bg-signal" />
                Combined completions
              </span>
              <span className="tabular-nums">
                Peak {peak.total} on {peak.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <MetricTile label="Completed" value={total} hint="tasks, inbox, and habits" />
            <MetricTile label="Tasks & inbox" value={tasks} />
            <MetricTile label="Habits" value={habits} />
            <MetricTile
              label="Active days"
              value={`${activeDays}/${range}`}
              hint={`${Math.round((activeDays / Math.max(1, range)) * 100)}% of days`}
            />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
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
