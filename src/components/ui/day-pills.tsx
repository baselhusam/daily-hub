import { cn } from "@/lib/utils";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

type DayPillsProps = {
  activeDays: number[];
  className?: string;
  size?: "sm" | "md";
};

export function DayPills({ activeDays, className, size = "sm" }: DayPillsProps) {
  const dim = size === "sm" ? "h-6 w-6 text-[11.5px]" : "h-[42px] w-[42px] text-xs";

  return (
    <div className={cn("flex gap-1", className)}>
      {DAY_LABELS.map((label, index) => {
        const on = activeDays.includes(index);
        return (
          <span
            key={index}
            className={cn(
              "grid place-items-center rounded-[7px] font-semibold",
              dim,
              on
                ? "bg-foreground text-background"
                : "border border-border bg-paper text-faint"
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
