import { PRIORITY_HIGH, priorityLabel } from "@/lib/priority";
import { cn } from "@/lib/utils";

/**
 * Three rising bars, filled up to the task's priority. Quiet by design — only
 * High borrows the warn tone — so the list stays neutral and the order does
 * the talking. Renders nothing for unprioritised tasks.
 */
export function PriorityGlyph({
  priority,
  decorative = false,
  className,
}: {
  priority: number;
  /** Beside a text label that already names the level, e.g. a chip. */
  decorative?: boolean;
  className?: string;
}) {
  const label = priorityLabel(priority);
  if (!label) return null;
  return (
    <svg
      viewBox="0 0 12 12"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn(
        "h-3 w-3 shrink-0",
        priority >= PRIORITY_HIGH ? "text-warn" : "text-muted-foreground",
        className
      )}
    >
      {decorative ? null : <title>{label}</title>}
      {[0, 1, 2].map((bar) => (
        <rect
          key={bar}
          x={1 + bar * 3.75}
          y={8 - bar * 3}
          width={2.5}
          height={3 + bar * 3}
          rx={0.75}
          fill="currentColor"
          opacity={bar < priority ? 1 : 0.22}
        />
      ))}
    </svg>
  );
}
