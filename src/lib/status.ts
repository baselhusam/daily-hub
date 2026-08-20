import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  CirclePlay,
  Layers,
  Pause,
} from "lucide-react";

export type ProjectStatus = "ACTIVE" | "PAUSED" | "DONE";
export type TaskStatus = "TODO" | "DOING" | "DONE";
export type OptionTone = "signal" | "warn" | "done" | "muted";

export type StatusOption<T extends string = string> = {
  value: T;
  label: string;
  Icon: LucideIcon;
  tone: OptionTone;
};

export const PROJECT_STATUS_ORDER = [
  "ACTIVE",
  "PAUSED",
  "DONE",
] as const satisfies readonly ProjectStatus[];

export const PROJECT_STATUSES: Record<ProjectStatus, StatusOption<ProjectStatus>> =
  {
    ACTIVE: {
      value: "ACTIVE",
      label: "Active",
      Icon: CirclePlay,
      tone: "signal",
    },
    PAUSED: {
      value: "PAUSED",
      label: "Paused",
      Icon: Pause,
      tone: "warn",
    },
    DONE: {
      value: "DONE",
      label: "Done",
      Icon: CheckCircle2,
      tone: "done",
    },
  };

export const ALL_STATUSES_OPTION: StatusOption<"all"> = {
  value: "all",
  label: "All statuses",
  Icon: Layers,
  tone: "muted",
};

export const HABIT_STATUSES: Record<"true" | "false", StatusOption<"true" | "false">> =
  {
    true: {
      value: "true",
      label: "Active",
      Icon: CirclePlay,
      tone: "signal",
    },
    false: {
      value: "false",
      label: "Paused",
      Icon: Pause,
      tone: "warn",
    },
  };

export function getProjectStatus(status: ProjectStatus) {
  return PROJECT_STATUSES[status];
}

export function getHabitStatus(isActive: boolean) {
  return HABIT_STATUSES[isActive ? "true" : "false"];
}
