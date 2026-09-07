"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SparkBar } from "@/lib/streak-utils";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

type SnapshotCardProps = {
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
  color?: string;
  hint: string;
  hintColor?: string;
  foot?: string;
  bars?: SparkBar[];
  logoUrl?: string | null;
  iconKey?: string | null;
  entityName?: string;
  entityColor?: string | null;
  onExpand?: () => void;
  className?: string;
};

export function SnapshotCard({
  label,
  value,
  unit,
  valueColor,
  color,
  hint,
  hintColor = "var(--faint)",
  foot,
  bars,
  logoUrl,
  iconKey,
  entityName,
  entityColor,
  onExpand,
  className,
}: SnapshotCardProps) {
  const metricColor = valueColor ?? color ?? "var(--foreground)";
  const showMark = Boolean(entityName && (logoUrl || iconKey));
  const sparkTotal = bars?.reduce((sum, bar) => sum + bar.value, 0) ?? 0;

  return (
    <div
      className={cn(
        "group flex min-h-[112px] flex-col rounded-[12px] border border-border bg-card px-3.5 py-3 transition-[border-color] duration-[120ms] hover:border-border-strong",
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold tracking-[0.02em] text-faint">
          {label}
        </div>
        <div className="flex items-center gap-1">
          {unit ? (
            <span className="text-[11px] text-faint">{unit}</span>
          ) : null}
          {onExpand ? (
            <button
              type="button"
              onClick={onExpand}
              aria-label={`Expand ${label} analysis`}
              title={`Expand ${label} analysis`}
              className="grid h-5 w-5 place-items-center rounded text-faint opacity-0 transition-[opacity,color,background-color] hover:bg-hover hover:text-foreground focus:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14 group-hover:opacity-100"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-1.5 text-metric" style={{ color: metricColor }}>
        {value}
      </div>
      {bars && bars.length > 0 ? (
        <InteractiveSparkBars
          bars={bars}
          label={label}
          total={sparkTotal}
          onExpand={onExpand}
        />
      ) : (
        <div className="mt-2.5 h-8" />
      )}
      <div className="mt-auto flex items-center gap-1.5 pt-2">
        {showMark && entityName ? (
          <EntityAvatar
            name={entityName}
            color={entityColor}
            logoUrl={logoUrl}
            iconKey={iconKey}
            size={16}
          />
        ) : null}
        <span
          className="min-w-0 flex-1 truncate text-[12px]"
          style={{ color: hintColor }}
        >
          {hint}
        </span>
        {foot ? (
          <span className="shrink-0 text-[11.5px] text-faint tabular-nums">
            {foot}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function InteractiveSparkBars({
  bars,
  label,
  total,
  onExpand,
}: {
  bars: SparkBar[];
  label: string;
  total: number;
  onExpand?: () => void;
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const activeBar = activeIndex !== null ? bars[activeIndex] : null;
  const activeTitle = activeBar ? activeBar.fullLabel ?? activeBar.label ?? null : null;
  const summary = `${total} across ${bars.length} days for ${label}`;

  function moveActiveIndex(direction: -1 | 1) {
    setActiveIndex((current) => {
      const start = current ?? bars.length - 1;
      return Math.max(0, Math.min(bars.length - 1, start + direction));
    });
  }

  return (
    <div className="relative mt-2.5">
      <div
        className="flex h-8 items-end gap-[3px] outline-none"
        role="group"
        tabIndex={0}
        aria-label={
          activeBar
            ? `${activeTitle ?? "Selected day"}: ${activeBar.value} closed`
            : summary
        }
        onPointerLeave={() => setActiveIndex(null)}
        onFocus={() => setActiveIndex(bars.length - 1)}
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
            setActiveIndex(bars.length - 1);
          }
        }}
      >
        {bars.map((bar, index) => {
          const isActive = activeIndex === index;
          const dimmed = activeIndex !== null && !isActive;
          const baseColor = bar.empty
            ? "var(--hairline)"
            : bar.today
              ? "var(--signal)"
              : "var(--foreground)";
          const baseOpacity = bar.empty ? 0.55 : bar.today ? 1 : 0.82;
          const title = bar.fullLabel ?? bar.label;

          return (
            <motion.button
              key={bar.date ?? index}
              type="button"
              tabIndex={-1}
              aria-label={title ? `${title}: ${bar.value} closed` : undefined}
              className="min-h-[3px] flex-1 rounded-[2px] transition-[background-color,opacity,box-shadow] duration-[120ms] focus-visible:outline-none"
              style={{
                height: `${bar.height}%`,
                originY: 1,
                backgroundColor: isActive ? "var(--signal)" : baseColor,
                opacity: isActive ? 1 : dimmed ? 0.45 : baseOpacity,
                boxShadow: isActive ? "0 0 0 2px var(--signal-wash)" : "none",
              }}
              initial={reducedMotion ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.28, delay: index * 0.03, ease: [0.2, 0.8, 0.3, 1] }
              }
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => onExpand?.()}
            />
          );
        })}
      </div>
      {activeBar && activeTitle ? (
        <ChartTooltip
          x={activeIndex! + 0.5}
          chartWidth={bars.length}
          title={activeTitle}
          compact
          rows={[
            { label: "closed", value: String(activeBar.value), color: "var(--signal)" },
          ]}
        />
      ) : null}
    </div>
  );
}
