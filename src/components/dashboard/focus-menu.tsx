"use client";

import * as React from "react";
import { Target, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FOCUS_SPAN_LABELS, FOCUS_SPANS, type FocusSpan } from "@/lib/focus";
import { cn } from "@/lib/utils";

const itemClass =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13.5px] font-medium outline-none transition-colors duration-[120ms] hover:bg-hover focus-visible:bg-hover";

/**
 * The span choices behind every focus control: how long to keep something in
 * focus, plus a way out once it is. Lives inside a popover.
 */
export function FocusSpanItems({
  remaining,
  onPick,
}: {
  /** The active focus's time left; null when not in focus. */
  remaining: string | null;
  onPick: (span: FocusSpan | null) => void;
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-2 px-2 pt-1.5 pb-1">
        <span className="text-[10.5px] font-semibold tracking-[0.06em] text-faint uppercase">
          {remaining ? "In focus" : "Focus on this"}
        </span>
        {remaining ? (
          <span className="text-[11px] font-semibold text-signal">{remaining}</span>
        ) : null}
      </div>
      <div role="menu" aria-label="Focus" className="space-y-0.5">
        {FOCUS_SPANS.map((span) => (
          <button
            key={span}
            type="button"
            role="menuitem"
            onClick={() => onPick(span)}
            className={itemClass}
          >
            <Target className="h-[14px] w-[14px] shrink-0 text-faint" strokeWidth={2.2} />
            <span className="min-w-0 flex-1 truncate">
              {remaining ? `Refocus · ${FOCUS_SPAN_LABELS[span].toLowerCase()}` : FOCUS_SPAN_LABELS[span]}
            </span>
          </button>
        ))}
        {remaining ? (
          <>
            <div className="my-1 border-t border-rule-soft" />
            <button
              type="button"
              role="menuitem"
              onClick={() => onPick(null)}
              className={cn(itemClass, "text-muted-foreground hover:text-foreground")}
            >
              <X className="h-[14px] w-[14px] shrink-0" strokeWidth={2.2} />
              <span className="flex-1">Stop focusing</span>
            </button>
          </>
        ) : null}
      </div>
    </>
  );
}

/**
 * The target on a task row. Quiet until hovered; once the task is in focus it
 * stays lit so the row reads as focused at a glance.
 */
export function TaskFocusButton({
  title,
  remaining,
  onPick,
}: {
  title: string;
  remaining: string | null;
  onPick: (span: FocusSpan | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const focused = remaining !== null;
  // The row toggles its task on click; keep the menu's clicks from reaching it.
  const contain = {
    onClick: (event: React.SyntheticEvent) => event.stopPropagation(),
    onKeyDown: (event: React.SyntheticEvent) => event.stopPropagation(),
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          {...contain}
          aria-label={focused ? `${title} is in focus` : `Focus on ${title}`}
          title={focused ? `In focus · ${remaining}` : "Focus on this"}
          className={cn(
            "grid h-6 w-6 place-items-center rounded-[6px] transition-[color,background-color,opacity] duration-[120ms] hover:bg-hover focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20",
            focused
              ? "text-signal"
              : "text-hairline opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 hover:text-foreground",
            open && "bg-hover opacity-100"
          )}
        >
          <Target className="h-[13px] w-[13px]" strokeWidth={focused ? 2.4 : 2} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[13.5rem] p-1" {...contain}>
        <FocusSpanItems
          remaining={remaining}
          onPick={(span) => {
            setOpen(false);
            onPick(span);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
