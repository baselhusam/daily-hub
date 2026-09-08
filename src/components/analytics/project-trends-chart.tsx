"use client";

import * as React from "react";
import { motion, useMotionValueEvent, useReducedMotion, useSpring } from "motion/react";
import { useTheme } from "next-themes";
import {
  INBOX_SERIES_ID,
  type ProjectTrends,
  type ProjectTrendSeries,
} from "@/lib/project-trends";
import { labelIndexesFor, smoothPath, type ChartPoint } from "@/lib/chart-path";
import { plotColor, recedeColor, type ChartThemeMode } from "@/lib/chart-colors";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { EmptyState } from "@/components/brand-mark";
import { useHydrated } from "@/lib/hydration";
import { cn } from "@/lib/utils";

const HIDDEN_STORAGE_KEY = "dailyhub:project-trends-hidden";
const DEFAULT_VISIBLE_COUNT = 8;
const chartWidth = 760;
const chartHeight = 250;
const padding = { top: 20, right: 14, bottom: 28, left: 30 };
const innerWidth = chartWidth - padding.left - padding.right;
const innerHeight = chartHeight - padding.top - padding.bottom;
const baseline = chartHeight - padding.bottom;
const rescaleSpring = { stiffness: 420, damping: 32 };
const RANGE_OPTIONS = [14, 30, 90] as const;
const MODE_OPTIONS = ["daily", "cumulative"] as const;

/**
 * Completions are whole events on scattered days. At full tension a lone
 * completion inflates into a wide bell that implies days of work either side
 * of it, so the curve is deliberately tighter here than on the Today card.
 */
const CURVE_TENSION = 0.62;
/** How far a context line is pushed toward the card surface. */
const RECEDE = 0.62;
/** Vertical reach, in viewBox units, for grabbing a line with the pointer. */
const HIT_RADIUS = 22;

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
 * Which surface the chart is drawn on. Server render and first client render
 * both assume light; the real value lands after mount, matching the app's
 * hydration discipline (see src/lib/hydration.ts).
 */
function useChartTheme(): ChartThemeMode {
  const hydrated = useHydrated();
  const { resolvedTheme } = useTheme();
  return hydrated && resolvedTheme === "dark" ? "dark" : "light";
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

/**
 * A tick step of 1/2/5/10… keeps every gridline on a whole number and lands
 * the top of the scale just above the data instead of well clear of it.
 */
function niceScale(rawMax: number): { max: number; step: number; ticks: number } {
  const target = Math.max(4, rawMax);
  for (let power = 0; power < 5; power += 1) {
    for (const multiple of [1, 2, 5]) {
      const step = multiple * 10 ** power;
      const ticks = Math.ceil(target / step);
      if (ticks >= 3 && ticks <= 5) return { max: step * ticks, step, ticks };
    }
  }
  return { max: target, step: target / 4, ticks: 4 };
}

export function ProjectTrendsChart({
  trends,
  activeProjectId,
  onHoverProject,
  onPinProject,
  onRangeChange,
}: ProjectTrendsChartProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const themeMode = useChartTheme();
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
  const [lineHoverId, setLineHoverId] = React.useState<string | null>(null);
  const [heroId, setHeroId] = React.useState<string | null>(null);

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

  /** Plot colours: same hue as the stored accent, made legible on this surface. */
  const colorById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const { series } of windowed) map.set(series.id, plotColor(series.color, themeMode));
    return map;
  }, [windowed, themeMode]);
  const colorOf = React.useCallback(
    (id: string) => colorById.get(id) ?? "var(--foreground)",
    [colorById]
  );

  // `trends.series` arrives sorted by total desc, so the first visible entry is
  // the busiest project — a sensible thing to lead with until one is picked.
  const hero = React.useMemo(
    () => visible.find((entry) => entry.series.id === heroId) ?? visible[0] ?? null,
    [visible, heroId]
  );

  const targetMax = React.useMemo(() => {
    if (visible.length === 0) return 4;
    let max = 0;
    for (const entry of visible) {
      const values = mode === "daily" ? entry.dailySlice : entry.cumulativeSlice;
      for (const value of values) if (value > max) max = value;
    }
    return Math.max(4, max);
  }, [visible, mode]);

  const scale = React.useMemo(() => niceScale(targetMax), [targetMax]);
  const displayMax = useAnimatedMax(scale.max, reducedMotion);

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
        return {
          series: entry.series,
          values,
          points,
          path: smoothPath(points, CURVE_TENSION),
        };
      }),
    [visible, mode, toPoint]
  );

  const heroPath = seriesPaths.find((entry) => entry.series.id === hero?.series.id) ?? null;
  const labelIndexes = React.useMemo(() => labelIndexesFor(len, 5), [len]);

  /**
   * The last day is still accumulating, so every line dips toward it. Veiling
   * it stops a partial day from reading as a collapse in activity.
   */
  const todayIndex = activeDays.length - 1;
  const lastDayIsToday = activeDays[todayIndex]?.isToday ?? false;

  /** The line the pointer is nearest, or null when it isn't near one. */
  const focusId = legendHoverId ?? lineHoverId ?? activeProjectId;

  function readPointer(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    const ratio = (event.clientX - bounds.left) / bounds.width;
    const index = Math.max(0, Math.min(len - 1, Math.round(ratio * (len - 1))));
    setActiveIndex(index);

    // Series sitting at zero are skipped: on a sparse chart the crowd along
    // the baseline would otherwise claim every hover down there.
    const pointerY = ((event.clientY - bounds.top) / bounds.height) * chartHeight;
    let nearestId: string | null = null;
    let nearestDistance = HIT_RADIUS;
    for (const entry of seriesPaths) {
      if ((entry.values[index] ?? 0) <= 0) continue;
      const distance = Math.abs(entry.points[index].y - pointerY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = entry.series.id;
      }
    }
    if (nearestId !== lineHoverId) {
      setLineHoverId(nearestId);
      onHoverProject(nearestId);
    }
  }

  function clearPointer() {
    setActiveIndex(null);
    if (lineHoverId !== null) {
      setLineHoverId(null);
      onHoverProject(null);
    }
  }

  function moveActiveIndex(direction: -1 | 1) {
    setActiveIndex((current) => {
      const start = current ?? len - 1;
      return Math.max(0, Math.min(len - 1, start + direction));
    });
  }

  /** Keyboard equivalent of clicking a line — pointer-only focus would strand it. */
  function moveHero(direction: -1 | 1) {
    if (visible.length === 0) return;
    const currentIndex = visible.findIndex((entry) => entry.series.id === hero?.series.id);
    const nextIndex = (currentIndex + direction + visible.length) % visible.length;
    promote(visible[nextIndex].series.id);
  }

  function promote(id: string) {
    setHeroId(id);
    onPinProject(id);
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
        color: colorOf(series.id),
        raw: values[activeIndex] ?? 0,
      }))
      .filter((row) => row.raw > 0)
      .sort((a, b) => b.raw - a.raw);
  }, [seriesPaths, activeIndex, colorOf]);

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
      : `${hero ? `${hero.series.name} in focus. ` : ""}${visible.length} project${visible.length === 1 ? "" : "s"} tracked over ${range} days. Left and right arrows inspect a day, up and down change the project in focus.`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-section">Project rhythm</h2>
          <p className="mt-1 text-[12.5px] text-faint">
            {hero ? (
              <>
                <span style={{ color: colorOf(hero.series.id) }}>●</span>{" "}
                {hero.series.name} in focus ·{" "}
                {visible.length - 1} other{visible.length === 2 ? "" : "s"} for context
              </>
            ) : (
              <>
                {visible.length} project{visible.length === 1 ? "" : "s"} ·{" "}
                {mode === "daily" ? "completions per day" : "running total"}
              </>
            )}
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
              className={cn(
                "block h-[220px] w-full touch-pan-y outline-none sm:h-[260px]",
                lineHoverId && lineHoverId !== hero?.series.id ? "cursor-pointer" : "cursor-crosshair"
              )}
              role="group"
              tabIndex={0}
              aria-label={svgAriaLabel}
              onPointerMove={readPointer}
              onPointerLeave={clearPointer}
              onClick={() => {
                if (lineHoverId && lineHoverId !== hero?.series.id) promote(lineHoverId);
              }}
              onFocus={() => setActiveIndex(len - 1)}
              onBlur={clearPointer}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  moveActiveIndex(-1);
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  moveActiveIndex(1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  moveHero(-1);
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  moveHero(1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  setActiveIndex(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  setActiveIndex(len - 1);
                }
              }}
            >
              <defs>
                {heroPath ? (
                  <linearGradient id="project-hero-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={colorOf(heroPath.series.id)} stopOpacity="0.26" />
                    <stop offset="100%" stopColor={colorOf(heroPath.series.id)} stopOpacity="0.02" />
                  </linearGradient>
                ) : null}
                <pattern
                  id="project-today-veil"
                  width="5"
                  height="5"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width="5" height="5" fill="var(--card)" fillOpacity="0.72" />
                  <line x1="0" y1="0" x2="0" y2="5" stroke="var(--faint)" strokeOpacity="0.22" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Solid hairlines: a dashed grid reads as a threshold it isn't. */}
              {Array.from({ length: scale.ticks }, (_, tick) => {
                const value = scale.step * (tick + 1);
                const y = padding.top + innerHeight - (value / displayMax) * innerHeight;
                return (
                  <React.Fragment key={value}>
                    <line
                      x1={padding.left}
                      x2={chartWidth - padding.right}
                      y1={y}
                      y2={y}
                      stroke="var(--rule-soft)"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fill="var(--faint)"
                      fontSize="10.5"
                      fontFamily="var(--font-geist-mono)"
                    >
                      {Math.round(value)}
                    </text>
                  </React.Fragment>
                );
              })}
              <line
                x1={padding.left}
                x2={chartWidth - padding.right}
                y1={baseline}
                y2={baseline}
                stroke="var(--border)"
              />

              {/* Context lines keep their own hue, pushed back toward the card. */}
              {seriesPaths.map(({ series, path }) => {
                if (series.id === heroPath?.series.id) return null;
                const lit = focusId === series.id;
                const dimmed = focusId !== null && !lit;
                return (
                  <path
                    key={series.id}
                    d={path}
                    fill="none"
                    stroke={lit ? colorOf(series.id) : recedeColor(colorOf(series.id), themeMode, RECEDE)}
                    strokeWidth={lit ? 2.5 : 1.5}
                    strokeOpacity={dimmed ? 0.45 : 1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-[stroke,stroke-width,stroke-opacity] duration-150"
                  />
                );
              })}

              {heroPath ? (
                <>
                  <motion.path
                    d={`${heroPath.path} L ${padding.left + innerWidth} ${baseline} L ${padding.left} ${baseline} Z`}
                    fill="url(#project-hero-fill)"
                    animate={{ opacity: focusId && focusId !== heroPath.series.id ? 0.28 : 1 }}
                    transition={{ duration: reducedMotion ? 0 : 0.18 }}
                  />
                  <motion.path
                    d={heroPath.path}
                    fill="none"
                    stroke={colorOf(heroPath.series.id)}
                    strokeWidth={focusId === heroPath.series.id ? 3.25 : 2.75}
                    strokeOpacity={focusId && focusId !== heroPath.series.id ? 0.35 : 1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reducedMotion ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { duration: 0.6, ease: [0.2, 0.8, 0.3, 1] }
                    }
                  />
                </>
              ) : null}

              {/* The focused context line is redrawn above the hero's fill —
                  lit but buried under a wash reads as still-not-selected. */}
              {focusId && focusId !== heroPath?.series.id
                ? seriesPaths
                    .filter((entry) => entry.series.id === focusId)
                    .map(({ series, path }) => (
                      <path
                        key={`focus-${series.id}`}
                        d={path}
                        fill="none"
                        stroke={colorOf(series.id)}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))
                : null}

              {lastDayIsToday && len > 1 ? (
                <TodayVeil x={padding.left + ((len - 2) / (len - 1)) * innerWidth} />
              ) : null}

              {activeChartX !== null ? (
                <g pointerEvents="none">
                  <line
                    x1={activeChartX}
                    x2={activeChartX}
                    y1={padding.top}
                    y2={baseline}
                    stroke="var(--foreground)"
                    strokeOpacity="0.18"
                  />
                  {heroPath && activeIndex !== null ? (
                    <circle
                      cx={heroPath.points[activeIndex].x}
                      cy={heroPath.points[activeIndex].y}
                      r={4.5}
                      fill="var(--card)"
                      stroke={colorOf(heroPath.series.id)}
                      strokeWidth="2.5"
                    />
                  ) : null}
                  {focusId && focusId !== heroPath?.series.id && activeIndex !== null
                    ? seriesPaths
                        .filter((entry) => entry.series.id === focusId)
                        .map(({ series, points, values }) => (
                          <React.Fragment key={`marker-${series.id}`}>
                            <circle
                              cx={points[activeIndex].x}
                              cy={points[activeIndex].y}
                              r={4}
                              fill="var(--card)"
                              stroke={colorOf(series.id)}
                              strokeWidth="2.5"
                            />
                            <text
                              x={Math.max(
                                padding.left + 38,
                                Math.min(chartWidth - padding.right - 38, points[activeIndex].x)
                              )}
                              y={points[activeIndex].y - 11}
                              textAnchor="middle"
                              fill="var(--foreground)"
                              fontSize="10.5"
                              fontFamily="var(--font-geist-mono)"
                            >
                              {series.name} · {values[activeIndex] ?? 0}
                            </text>
                          </React.Fragment>
                        ))
                    : null}
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
                color={colorOf(series.id)}
                hidden={hiddenIds.has(series.id)}
                isHero={hero?.series.id === series.id}
                emphasized={focusId === series.id}
                muted={focusId !== null && focusId !== series.id}
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

function TodayVeil({ x }: { x: number }) {
  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={padding.top}
        width={chartWidth - padding.right - x}
        height={innerHeight}
        fill="url(#project-today-veil)"
      />
      <line x1={x} x2={x} y1={padding.top - 6} y2={baseline} stroke="var(--border-strong)" />
      {/* Right-anchored: the strip is one day wide, so a left-anchored label
          would run off the plot. */}
      <text
        x={chartWidth - padding.right}
        y={padding.top - 9}
        textAnchor="end"
        fill="var(--faint)"
        fontSize="10.5"
        fontFamily="var(--font-geist-mono)"
      >
        today, so far
      </text>
    </g>
  );
}

function LegendEntry({
  series,
  color,
  hidden,
  isHero,
  emphasized,
  muted,
  onHover,
  onClick,
}: {
  series: ProjectTrendSeries;
  color: string;
  hidden: boolean;
  isHero: boolean;
  emphasized: boolean;
  muted: boolean;
  onHover: (id: string | null) => void;
  onClick: (altKey: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={!hidden}
      aria-label={`${series.name}: ${series.total} completions.${isHero ? " In focus." : ""} ${hidden ? "Hidden" : "Shown"} — click to toggle, option-click to solo.`}
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
          className={cn("max-w-[150px] truncate text-[12.5px]", isHero && !hidden ? "font-semibold" : "font-medium")}
          style={{ color: hidden ? "var(--faint)" : "var(--foreground)" }}
        >
          {series.name}
        </span>
        <span
          className="mt-[3px] rounded-full transition-[background-color,height]"
          style={{
            backgroundColor: hidden ? "var(--track)" : color,
            height: isHero && !hidden ? 3 : 2,
            width: 24,
          }}
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
