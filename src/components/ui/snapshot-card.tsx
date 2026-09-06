import { EntityAvatar } from "@/components/ui/entity-avatar";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SparkBar } from "@/lib/streak-utils";

type SnapshotCardProps = {
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
  color?: string;
  hint: string;
  hintColor?: string;
  foot?: string;
  bars?: SparkBar[];
  logoUrl?: string | null;
  iconKey?: string | null;
  entityName?: string;
  entityColor?: string | null;
  onExpand?: () => void;
  className?: string;
};

export function SnapshotCard({
  label,
  value,
  unit,
  valueColor,
  color,
  hint,
  hintColor = "var(--faint)",
  foot,
  bars,
  logoUrl,
  iconKey,
  entityName,
  entityColor,
  onExpand,
  className,
}: SnapshotCardProps) {
  const metricColor = valueColor ?? color ?? "var(--foreground)";
  const showMark = Boolean(entityName && (logoUrl || iconKey));
  const sparkTotal = bars?.reduce((sum, bar) => sum + bar.value, 0) ?? 0;

  return (
    <div
      className={cn(
        "group flex min-h-[112px] flex-col rounded-[12px] border border-border bg-card px-3.5 py-3 transition-[border-color] duration-[120ms] hover:border-border-strong",
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold tracking-[0.02em] text-faint">
          {label}
        </div>
        <div className="flex items-center gap-1">
          {unit ? (
            <span className="text-[11px] text-faint">{unit}</span>
          ) : null}
          {onExpand ? (
            <button
              type="button"
              onClick={onExpand}
              aria-label={`Expand ${label} analysis`}
              title={`Expand ${label} analysis`}
              className="grid h-5 w-5 place-items-center rounded text-faint opacity-0 transition-[opacity,color,background-color] hover:bg-hover hover:text-foreground focus:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14 group-hover:opacity-100"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-1.5 text-metric" style={{ color: metricColor }}>
        {value}
      </div>
      {bars && bars.length > 0 ? (
        <SparkBars bars={bars} label={label} total={sparkTotal} />
      ) : (
        <div className="mt-2.5 h-8" />
      )}
      <div className="mt-auto flex items-center gap-1.5 pt-2">
        {showMark && entityName ? (
          <EntityAvatar
            name={entityName}
            color={entityColor}
            logoUrl={logoUrl}
            iconKey={iconKey}
            size={16}
          />
        ) : null}
        <span
          className="min-w-0 flex-1 truncate text-[12px]"
          style={{ color: hintColor }}
        >
          {hint}
        </span>
        {foot ? (
          <span className="shrink-0 text-[11.5px] text-faint tabular-nums">
            {foot}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SparkBars({
  bars,
  label,
  total,
}: {
  bars: SparkBar[];
  label: string;
  total: number;
}) {
  return (
    <div
      className="mt-2.5 flex h-8 items-end gap-[3px]"
      role="img"
      aria-label={`${total} across ${bars.length} days for ${label}`}
    >
      {bars.map((bar, index) => (
        <span
          key={index}
          title={String(bar.value)}
          className="min-h-[3px] flex-1 rounded-[2px]"
          style={{
            height: `${bar.height}%`,
            backgroundColor: bar.empty
              ? "var(--hairline)"
              : bar.today
                ? "var(--signal)"
                : "var(--foreground)",
            opacity: bar.empty ? 0.55 : bar.today ? 1 : 0.82,
          }}
        />
      ))}
    </div>
  );
}
