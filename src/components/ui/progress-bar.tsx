import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  height?: "sm" | "md";
  animated?: boolean;
};

export function ProgressBar({
  value,
  max = 100,
  color = "var(--signal)",
  className,
  height = "sm",
  animated = false,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[3px] bg-track",
        height === "sm" ? "h-1.5" : "h-2",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-[3px] transition-[width] duration-[120ms]",
          animated && "animate-dh-fill"
        )}
        style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%`, backgroundColor: color }}
      />
    </div>
  );
}
