import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  size?: number;
  className?: string;
  /** Empty states omit the day-dot. */
  ghost?: boolean;
};

export function BrandMark({
  size = 28,
  className,
  ghost = false,
}: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect x="2.5" y="5.5" width="30" height="30" rx="8.5" fill="currentColor" />
      <path
        d="M10.5 21.2l5 5 10.5-11"
        stroke="var(--background)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!ghost && (
        <>
          <circle cx="32" cy="8" r="6" fill="var(--background)" />
          <circle cx="32" cy="8" r="4" fill="var(--signal)" />
        </>
      )}
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-[-0.035em]", className)}>
      Daily<span className="text-signal">Hub</span>
    </span>
  );
}

export function BrandLockup({
  size = 28,
  className,
  wordmarkClassName,
}: {
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} className="text-foreground" />
      <BrandWordmark className={wordmarkClassName} />
    </span>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-10 text-center">
      <BrandMark size={30} ghost className="text-foreground opacity-[0.28]" />
      <p className="text-[13.5px] font-semibold tracking-tight">{title}</p>
      {description && (
        <p className="max-w-[28ch] text-[12.5px] leading-relaxed text-faint text-pretty">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
