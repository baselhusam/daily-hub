import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-[18px] shrink-0 rounded-[5px] border-[1.6px] border-[#C7C6C2] bg-background transition-colors duration-[120ms] focus-visible:border-signal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14 disabled:cursor-not-allowed disabled:opacity-50 hover:border-foreground data-[state=checked]:border-done data-[state=checked]:bg-done data-[state=checked]:text-white",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <Check className="size-2.5 stroke-[3.2]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
