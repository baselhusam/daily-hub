import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  titleClassName,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-5 gap-y-4",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-eyebrow mb-2 tabular-nums">{eyebrow}</div>
        )}
        <h1 className={cn("text-display-lg m-0 text-balance", titleClassName)}>
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[54ch] text-[14.5px] leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:pb-0.5">
          {actions}
        </div>
      )}
    </header>
  );
}
