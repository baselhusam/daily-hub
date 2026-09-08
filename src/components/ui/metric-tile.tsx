import { cn } from "@/lib/utils";

/**
 * The summary tiles along the bottom of the analysis dialogs. Shared so the
 * Momentum and Rhythm dialogs stay typographically identical.
 */
export function MetricTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-canvas-sunk px-3 py-2.5",
        className
      )}
    >
      <p className="text-[10.5px] font-semibold tracking-[0.04em] text-faint uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-[18px] font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[10.5px] text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
