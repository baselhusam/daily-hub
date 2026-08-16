import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-signal text-white hover:bg-[#1A7BD4]",
        destructive:
          "bg-transparent text-destructive hover:bg-[#FBECEB] dark:hover:bg-destructive/15",
        outline:
          "border border-border bg-background shadow-[0_1px_2px_rgba(15,15,15,.04)] hover:border-[#D3D2CF]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-hover",
        ghost: "text-ink-soft hover:bg-hover hover:text-foreground",
        link: "text-signal font-semibold hover:text-[#1A7BD4]",
        ink: "bg-foreground text-background hover:bg-foreground/90",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
