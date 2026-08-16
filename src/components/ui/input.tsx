import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13px] transition-colors duration-[120ms] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-faint focus-visible:border-signal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
