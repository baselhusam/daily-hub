"use client";

import * as React from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import type { DashboardDailyTask } from "@/lib/dashboard";
import type { HabitDot } from "@/lib/today-insights";
import { cn, sortCompletedLast } from "@/lib/utils";
import { CardHeading, TodayCard } from "./today-card";

type HabitsCardProps = {
  habits: DashboardDailyTask[];
  getDone: (id: string, fallback: boolean) => boolean;
  onToggle: (id: string, currentlyDone: boolean) => void;
  className?: string;
};

function rateColor(rate: number | null) {
  if (rate === null) return "var(--faint)";
  if (rate >= 80) return "var(--done)";
  if (rate >= 55) return "var(--muted-foreground)";
  return "var(--destructive)";
}

function dotColor(dot: HabitDot, doneToday: boolean, isToday: boolean) {
  if (isToday) return doneToday ? "var(--done)" : "var(--track)";
  if (dot === "hit") return "var(--chart-ink)";
  if (dot === "off") return "var(--rule-soft)";
  return "var(--track)";
}

/**
 * Today's habits with a per-row week strip and trailing completion rate.
 * Finished rows sink to the bottom so the next thing to do is always on top.
 */
export function HabitsCard({ habits, getDone, onToggle, className }: HabitsCardProps) {
  const done = habits.filter((habit) => getDone(habit.id, habit.completedToday)).length;
  const pct = habits.length === 0 ? 0 : Math.round((done / habits.length) * 100);
  const ordered = sortCompletedLast(habits, (habit) =>
    getDone(habit.id, habit.completedToday)
  );

  return (
    <TodayCard className={cn("overflow-hidden", className)} aria-labelledby="habits-heading">
      <div className="flex items-center justify-between gap-3 px-4 pt-[13px] pb-[11px]">
        <CardHeading id="habits-heading">Today’s habits</CardHeading>
        <span className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">
            {done}/{habits.length}
          </span>
          <span className="h-1 w-11 overflow-hidden rounded-full bg-track">
            <span
              className="block h-full rounded-full bg-signal transition-[width] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]"
              style={{ width: `${pct}%` }}
            />
          </span>
        </span>
      </div>
      <div className="border-t border-rule-soft pt-1 pb-1.5">
        {habits.length === 0 ? (
          <p className="px-4 py-3 text-[12.5px] leading-relaxed text-faint">
            Nothing scheduled today.{" "}
            <Link href="/daily" className="font-semibold text-signal hover:text-signal-hover">
              Manage habits
            </Link>
          </p>
        ) : (
          ordered.map((habit) => {
            const isDone = getDone(habit.id, habit.completedToday);
            return (
              <div
                key={habit.id}
                onClick={() => onToggle(habit.id, isDone)}
                className="flex cursor-pointer items-center gap-2.5 px-4 py-[7px] transition-colors duration-[120ms] hover:bg-canvas-sunk"
              >
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => onToggle(habit.id, isDone)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Toggle ${habit.title}`}
                />
                <EntityAvatar
                  name={habit.title}
                  logoUrl={habit.logoUrl}
                  iconKey={habit.iconKey}
                  size={22}
                  className={cn("transition-opacity duration-[140ms]", isDone && "opacity-45")}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13.5px]",
                    isDone
                      ? "text-muted-foreground line-through decoration-hairline"
                      : "text-foreground"
                  )}
                  title={habit.carriedOver ? `${habit.title} · carried over` : habit.title}
                >
                  {habit.title}
                </span>
                <span className="flex gap-0.5" aria-hidden>
                  {habit.dots.map((dot, index) => (
                    <span
                      key={index}
                      className="h-[5px] w-[5px] rounded-full"
                      style={{
                        backgroundColor: dotColor(
                          dot,
                          isDone,
                          index === habit.dots.length - 1
                        ),
                      }}
                    />
                  ))}
                </span>
                <span
                  className="w-8 text-right text-[11.5px] font-semibold tabular-nums"
                  style={{ color: rateColor(habit.rate) }}
                  title={habit.rate === null ? "No history yet" : "Kept over the last two weeks"}
                >
                  {habit.rate === null ? "—" : `${habit.rate}%`}
                </span>
              </div>
            );
          })
        )}
      </div>
    </TodayCard>
  );
}
