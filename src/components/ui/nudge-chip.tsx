import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NudgeChipProps = {
  children: ReactNode;
  variant?: "warn" | "neutral";
  action?: ReactNode;
  leading?: ReactNode;
  className?: string;
};

export function NudgeChip({
  children,
  variant = "neutral",
  action,
  leading,
  className,
}: NudgeChipProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2.5 rounded-lg border px-3.5 py-2",
        variant === "warn"
          ? "border-warn-border bg-warn-wash"
          : "border-border bg-paper",
        className
      )}
    >
      {leading ?? (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            variant === "warn" ? "bg-warn" : "bg-faint"
          )}
        />
      )}
      <span className="min-w-0 flex-1 text-[13.5px] font-medium text-pretty text-foreground">
        {children}
      </span>
      {action}
    </div>
  );
}
