import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  variant?: "canvas" | "paper";
};

export function SurfaceCard({
  children,
  className,
  variant = "canvas",
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[10px] border border-border",
        variant === "canvas" ? "bg-card" : "bg-paper",
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
}: {
  children: ReactNode;
  className?: string;
  sunk?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b px-[18px] py-3.5",
        sunk ? "border-border bg-canvas-sunk" : "border-rule-soft",
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
