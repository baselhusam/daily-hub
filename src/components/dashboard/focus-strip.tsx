"use client";

import { Target, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { cn } from "@/lib/utils";

export type FocusStripProject = {
  kind: "project";
  id: string;
  name: string;
  color: string | null;
  logoUrl: string | null;
  iconKey: string;
  remaining: string;
  openCount: number;
};

export type FocusStripTask = {
  kind: "task";
  id: string;
  title: string;
  done: boolean;
  remaining: string;
  /** Null for an Inbox task. */
  project: { name: string; color: string | null } | null;
};

export type FocusStripItem = FocusStripProject | FocusStripTask;

type FocusStripProps = {
  items: FocusStripItem[];
  /** Focus mode is on: Today is narrowed to what is in focus. */
  active: boolean;
  onToggleMode: () => void;
  onJump: (item: FocusStripItem) => void;
  onToggleTask: (id: string, currentlyDone: boolean) => void;
  onClear: (item: FocusStripItem) => void;
};

const pillBase =
  "group/pill inline-flex h-[32px] max-w-full items-center rounded-full border border-border bg-card text-[12.5px] shadow-raised transition-[border-color,opacity] duration-[120ms] hover:border-border-strong";

/**
 * What the user chose to work on for the next few days, pinned above
 * everything else on Today. The lead pill switches focus mode, which narrows
 * the page to just these; each item pill jumps to its card or row, and its ×
 * takes it out of focus. Renders nothing when nothing is in focus.
 */
export function FocusStrip({
  items,
  active,
  onToggleMode,
  onJump,
  onToggleTask,
  onClear,
}: FocusStripProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="In focus">
      <button
        type="button"
        aria-pressed={active}
        onClick={onToggleMode}
        title={active ? "Show everything" : "Show only what's in focus"}
        className={cn(
          "inline-flex h-[32px] items-center gap-[7px] rounded-full border pr-[11px] pl-[9px] text-[12.5px] font-semibold transition-[border-color,background-color,box-shadow] duration-[120ms]",
          active
            ? "border-signal/50 bg-signal text-primary-foreground shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_16%,transparent)] hover:bg-signal-hover"
            : "border-signal/25 bg-signal-soft text-signal hover:border-signal/50"
        )}
      >
        <Target className="h-[14px] w-[14px] shrink-0" strokeWidth={2.4} />
        {active ? "Focus mode" : "In focus"}
        <span
          className={cn(
            "rounded-full px-[6px] text-[11px] tabular-nums",
            active ? "bg-white/20" : "bg-signal/12"
          )}
        >
          {items.length}
        </span>
        {active ? (
          <X aria-hidden className="-mr-0.5 h-[12px] w-[12px] shrink-0 opacity-80" strokeWidth={2.4} />
        ) : null}
      </button>

      {items.map((item) =>
        item.kind === "project" ? (
          <span key={`p-${item.id}`} className={pillBase}>
            <button
              type="button"
              onClick={() => onJump(item)}
              className="flex min-w-0 items-center gap-[7px] py-1 pr-1 pl-[6px] outline-none"
              title={`${item.name} · ${item.remaining}`}
            >
              <EntityAvatar
                name={item.name}
                color={item.color}
                logoUrl={item.logoUrl}
                iconKey={item.iconKey}
                size={20}
              />
              <span className="max-w-[12rem] truncate font-semibold text-foreground">
                {item.name}
              </span>
              <span className="shrink-0 text-faint whitespace-nowrap">
                {item.openCount === 1 ? "1 open" : `${item.openCount} open`} · {item.remaining}
              </span>
            </button>
            <ClearButton label={item.name} onClick={() => onClear(item)} />
          </span>
        ) : (
          <span key={`t-${item.id}`} className={cn(pillBase, item.done && "opacity-70")}>
            <span className="grid place-items-center pl-[9px]">
              <Checkbox
                checked={item.done}
                onCheckedChange={() => onToggleTask(item.id, item.done)}
                aria-label={`Toggle ${item.title}`}
                className="size-[15px] rounded-[4px]"
              />
            </span>
            <button
              type="button"
              onClick={() => onJump(item)}
              className="flex min-w-0 items-center gap-[7px] py-1 pr-1 pl-[7px] outline-none"
              title={`${item.title} · ${item.remaining}`}
            >
              <span
                className={cn(
                  "max-w-[16rem] truncate font-medium",
                  item.done
                    ? "text-muted-foreground line-through decoration-hairline"
                    : "text-foreground"
                )}
              >
                {item.title}
              </span>
              <span className="flex shrink-0 items-center gap-[5px] text-faint whitespace-nowrap">
                <span
                  aria-hidden
                  className="h-[6px] w-[6px] rounded-full"
                  style={{ backgroundColor: item.project?.color ?? "var(--hairline)" }}
                />
                <span className="max-w-[8rem] truncate">{item.project?.name ?? "Inbox"}</span>
              </span>
            </button>
            <ClearButton label={item.title} onClick={() => onClear(item)} />
          </span>
        )
      )}
    </div>
  );
}

function ClearButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Stop focusing on ${label}`}
      title="Stop focusing"
      className="mr-[5px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-hairline transition-colors duration-[120ms] hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20"
    >
      <X className="h-[12px] w-[12px]" strokeWidth={2.4} />
    </button>
  );
}
