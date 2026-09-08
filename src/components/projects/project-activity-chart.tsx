"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { labelIndexesFor, smoothPath } from "@/lib/chart-path";
import type { ProjectDetailActivityPoint } from "@/lib/project-detail";

const CHART_WIDTH = 760;
const CHART_HEIGHT = 220;
const PADDING = { top: 18, right: 12, bottom: 28, left: 14 };

const dotSpring = { type: "spring" as const, stiffness: 420, damping: 32 };

/**
 * One line: tasks this project closed per day. Shares the Daily-rhythm chart's
 * geometry and interaction, but wears the project's accent instead of the
 * signal blue so the page reads as belonging to that project.
 */
export function ProjectActivityChart({
  points,
  color,
}: {
  points: ProjectDetailActivityPoint[];
  color: string;
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const gradientId = React.useId();

  // A single point can't be drawn as a path; mirror it so the line has length.
  const safePoints = points.length > 1 ? points : [...points, ...points];
  const max = Math.max(3, ...safePoints.map((point) => point.count));
  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const baseline = CHART_HEIGHT - PADDING.bottom;

  const chartPoints = safePoints.map((point, index) => ({
    x: PADDING.left + (index / (safePoints.length - 1)) * innerWidth,
    y: PADDING.top + innerHeight - (point.count / max) * innerHeight,
  }));
  // Tighten the curve: a lone spike in an otherwise-quiet project should read
  // as one busy day, not a week of momentum.
  const linePath = smoothPath(chartPoints, 0.6);
  const areaPath = `${linePath} L ${chartPoints.at(-1)?.x ?? CHART_WIDTH} ${baseline} L ${chartPoints[0]?.x ?? 0} ${baseline} Z`;
  const labelIndexes = labelIndexesFor(safePoints.length, 5);

  const activePoint = activeIndex === null ? null : safePoints[activeIndex];
  const activeChartPoint = activeIndex === null ? null : chartPoints[activeIndex];
  const total = points.reduce((sum, point) => sum + point.count, 0);

  function setIndexFromPointer(event: React.PointerEvent<SVGSVGElement>) {
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
    <div className="relative h-[190px] sm:h-[220px]">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="block h-full w-full cursor-crosshair touch-pan-y outline-none"
        role="group"
        tabIndex={0}
        aria-label={
          activePoint
            ? `${activePoint.fullLabel}: ${activePoint.count} finished`
            : `${total} tasks finished across ${points.length} days. Hover or use the arrow keys to inspect a day.`
        }
        onPointerMove={setIndexFromPointer}
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
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((fraction) => {
          const y = PADDING.top + innerHeight * (1 - fraction);
          return (
            <line
              key={fraction}
              x1={PADDING.left}
              x2={CHART_WIDTH - PADDING.right}
              y1={y}
              y2={y}
              stroke="var(--rule-soft)"
              strokeDasharray="2 5"
            />
          );
        })}
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: reducedMotion ? 0 : 0.12 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
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
        {activeChartPoint ? (
          <g pointerEvents="none">
            <line
              x1={activeChartPoint.x}
              x2={activeChartPoint.x}
              y1={PADDING.top}
              y2={baseline}
              stroke={color}
              strokeOpacity="0.35"
              strokeDasharray="3 4"
            />
            <motion.circle
              r={5}
              fill="var(--card)"
              stroke={color}
              strokeWidth="2.5"
              animate={{ cx: activeChartPoint.x, cy: activeChartPoint.y }}
              transition={reducedMotion ? { duration: 0 } : dotSpring}
            />
          </g>
        ) : null}
        {labelIndexes.map((index) => (
          <text
            key={`label-${index}`}
            x={chartPoints[index].x}
            y={CHART_HEIGHT - 8}
            textAnchor={
              index === 0
                ? "start"
                : index === safePoints.length - 1
                  ? "end"
                  : "middle"
            }
            fill="var(--faint)"
            fontSize="10.5"
            fontFamily="var(--font-geist-mono)"
          >
            {safePoints[index]?.label}
          </text>
        ))}
      </svg>
      {activePoint && activeChartPoint ? (
        <ChartTooltip
          x={activeChartPoint.x}
          chartWidth={CHART_WIDTH}
          title={activePoint.fullLabel}
          rows={[{ label: "finished", value: String(activePoint.count), color }]}
        />
      ) : null}
    </div>
  );
}
