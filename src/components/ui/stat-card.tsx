"use client";

import * as React from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the three "daily pulse" widgets at the top of Today.
 *
 * They used to each carry their own border/shadow/hover recipe, which drifted:
 * one card had no elevation, another no hover state, and the metric numbers
 * landed at three different heights across the row. Everything visual lives
 * here now so the row reads as one set of cards.
 */

export const STAT_CARD_MIN_HEIGHT = "min-h-[124px]";

type StatCardShellProps = React.ComponentPropsWithoutRef<"section"> & {
  children: React.ReactNode;
};

export function StatCardShell({ className, children, ...props }: StatCardShellProps) {
  return (
    <section
      className={cn(
        "group/stat flex flex-col rounded-[12px] border border-border bg-card px-3.5 py-3 text-foreground shadow-raised",
        "transition-[border-color,box-shadow] duration-[140ms] hover:border-border-strong hover:shadow-float",
        STAT_CARD_MIN_HEIGHT,
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

type StatCardHeaderProps = {
  /** Rendered at 14px in the signal colour, ahead of the label. */
  icon?: React.ReactNode;
  label: string;
  labelId?: string;
  /** Small right-aligned context, e.g. "last 30 days". */
  meta?: React.ReactNode;
  onExpand?: () => void;
  expandLabel?: string;
};

/**
 * A fixed 20px-tall row so every card's metric starts on the same baseline,
 * whether or not the card has an icon or a meta label.
 */
export function StatCardHeader({
  icon,
  label,
  labelId,
  meta,
  onExpand,
  expandLabel,
}: StatCardHeaderProps) {
  return (
    <div className="flex h-5 items-center justify-between gap-3">
      <h2
        id={labelId}
        className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold tracking-[0.02em] text-faint"
      >
        {icon ? (
          <span className="grid h-3.5 w-3.5 shrink-0 place-items-center text-signal">
            {icon}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </h2>
      <div className="flex shrink-0 items-center gap-1.5">
        {meta ? <span className="text-[11px] text-faint">{meta}</span> : null}
        {onExpand ? (
          <StatCardExpandButton onExpand={onExpand} label={expandLabel ?? label} />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Always occupies its slot — it fades in on card hover/focus rather than
 * appearing from nothing, so the header never reflows under the pointer.
 */
export function StatCardExpandButton({
  onExpand,
  label,
}: {
  onExpand: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Expand ${label}`}
      title={`Expand ${label}`}
      className={cn(
        "grid h-5 w-5 place-items-center rounded-[5px] text-faint opacity-55",
        "transition-[opacity,color,background-color,transform] duration-[140ms]",
        "hover:bg-hover hover:text-foreground hover:opacity-100",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20",
        "group-hover/stat:opacity-100"
      )}
    >
      <Maximize2 className="h-3 w-3 transition-transform duration-150 group-hover/stat:scale-110" />
    </button>
  );
}

/**
 * The big number plus its caption. Kept identical across cards so "45", "0"
 * and "49" sit on one optical line.
 */
export function StatCardMetric({
  value,
  caption,
  color,
  className,
}: {
  value: React.ReactNode;
  caption?: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0", className)}>
      <div className="text-metric leading-none" style={color ? { color } : undefined}>
        {value}
      </div>
      {caption ? (
        <p className="mt-1 text-[11px] leading-none text-faint">{caption}</p>
      ) : null}
    </div>
  );
}
