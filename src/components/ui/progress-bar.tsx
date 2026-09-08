import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  height?: "sm" | "md" | "rail";
  animated?: boolean;
  /**
   * How loudly the bar wears its colour. "tint" mixes it toward a neutral, so a
   * stack of project-coloured bars reads as one family instead of a rainbow;
   * switch a row to "full" while it is hovered or pinned.
   */
  emphasis?: "full" | "tint";
};

const heights = {
  sm: "h-1.5",
  md: "h-2",
  rail: "h-[4px]",
} as const;

export function ProgressBar({
  value,
  max = 100,
  color = "var(--signal)",
  className,
  height = "sm",
  animated = false,
  emphasis = "full",
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const rail = height === "rail";

  return (
    <div
      className={cn(
        "overflow-hidden bg-track",
        rail ? "rounded-full" : "rounded-[3px]",
        heights[height],
        className
      )}
    >
      <div
        className={cn(
          "h-full transition-[width,background-color] duration-[120ms]",
          rail ? "rounded-full" : "rounded-[3px]",
          animated && "animate-dh-fill"
        )}
        style={{
          width: `${Math.max(pct > 0 ? 2 : 0, pct)}%`,
          backgroundColor:
            emphasis === "tint"
              ? `color-mix(in oklab, ${color} var(--bar-tint), var(--bar-tint-mix))`
              : color,
        }}
      />
    </div>
  );
}
