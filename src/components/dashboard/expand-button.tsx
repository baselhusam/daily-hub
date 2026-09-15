"use client";

import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The small "open full view" glyph in a pulse card's corner. Always occupies
 * its slot and brightens on card hover, so the header never reflows.
 */
export function ExpandButton({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={`Open ${label}`}
      title="Open full view"
      className={cn(
        "-mr-1 grid h-5 w-5 place-items-center rounded-[5px] text-faint opacity-60",
        "transition-[opacity,color,background-color] duration-[140ms]",
        "hover:bg-hover hover:text-foreground hover:opacity-100 group-hover/stat:opacity-100",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20",
        className
      )}
    >
      <Maximize2 className="h-[13px] w-[13px]" />
    </button>
  );
}
