import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-border bg-background text-foreground",
        today:
          "border-border bg-background text-foreground",
        overdue:
          "border-destructive/25 bg-destructive-wash text-destructive",
        done:
          "border-done/25 bg-done-wash text-done",
        muted:
          "border-border bg-paper text-muted-foreground rounded",
        filter:
          "border-border bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  dotColor,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    dotColor?: string;
  }) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dotColor && (
        <span
          className="h-[7px] w-[7px] rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {props.children}
    </span>
  );
}

export { Badge, badgeVariants };
