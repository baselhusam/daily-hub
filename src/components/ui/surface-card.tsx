import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  variant?: "canvas" | "paper" | "quiet";
  id?: string;
};

export function SurfaceCard({
  children,
  className,
  variant = "canvas",
  id,
}: SurfaceCardProps) {
  return (
    <div
      id={id}
      className={cn(
        "overflow-hidden rounded-[12px] border border-border",
        variant === "quiet"
          ? "bg-card"
          : variant === "paper"
            ? "bg-paper shadow-raised"
            : "bg-card shadow-raised",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SurfaceCardHeader({
  children,
  className,
  sunk = false,
  divided = true,
}: {
  children: ReactNode;
  className?: string;
  sunk?: boolean;
  divided?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-[18px] py-3.5",
        divided && (sunk ? "border-b border-border bg-canvas-sunk" : "border-b border-rule-soft"),
        className
      )}
    >
      {children}
    </div>
  );
}

export function SurfaceCardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-[18px]", className)}>{children}</div>;
}
