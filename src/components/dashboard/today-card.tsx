import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card chrome shared by every surface on Today — the pulse row, project
 * groups, and the right rail. One recipe so the page reads as one set of
 * cards: 12px radius, hairline border, the raised shadow, and a hover lift
 * only where the card itself is a target.
 */
export function TodayCard({
  className,
  interactive = false,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"section"> & { interactive?: boolean }) {
  return (
    <section
      className={cn(
        "rounded-[12px] border border-border bg-card text-foreground shadow-raised",
        interactive &&
          "transition-[border-color,box-shadow] duration-[140ms] hover:border-border-strong hover:shadow-float",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

/** The small uppercase label over a metric or a rail section. */
export function Eyebrow({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase",
        className
      )}
      {...props}
    />
  );
}

/** Header row used by the rail cards and project groups. */
export function CardHeading({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className={cn("text-[13.5px] font-semibold tracking-[-0.01em]", className)}
      {...props}
    />
  );
}

/** The dashed "+" square in front of every capture affordance. */
export function CaptureGlyph({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-[5px] border-[1.5px] border-dashed border-hairline text-faint transition-colors duration-[120ms]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.6)}
        viewBox="0 0 22 22"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
      >
        <path d="M11 5v12M5 11h12" />
      </svg>
    </span>
  );
}
