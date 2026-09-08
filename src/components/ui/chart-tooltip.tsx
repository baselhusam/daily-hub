"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ChartTooltipRow = {
  label: string;
  value: string;
  color?: string;
};

type ChartTooltipProps = {
  x: number;
  chartWidth: number;
  title: string;
  rows: ChartTooltipRow[];
  compact?: boolean;
  /**
   * "headline" (default) reproduces the Daily-rhythm tooltip exactly: rows[0]
   * as an inline headline stat, the rest as one dot-led "·"-joined line.
   *
   * "list" renders one coloured-dot row per entry, each on its own line,
   * capped at 6 with a "+N more" footer — for charts with many series (e.g.
   * Project rhythm) where a single joined line would overflow.
   */
  layout?: "headline" | "list";
  /**
   * "top" floats the card inside the plot area (line charts, where the data
   * sits low). "bottom" hangs it under the plot — used by dense tile strips,
   * where an overlaid card would cover the very tiles being scanned.
   */
  placement?: "top" | "bottom";
};

const MAX_LIST_ROWS = 6;

/**
 * The first row is rendered as the headline stat beside the title (e.g. "9 finished");
 * any remaining rows form a single dot-led breakdown line joined by "·" separators.
 */
export function ChartTooltip({
  x,
  chartWidth,
  title,
  rows,
  compact = false,
  layout = "headline",
  placement = "top",
}: ChartTooltipProps) {
  const isRightHalf = x > chartWidth / 2;
  const placementClass =
    placement === "bottom" ? "top-full mt-2" : compact ? "top-1.5" : "top-3";

  const containerStyle: React.CSSProperties = {
    left: `${(x / chartWidth) * 100}%`,
    transform: `translateX(${isRightHalf ? "calc(-100% - 8px)" : "8px"})`,
  };

  if (layout === "list") {
    const visible = rows.slice(0, MAX_LIST_ROWS);
    const extra = rows.length - visible.length;

    return (
      <div
        className={cn(
          "pointer-events-none absolute z-10 w-[190px] rounded-[8px] border border-border bg-card/95 px-2.5 py-2 text-[10.5px] shadow-float backdrop-blur-sm",
          placementClass
        )}
        style={containerStyle}
      >
        <p className="truncate font-medium text-foreground">{title}</p>
        {visible.length > 0 ? (
          <div className="mt-1.5 flex flex-col gap-[3px]">
            {visible.map((row) => (
              <div key={row.label} className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color ?? "var(--signal)" }}
                />
                <span className="min-w-0 flex-1 truncate text-faint">{row.label}</span>
                <span className="shrink-0 font-mono font-semibold tabular-nums text-foreground">
                  {row.value}
                </span>
              </div>
            ))}
            {extra > 0 ? (
              <p className="pl-3 text-faint">+{extra} more</p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const [headline, ...breakdown] = rows;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 w-[164px] rounded-[8px] border border-border bg-card/95 px-2.5 py-2 text-[10.5px] shadow-float backdrop-blur-sm",
        placementClass
      )}
      style={containerStyle}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-foreground">{title}</span>
        {headline ? (
          <span
            className="shrink-0 font-mono font-semibold tabular-nums"
            style={{ color: headline.color ?? "var(--signal)" }}
          >
            {headline.value} {headline.label}
          </span>
        ) : null}
      </div>
      {breakdown.length > 0 ? (
        <div className="mt-1 flex items-center gap-1.5 text-faint">
          <span
            className="h-1 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: breakdown[0].color ?? "var(--signal)" }}
          />
          {breakdown.map((row, index) => (
            <React.Fragment key={row.label}>
              {index > 0 ? <span className="text-rule">·</span> : null}
              <span>{row.value} {row.label}</span>
            </React.Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
