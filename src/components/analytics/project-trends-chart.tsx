"use client";

import * as React from "react";
import { motion, useMotionValueEvent, useReducedMotion, useSpring } from "motion/react";
import {
  INBOX_SERIES_ID,
  type ProjectTrends,
  type ProjectTrendSeries,
} from "@/lib/project-trends";
import { labelIndexesFor, smoothPath, type ChartPoint } from "@/lib/chart-path";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { EmptyState } from "@/components/brand-mark";
import { useHydrated } from "@/lib/hydration";
import { cn } from "@/lib/utils";

const HIDDEN_STORAGE_KEY = "dailyhub:project-trends-hidden";
const DEFAULT_VISIBLE_COUNT = 8;
const chartWidth = 760;
const chartHeight = 260;
const padding = { top: 16, right: 12, bottom: 26, left: 30 };
const innerWidth = chartWidth - padding.left - padding.right;
const innerHeight = chartHeight - padding.top - padding.bottom;
const baseline = chartHeight - padding.bottom;
const rescaleSpring = { stiffness: 420, damping: 32 };
const RANGE_OPTIONS = [14, 30, 90] as const;
const MODE_OPTIONS = ["daily", "cumulative"] as const;

type Range = (typeof RANGE_OPTIONS)[number];
type Mode = (typeof MODE_OPTIONS)[number];

const interact =
  "cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14";

export type ProjectTrendsChartProps = {
  trends: ProjectTrends;
  /** From the analytics shell's Focus, for cross-highlighting with other cards. */
  activeProjectId: string | null;
  onHoverProject: (id: string | null) => void;
  onPinProject: (id: string) => void;
  /**
   * Optional: reports the client-selected 14/30/90 range upward so the
   * shell's pinned-project summary can mention a total for the range the
   * user is actually looking at, rather than the full 90-day window.
   */
  onRangeChange?: (range: 14 | 30 | 90) => void;
};

function runningTotals(values: number[]): number[] {
  let running = 0;
  return values.map((value) => (running += value));
}

/** Animates a target number with a spring, so an axis rescale glides. */
function useAnimatedMax(target: number, reducedMotion: boolean): number {
  const spring = useSpring(target, rescaleSpring);
  const [display, setDisplay] = React.useState(target);

  React.useEffect(() => {
    spring.set(target);
    if (reducedMotion) setDisplay(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reducedMotion]);

  useMotionValueEvent(spring, "change", (latest) => {
    if (!reducedMotion) setDisplay(latest);
  });

  return reducedMotion ? target : display;
}

/**
 * Legend visibility, persisted in localStorage. The server render and the
 * first client render both use `defaultHidden` — the stored override is
 * applied in an effect after mount, matching the app's hydration discipline
 * (see src/lib/hydration.ts) so there is no hydration-mismatch warning.
 */
function useHiddenSeries(allIds: string[], defaultHidden: Set<string>) {
  const hydrated = useHydrated();
  const [hidden, setHiddenState] = React.useState<Set<string>>(defaultHidden);
  const appliedStoredValue = React.useRef(false);

  React.useEffect(() => {
    if (!hydrated || appliedStoredValue.current) return;
    appliedStoredValue.current = true;
    try {
      const raw = window.localStorage.getItem(HIDDEN_STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const idSet = new Set(allIds);
        setHiddenState(new Set(parsed.filter((id): id is string => typeof id === "string" && idSet.has(id))));
      }
    } catch {
      // Ignore malformed or blocked storage — fall back to the default.
    }
    // Only ever applied once, right after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const setHidden = React.useCallback((next: Set<string>) => {
    setHiddenState(next);
    try {
      window.localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // Ignore — visibility just won't persist this session.
    }
  }, []);

  return [hidden, setHidden] as const;
}

export function ProjectTrendsChart({
  trends,
  activeProjectId,
  onHoverProject,
  onPinProject,
  onRangeChange,
}: ProjectTrendsChartProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const [range, setRangeState] = React.useState<Range>(14);
  const [mode, setMode] = React.useState<Mode>("daily");

  const setRange = React.useCallback(
    (next: Range) => {
      setRangeState(next);
      onRangeChange?.(next);
    },
    [onRangeChange]
  );
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [legendHoverId, setLegendHoverId] = React.useState<string | null>(null);

  const allIds = React.useMemo(() => trends.series.map((s) => s.id), [trends.series]);
  const defaultHidden = React.useMemo(() => {
    const nonInbox = trends.series.filter((s) => s.id !== INBOX_SERIES_ID);
    const hidden = new Set<string>([INBOX_SERIES_ID]);
    for (const series of nonInbox.slice(DEFAULT_VISIBLE_COUNT)) hidden.add(series.id);
    return hidden;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [hiddenIds, setHiddenIds] = useHiddenSeries(allIds, defaultHidden);

  const isAllSilent = trends.series.every((series) => series.total === 0);

  const activeDays = React.useMemo(
    () => trends.days.slice(-range),
    [trends.days, range]
  );

  const windowed = React.useMemo(
    () =>
      trends.series.map((series) => {
        const dailySlice = series.daily.slice(-range);
        return {
          series,
          dailySlice,
          cumulativeSlice: runningTotals(dailySlice),
        };
      }),
    [trends.series, range]
  );

  const visible = React.useMemo(
    () => windowed.filter((entry) => !hiddenIds.has(entry.series.id)),
    [windowed, hiddenIds]
  );

  const emphasisId = legendHoverId ?? activeProjectId;

  const targetMax = React.useMemo(() => {
    if (visible.length === 0) return 4;
    let max = 0;
    for (const entry of visible) {
      const values = mode === "daily" ? entry.dailySlice : entry.cumulativeSlice;
      for (const value of values) if (value > max) max = value;
    }
    return Math.max(4, max);
  }, [visible, mode]);

  const displayMax = useAnimatedMax(targetMax, reducedMotion);

  const len = activeDays.length;
  const toPoint = React.useCallback(
    (value: number, index: number): ChartPoint => ({
      x: padding.left + (len <= 1 ? 0 : (index / (len - 1)) * innerWidth),
      y: padding.top + innerHeight - (value / displayMax) * innerHeight,
    }),
    [len, displayMax]
  );

  const seriesPaths = React.useMemo(
    () =>
      visible.map((entry) => {
        const values = mode === "daily" ? entry.dailySlice : entry.cumulativeSlice;
        const points = values.map((value, index) => toPoint(value, index));
        return { series: entry.series, values, points, path: smoothPath(points) };
      }),
    [visible, mode, toPoint]
  );

  const labelIndexes = React.useMemo(() => labelIndexesFor(len, 5), [len]);

  function setIndexFromClientX(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const index = Math.round(ratio * (len - 1));
    setActiveIndex(Math.max(0, Math.min(len - 1, index)));
  }

  function moveActiveIndex(direction: -1 | 1) {
    setActiveIndex((current) => {
      const start = current ?? len - 1;
      return Math.max(0, Math.min(len - 1, start + direction));
    });
  }

  function toggleVisibility(id: string) {
    const next = new Set(hiddenIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setHiddenIds(next);
    onPinProject(id);
  }

  function soloSeries(id: string) {
    const isAlreadySolo = allIds.every((otherId) => otherId === id || hiddenIds.has(otherId));
    if (isAlreadySolo) {
      setHiddenIds(new Set(defaultHidden));
    } else {
      setHiddenIds(new Set(allIds.filter((otherId) => otherId !== id)));
    }
  }

  function hoverLegend(id: string | null) {
    setLegendHoverId(id);
    onHoverProject(id);
  }

  const activeDay = activeIndex !== null ? activeDays[activeIndex] : null;
  const activeRows = React.useMemo(() => {
    if (activeIndex === null) return [];
    return seriesPaths
      .map(({ series, values }) => ({
        label: series.name,
        value: String(values[activeIndex] ?? 0),
        color: series.color,
        raw: values[activeIndex] ?? 0,
      }))
      .sort((a, b) => b.raw - a.raw);
  }, [seriesPaths, activeIndex]);

  const activeChartX = activeIndex !== null && len > 0
    ? padding.left + (len <= 1 ? 0 : (activeIndex / (len - 1)) * innerWidth)
    : null;

  const topThreeSummary = activeRows
    .slice(0, 3)
    .map((row) => `${row.label} ${row.value}`)
    .join(", ");

  const svgAriaLabel =
    activeDay && activeIndex !== null
      ? `${activeDay.fullLabel}: ${topThreeSummary || "no completions"}`
      : `${visible.length} project${visible.length === 1 ? "" : "s"} tracked over ${range} days. Hover or use the arrow keys to inspect a day.`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-section">Project rhythm</h2>
          <p className="mt-1 text-[12.5px] text-faint">
            {visible.length} project{visible.length === 1 ? "" : "s"} ·{" "}
            {mode === "daily" ? "completions per day" : "running total"}
          </p>
        </div>
        {!isAllSilent ? (
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedGroup
              ariaLabel="Project rhythm timeframe"
              options={RANGE_OPTIONS}
              value={range}
              onChange={setRange}
              renderLabel={(option) => `${option}d`}
            />
            <SegmentedGroup
              ariaLabel="Project rhythm mode"
              options={MODE_OPTIONS}
              value={mode}
              onChange={setMode}
              renderLabel={(option) => (option === "daily" ? "Daily" : "Cumulative")}
            />
          </div>
        ) : null}
      </div>

      {isAllSilent ? (
        <EmptyState
          title="No project activity in this window yet"
          description="Complete a task on a project to see its line appear here."
        />
      ) : (
        <>
          <div className="relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="block h-[220px] w-full cursor-crosshair touch-pan-y outline-none sm:h-[260px]"
              role="group"
              tabIndex={0}
              aria-label={svgAriaLabel}
              onPointerMove={setIndexFromClientX}
              onPointerLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(len - 1)}
              onBlur={() => setActiveIndex(null)}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  moveActiveIndex(-1);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  moveActiveIndex(1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  setActiveIndex(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  setActiveIndex(len - 1);
                }
              }}
            >
              {[0.25, 0.5, 0.75].map((fraction) => {
                const y = padding.top + innerHeight * (1 - fraction);
                return (
                  <line
                    key={fraction}
                    x1={padding.left}
                    x2={chartWidth - padding.right}
                    y1={y}
                    y2={y}
                    stroke="var(--rule-soft)"
                    strokeDasharray="2 5"
                  />
                );
              })}
              {[0.25, 0.5, 0.75].map((fraction) => {
                const y = padding.top + innerHeight * (1 - fraction);
                return (
                  <text
                    key={`tick-${fraction}`}
                    x={chartWidth - padding.right}
                    y={y - 3}
                    textAnchor="end"
                    fill="var(--faint)"
                    fontSize="10.5"
                    fontFamily="var(--font-geist-mono)"
                  >
                    {Math.round(displayMax * fraction)}
                  </text>
                );
              })}

              {seriesPaths.map(({ series, path }, index) => {
                const lit = emphasisId === series.id;
                const muted = emphasisId !== null && emphasisId !== series.id;
                const areaPath = `${path} L ${padding.left + innerWidth} ${baseline} L ${padding.left} ${baseline} Z`;
                return (
                  <React.Fragment key={series.id}>
                    {lit ? (
                      <path
                        d={areaPath}
                        fill={`color-mix(in srgb, ${series.color} 14%, transparent)`}
                        stroke="none"
                      />
                    ) : null}
                    <motion.path
                      d={path}
                      fill="none"
                      stroke={series.color}
                      strokeWidth={lit ? 2.75 : 2.25}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={reducedMotion ? false : { pathLength: 0 }}
                      animate={{ pathLength: 1, opacity: muted ? 0.18 : lit ? 1 : 0.9 }}
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : {
                              pathLength: { duration: 0.6, delay: index * 0.05, ease: [0.2, 0.8, 0.3, 1] },
                              opacity: { duration: 0.18 },
                            }
                      }
                    />
                  </React.Fragment>
                );
              })}

              {activeChartX !== null ? (
                <g pointerEvents="none">
                  <line
                    x1={activeChartX}
                    x2={activeChartX}
                    y1={padding.top}
                    y2={baseline}
                    stroke="var(--foreground)"
                    strokeOpacity="0.18"
                    strokeDasharray="3 4"
                  />
                  {seriesPaths.map(({ series, points }) => {
                    const point = activeIndex !== null ? points[activeIndex] : null;
                    if (!point) return null;
                    return (
                      <circle
                        key={series.id}
                        cx={point.x}
                        cy={point.y}
                        r={4}
                        fill="var(--card)"
                        stroke={series.color}
                        strokeWidth="2.25"
                      />
                    );
                  })}
                </g>
              ) : null}

              {labelIndexes.map((index) => {
                const day = activeDays[index];
                if (!day) return null;
                const x =
                  padding.left + (len <= 1 ? 0 : (index / (len - 1)) * innerWidth);
                return (
                  <text
                    key={`label-${index}`}
                    x={x}
                    y={chartHeight - 8}
                    textAnchor={index === 0 ? "start" : index === len - 1 ? "end" : "middle"}
                    fill="var(--faint)"
                    fontSize="10.5"
                    fontFamily="var(--font-geist-mono)"
                  >
                    {day.label}
                  </text>
                );
              })}
            </svg>
            {activeDay && activeChartX !== null ? (
              <ChartTooltip
                x={activeChartX}
                chartWidth={chartWidth}
                title={activeDay.fullLabel}
                layout="list"
                rows={activeRows}
              />
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 border-t border-rule-soft pt-3">
            {trends.series.map((series) => (
              <LegendEntry
                key={series.id}
                series={series}
                hidden={hiddenIds.has(series.id)}
                emphasized={emphasisId === series.id}
                muted={emphasisId !== null && emphasisId !== series.id}
                onHover={hoverLegend}
                onClick={(altKey) => (altKey ? soloSeries(series.id) : toggleVisibility(series.id))}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LegendEntry({
  series,
  hidden,
  emphasized,
  muted,
  onHover,
  onClick,
}: {
  series: ProjectTrendSeries;
  hidden: boolean;
  emphasized: boolean;
  muted: boolean;
  onHover: (id: string | null) => void;
  onClick: (altKey: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={!hidden}
      aria-label={`${series.name}: ${series.total} completions. ${hidden ? "Hidden" : "Shown"} — click to toggle, option-click to solo.`}
      className={cn(
        "flex max-w-[220px] items-center gap-1.5 rounded-md px-1 py-1 text-left transition-[opacity,background-color] duration-150",
        interact,
        hidden ? "opacity-40" : muted ? "opacity-60" : "opacity-100",
        emphasized && !hidden && "bg-canvas-sunk"
      )}
      onMouseEnter={() => onHover(series.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(series.id)}
      onBlur={() => onHover(null)}
      onClick={(event) => onClick(event.altKey)}
    >
      <EntityAvatar
        name={series.name}
        color={hidden ? null : series.color}
        logoUrl={series.logoUrl}
        iconKey={series.iconKey}
        size={18}
      />
      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span
          className="max-w-[150px] truncate text-[12.5px] font-medium"
          style={{ color: hidden ? "var(--faint)" : "var(--foreground)" }}
        >
          {series.name}
        </span>
        <span
          className="mt-[3px] h-[2px] w-6 rounded-full transition-colors"
          style={{ backgroundColor: hidden ? "var(--track)" : series.color }}
        />
      </span>
      <span className="shrink-0 text-[11.5px] tabular-nums text-faint">{series.total}</span>
    </button>
  );
}

function SegmentedGroup<T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
  renderLabel,
}: {
  ariaLabel: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  renderLabel: (option: T) => string;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-border bg-canvas-sunk p-1"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "h-7 rounded-md px-2.5 text-[11.5px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14",
            value === option
              ? "bg-card text-foreground shadow-raised"
              : "text-faint hover:text-foreground"
          )}
        >
          {renderLabel(option)}
        </button>
      ))}
    </div>
  );
}
