"use client";

import type { LucideIcon } from "lucide-react";
import type { SelectMenuOption } from "@/components/ui/select-menu";
import { getIcon, getIconLabel, ICON_OPTIONS } from "@/lib/icons";
import {
  ALL_STATUSES_OPTION,
  getHabitStatus,
  getProjectStatus,
  HABIT_STATUSES,
  PROJECT_STATUS_ORDER,
  PROJECT_STATUSES,
  type OptionTone,
  type ProjectStatus,
  type StatusOption,
} from "@/lib/status";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<
  OptionTone,
  { color: string; backgroundColor: string; borderColor: string }
> = {
  signal: {
    color: "var(--signal)",
    backgroundColor: "var(--signal-wash)",
    borderColor: "color-mix(in srgb, var(--signal) 28%, transparent)",
  },
  warn: {
    color: "var(--warn)",
    backgroundColor: "var(--warn-wash)",
    borderColor: "var(--warn-border)",
  },
  done: {
    color: "var(--done)",
    backgroundColor: "var(--done-wash)",
    borderColor: "color-mix(in srgb, var(--done) 28%, transparent)",
  },
  muted: {
    color: "var(--muted-foreground)",
    backgroundColor: "var(--muted)",
    borderColor: "var(--border)",
  },
};

type OptionMarkProps = {
  icon: LucideIcon;
  tone: OptionTone;
  size?: number;
  className?: string;
};

export function OptionMark({
  icon: Icon,
  tone,
  size = 18,
  className,
}: OptionMarkProps) {
  const iconSize = Math.max(10, Math.round(size * 0.58));
  const styles = TONE_STYLES[tone];

  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-[5px] border",
        className
      )}
      style={{
        width: size,
        height: size,
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
      }}
      aria-hidden
    >
      <Icon
        style={{ width: iconSize, height: iconSize }}
        strokeWidth={2.4}
      />
    </span>
  );
}

function statusToMenuOption<T extends string>(
  option: StatusOption<T>
): SelectMenuOption {
  return {
    value: option.value,
    label: option.label,
    leading: <OptionMark icon={option.Icon} tone={option.tone} />,
  };
}

export function projectStatusMenuOptions(): SelectMenuOption[] {
  return PROJECT_STATUS_ORDER.map((status) =>
    statusToMenuOption(PROJECT_STATUSES[status])
  );
}

export function projectStatusFilterOptions(): SelectMenuOption[] {
  return [
    statusToMenuOption(ALL_STATUSES_OPTION),
    ...projectStatusMenuOptions(),
  ];
}

export function habitStatusMenuOptions(): SelectMenuOption[] {
  return [
    statusToMenuOption(HABIT_STATUSES.true),
    statusToMenuOption(HABIT_STATUSES.false),
  ];
}

export function habitStatusFilterOptions(): SelectMenuOption[] {
  return [
    {
      value: "all",
      label: "All habits",
      leading: <OptionMark icon={ALL_STATUSES_OPTION.Icon} tone="muted" />,
    },
    ...habitStatusMenuOptions(),
  ];
}

export function iconMenuOptions(): SelectMenuOption[] {
  return ICON_OPTIONS.map((icon) => {
    const Icon = getIcon(icon);
    return {
      value: icon,
      label: getIconLabel(icon),
      leading: <OptionMark icon={Icon} tone="muted" />,
    };
  });
}

type StatusChipProps = {
  status?: ProjectStatus;
  active?: boolean;
  className?: string;
};

export function StatusChip({ status, active, className }: StatusChipProps) {
  const option =
    status !== undefined ? getProjectStatus(status) : getHabitStatus(active ?? true);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-paper py-0.5 pr-2 pl-0.5 text-[11.5px] font-semibold tracking-[0.01em]",
        className
      )}
    >
      <OptionMark icon={option.Icon} tone={option.tone} size={16} />
      {option.label}
    </span>
  );
}
