import { cn } from "@/lib/utils";

type SnapshotCardProps = {
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
  hint: string;
  hintColor?: string;
  foot?: string;
  bars?: Array<{ height: number; opacity?: number }>;
  className?: string;
};

export function SnapshotCard({
  label,
  value,
  unit,
  valueColor = "var(--foreground)",
  hint,
  hintColor = "var(--faint)",
  foot,
  bars,
  className,
}: SnapshotCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-[10px] border border-border bg-card shadow-[0_1px_2px_rgba(15,15,15,.03)]",
        className
      )}
    >
      <div className="flex flex-1 flex-col gap-3 p-[14px_15px_12px]">
        <div className="text-[11px] font-semibold tracking-[0.02em] text-faint">
          {label}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2.5">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span
              className="text-metric"
              style={{ color: valueColor }}
            >
              {value}
            </span>
            {unit && (
              <span className="text-[11.5px] text-faint">{unit}</span>
            )}
          </div>
          {bars && bars.length > 0 && (
            <div className="flex h-7 items-end gap-[3px]">
              {bars.map((bar, i) => (
                <span
                  key={i}
                  className="w-1 rounded-[1px] bg-foreground"
                  style={{
                    height: `${bar.height}px`,
                    opacity: bar.opacity ?? 1,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-rule-soft px-[15px] py-2">
        <span
          className="h-[5px] w-[5px] shrink-0 rounded-full"
          style={{ backgroundColor: hintColor }}
        />
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
          {hint}
        </span>
        {foot && (
          <span className="shrink-0 text-[11px] tracking-[0.02em] text-[#B4B3AF] tabular-nums">
            {foot}
          </span>
        )}
      </div>
    </div>
  );
}
