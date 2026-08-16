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
          "border-[#F2DFDE] bg-[#FBECEB] text-[#B0403C]",
        done:
          "border-[#D8EDE2] bg-[#EEF8F3] text-[#0C7C4E]",
        muted:
          "border-[#EDEDEC] bg-paper text-muted-foreground rounded",
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
