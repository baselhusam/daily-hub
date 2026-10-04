"use client";

import { X } from "lucide-react";
import type { DashboardNudges } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

/** What a nudge pill (or the focus-mode pill) narrows Today down to. */
export type NudgeFocus =
  | { kind: "overdue" }
  | { kind: "stalled"; projectId: string }
  | { kind: "milestones" }
  | { kind: "focused" };

type NudgeRowProps = {
  nudges: DashboardNudges;
  active: NudgeFocus | null;
  /** Called with the pill's focus; the page clears it when it is already on. */
  onToggle: (focus: NudgeFocus) => void;
};

const pillBase =
  "inline-flex items-center gap-[7px] rounded-full border py-1.5 pr-[11px] pl-2 text-[12.5px] font-semibold transition-[border-color,background-color,opacity,box-shadow] duration-[120ms]";

export function isSameFocus(active: NudgeFocus | null, focus: NudgeFocus) {
  if (!active || active.kind !== focus.kind) return false;
  if (active.kind === "stalled" && focus.kind === "stalled") {
    return active.projectId === focus.projectId;
  }
  return true;
}

/**
 * A row of pills naming what deserves attention before the numbers: slipped
 * tasks, projects that have gone quiet, and milestones landing this week.
 * Each pill toggles a focus that filters the page down to what it names.
 * Renders nothing when there is nothing to say.
 */
export function NudgeRow({ nudges, active, onToggle }: NudgeRowProps) {
  const { overdue, stalled, milestonesThisWeek } = nudges;
  const stalledShown = stalled.slice(0, 2);
  const milestoneCount = milestonesThisWeek.length;
  if (overdue.count === 0 && stalledShown.length === 0 && milestoneCount === 0) {
    return null;
  }

  // While one pill is on, the others step back so the row reads as a filter.
  const stateClass = (focus: NudgeFocus, activeClass: string) =>
    isSameFocus(active, focus)
      ? activeClass
      : active
        ? "opacity-55 hover:opacity-100"
        : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Needs attention">
      {overdue.count > 0 ? (
        <button
          type="button"
          aria-pressed={isSameFocus(active, { kind: "overdue" })}
          onClick={() => onToggle({ kind: "overdue" })}
          className={cn(
            pillBase,
            "border-destructive/20 bg-destructive-wash text-destructive hover:border-destructive/40",
            stateClass(
              { kind: "overdue" },
              "border-destructive/50 shadow-[0_0_0_3px_color-mix(in_srgb,var(--destructive)_12%,transparent)]"
            )
          )}
        >
          <Dot color="var(--destructive)" />
          {overdue.count} overdue
          {overdue.oldestDays > 0 ? (
            <span className="font-normal opacity-80">oldest {overdue.oldestDays}d</span>
          ) : null}
          <ActiveMark shown={isSameFocus(active, { kind: "overdue" })} />
        </button>
      ) : null}
      {stalledShown.map((project) => {
        const focus: NudgeFocus = { kind: "stalled", projectId: project.id };
        return (
          <button
            key={project.id}
            type="button"
            aria-pressed={isSameFocus(active, focus)}
            onClick={() => onToggle(focus)}
            className={cn(
              pillBase,
              "border-warn-border bg-warn-wash text-warn hover:border-warn/50",
              stateClass(
                focus,
                "border-warn/60 shadow-[0_0_0_3px_color-mix(in_srgb,var(--warn)_14%,transparent)]"
              )
            )}
          >
            <Dot color="var(--warn)" />
            <span className="max-w-[14rem] truncate">{project.name} stalled</span>
            <span className="font-normal opacity-80">{project.idleDays} days quiet</span>
            <ActiveMark shown={isSameFocus(active, focus)} />
          </button>
        );
      })}
      {milestoneCount > 0 ? (
        <button
          type="button"
          aria-pressed={isSameFocus(active, { kind: "milestones" })}
          onClick={() => onToggle({ kind: "milestones" })}
          className={cn(
            pillBase,
            "border-border bg-card text-ink-soft hover:border-border-strong",
            stateClass(
              { kind: "milestones" },
              "border-done/50 shadow-[0_0_0_3px_color-mix(in_srgb,var(--done)_14%,transparent)]"
            )
          )}
        >
          <Dot color="var(--done)" />
          {milestoneCount === 1 ? "1 milestone this week" : `${milestoneCount} milestones this week`}
          <ActiveMark shown={isSameFocus(active, { kind: "milestones" })} />
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

/** The × on a pill that is on, so it reads as "click to clear". */
function ActiveMark({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return <X aria-hidden className="-mr-0.5 h-[12px] w-[12px] shrink-0 opacity-70" strokeWidth={2.4} />;
}
