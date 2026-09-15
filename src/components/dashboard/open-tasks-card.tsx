"use client";

import * as React from "react";
import type { OpenMix } from "@/lib/today-insights";
import { cn } from "@/lib/utils";
import { Eyebrow, TodayCard } from "./today-card";

type OpenTasksCardProps = {
  total: number;
  /** Open now minus open a week ago; negative is progress. */
  delta: number;
  mix: OpenMix;
  scopeLabel?: string;
  onJumpToOverdue?: () => void;
};

type Segment = {
  key: keyof OpenMix;
  count: number;
  label: string;
  color: string;
};

/**
 * The open-task count with a stacked bar splitting it into overdue, due
 * today and later. Hovering a segment rewrites the footer with its share.
 */
export function OpenTasksCard({
  total,
  delta,
  mix,
  scopeLabel = "all projects",
  onJumpToOverdue,
}: OpenTasksCardProps) {
  const [hover, setHover] = React.useState<keyof OpenMix | null>(null);
  const segments: Segment[] = [
    { key: "overdue", count: mix.overdue, label: "overdue", color: "var(--destructive)" },
    { key: "dueToday", count: mix.dueToday, label: "due today", color: "var(--signal)" },
    { key: "later", count: mix.later, label: "later", color: "var(--border-strong)" },
  ];
  const attention = mix.overdue + mix.dueToday;
  const hovered = segments.find((segment) => segment.key === hover);
  const foot = hovered
    ? `${hovered.count} of ${total} ${total === 1 ? "task" : "tasks"} ${hovered.label}`
    : total === 0
      ? "Nothing open — nice."
      : attention === 0
        ? "Nothing due before tomorrow"
        : `${Math.round((attention / total) * 100)}% needs attention this week`;

  return (
    <TodayCard interactive aria-labelledby="open-tasks-heading" className="flex flex-col px-4 pt-3.5 pb-3.5">
      <div className="flex h-[18px] items-center justify-between gap-3">
        <Eyebrow id="open-tasks-heading">Open tasks</Eyebrow>
        <span className="truncate text-[11px] text-faint">{scopeLabel}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[34px] leading-none font-semibold tracking-[-0.035em] tabular-nums">
          {total}
        </span>
        {delta !== 0 ? (
          <span
            className={cn(
              "inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
              delta < 0 ? "bg-done-wash text-done" : "bg-warn-wash text-warn"
            )}
            title={`${Math.abs(delta)} ${delta < 0 ? "fewer" : "more"} open than a week ago`}
          >
            {delta < 0 ? "−" : "+"}
            {Math.abs(delta)}
          </span>
        ) : null}
      </div>

      <div
        className="mt-[13px] flex h-[9px] gap-[3px]"
        role="img"
        aria-label={`${mix.overdue} overdue, ${mix.dueToday} due today, ${mix.later} later`}
        onMouseLeave={() => setHover(null)}
      >
        {total === 0 ? (
          <span className="flex-1 rounded-[3px] bg-track" />
        ) : (
          segments
            .filter((segment) => segment.count > 0)
            .map((segment) => (
              <button
                key={segment.key}
                type="button"
                tabIndex={-1}
                title={`${segment.count} ${segment.label}`}
                onMouseEnter={() => setHover(segment.key)}
                onClick={segment.key === "overdue" ? onJumpToOverdue : undefined}
                className={cn(
                  "min-w-[6px] rounded-[3px] transition-opacity duration-[140ms]",
                  segment.key === "overdue" && onJumpToOverdue ? "cursor-pointer" : "cursor-default",
                  hover && hover !== segment.key ? "opacity-35" : "opacity-100"
                )}
                style={{ flex: `${segment.count} 1 0%`, backgroundColor: segment.color }}
              />
            ))
        )}
      </div>

      <div className="mt-[11px] flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground"
            onMouseEnter={() => setHover(segment.key)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-[2px]"
              style={{ backgroundColor: segment.color }}
            />
            <span
              className={cn(
                "font-semibold tabular-nums",
                hover === segment.key ? "text-foreground" : "text-ink-soft"
              )}
            >
              {segment.count}
            </span>
            {segment.label}
          </span>
        ))}
      </div>

      <div
        className={cn(
          "mt-auto pt-[11px] text-[11.5px]",
          hovered ? "font-semibold text-foreground" : "text-muted-foreground"
        )}
        aria-live="polite"
      >
        {foot}
      </div>
    </TodayCard>
  );
}
