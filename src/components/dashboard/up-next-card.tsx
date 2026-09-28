"use client";

import Link from "next/link";
import type { UpNextItem } from "@/lib/today-insights";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./today-card";

function whenLabel(days: number) {
  if (days < 0) return `${Math.abs(days)}d late`;
  if (days === 0) return "today";
  return `${days}d`;
}

/**
 * The next dated commitments across projects: milestones and ship dates. With
 * the milestones nudge on, it lists this week's milestones instead, ringed.
 */
export function UpNextCard({
  items,
  className,
  id,
  heading = "Up next",
  highlighted = false,
}: {
  items: UpNextItem[];
  className?: string;
  id?: string;
  heading?: string;
  highlighted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section
      id={id}
      aria-labelledby="up-next-heading"
      className={cn(
        "scroll-mt-24 rounded-[12px] border border-border bg-canvas-sunk px-4 pt-[15px] pb-4 transition-[border-color,box-shadow] duration-[140ms]",
        highlighted &&
          "border-done/50 shadow-[0_0_0_3px_color-mix(in_srgb,var(--done)_12%,transparent)]",
        className
      )}
    >
      <Eyebrow id="up-next-heading">{heading}</Eyebrow>
      <ul className="mt-[9px] flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-[9px]">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-[3px]"
              style={{ backgroundColor: item.color }}
            />
            <Link
              href={`/projects/${item.projectId}`}
              className="min-w-0 flex-1 truncate text-[12.5px] text-ink-soft transition-colors duration-[120ms] hover:text-foreground"
            >
              {item.label} — {item.projectName}
            </Link>
            <span
              className={cn(
                "text-[11.5px] tabular-nums",
                item.days < 0 ? "font-semibold text-destructive" : "text-faint"
              )}
            >
              {whenLabel(item.days)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
