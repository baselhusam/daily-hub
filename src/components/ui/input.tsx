import * as React from "react";
import { DATE_INPUT_MAX, DATE_INPUT_MIN } from "@/lib/dates";
import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  min,
  max,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      min={type === "date" ? (min ?? DATE_INPUT_MIN) : min}
      max={type === "date" ? (max ?? DATE_INPUT_MAX) : max}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-base transition-colors duration-[120ms] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-faint focus-visible:border-signal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/16 disabled:cursor-not-allowed disabled:opacity-50 dh:h-9 dh:text-[13px]",
        className
      )}
      {...props}
    />
  );
}

function DialogInput({
  className,
  autoComplete = "off",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      autoComplete={autoComplete}
      className={cn("h-auto rounded-[10px] px-3 py-[11px] text-base dh:text-[14.5px]", className)}
      {...props}
    />
  );
}

function DialogTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[72px] w-full rounded-[10px] border border-input bg-background px-3 py-[11px] text-base leading-relaxed transition-colors duration-[120ms] placeholder:text-faint focus-visible:border-signal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/16 disabled:cursor-not-allowed disabled:opacity-50 dh:text-sm",
        className
      )}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-eyebrow", className)}
      {...props}
    />
  );
}

export { Input, DialogInput, DialogTextarea, FieldLabel };
