"use client";

import Link from "next/link";
import type { DashboardNudges } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

type NudgeRowProps = {
  nudges: DashboardNudges;
  onJumpToOverdue: () => void;
  onJumpToUpNext: () => void;
};

const pillBase =
  "inline-flex items-center gap-[7px] rounded-full border py-1.5 pr-[11px] pl-2 text-[12.5px] font-semibold transition-[border-color,background-color] duration-[120ms]";

/**
 * A row of pills naming what deserves attention before the numbers: slipped
 * tasks, projects that have gone quiet, and milestones landing this week.
 * Renders nothing when there is nothing to say.
 */
export function NudgeRow({ nudges, onJumpToOverdue, onJumpToUpNext }: NudgeRowProps) {
  const { overdue, stalled, milestonesThisWeek } = nudges;
  const stalledShown = stalled.slice(0, 2);
  if (overdue.count === 0 && stalledShown.length === 0 && milestonesThisWeek === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Needs attention">
      {overdue.count > 0 ? (
        <button
          type="button"
          onClick={onJumpToOverdue}
          className={cn(
            pillBase,
            "border-destructive/20 bg-destructive-wash text-destructive hover:border-destructive/40"
          )}
        >
          <Dot color="var(--destructive)" />
          {overdue.count} overdue
          {overdue.oldestDays > 0 ? (
            <span className="font-normal opacity-80">oldest {overdue.oldestDays}d</span>
          ) : null}
        </button>
      ) : null}
      {stalledShown.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className={cn(
            pillBase,
            "border-warn-border bg-warn-wash text-warn hover:border-warn/50"
          )}
        >
          <Dot color="var(--warn)" />
          <span className="max-w-[14rem] truncate">{project.name} stalled</span>
          <span className="font-normal opacity-80">{project.idleDays} days quiet</span>
        </Link>
      ))}
      {milestonesThisWeek > 0 ? (
        <button
          type="button"
          onClick={onJumpToUpNext}
          className={cn(pillBase, "border-border bg-card text-ink-soft hover:border-border-strong")}
        >
          <Dot color="var(--done)" />
          {milestonesThisWeek === 1
            ? "1 milestone this week"
            : `${milestonesThisWeek} milestones this week`}
        </button>
      ) : null}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="h-[7px] w-[7px] shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
