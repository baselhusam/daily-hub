"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SelectMenuOption = {
  value: string;
  label: string;
  leading?: React.ReactNode;
};

type SelectMenuProps = {
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  variant?: "field" | "compact" | "plain";
  layout?: "list" | "icon-grid";
};

export function SelectMenu({
  name,
  value,
  onValueChange,
  options,
  placeholder = "Select",
  ariaLabel,
  disabled,
  className,
  contentClassName,
  variant = "field",
  layout = "list",
}: SelectMenuProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={ariaLabel}
            className={cn(
              "flex min-w-0 items-center gap-2 text-left outline-none transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50",
              variant === "field" &&
                "h-auto w-full rounded-[10px] border border-input bg-background px-3 py-[9px] text-base focus-visible:border-signal focus-visible:ring-[3px] focus-visible:ring-signal/16 dh:text-[14.5px]",
              variant === "compact" &&
                "rounded-md border border-border bg-muted px-2.5 py-2 text-[13.5px] font-medium focus-visible:border-signal focus-visible:ring-[3px] focus-visible:ring-signal/16",
              variant === "plain" &&
                "h-8 w-auto max-w-[10.5rem] rounded-md px-2 text-[13px] text-muted-foreground hover:bg-hover hover:text-foreground focus-visible:bg-hover focus-visible:text-foreground",
              className
            )}
          >
            {selected?.leading ? (
              <span className="shrink-0">{selected.leading}</span>
            ) : null}
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                !selected && "text-faint"
              )}
            >
              {selected?.label ?? placeholder}
            </span>
            {variant === "plain" ? null : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-faint" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            layout === "list" &&
              "max-h-[min(18rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] min-w-[min(12rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain p-1",
            layout === "icon-grid" &&
              "w-[min(15rem,calc(100vw-1.5rem))] p-2",
            contentClassName
          )}
          role="listbox"
          aria-label={ariaLabel ?? placeholder}
        >
          <div
            className={cn(
              layout === "list" && "space-y-0.5",
              layout === "icon-grid" && "grid grid-cols-5 gap-1"
            )}
          >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-label={option.label}
                title={option.label}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "outline-none transition-[background-color,color,box-shadow,transform] duration-[120ms] focus-visible:ring-[3px] focus-visible:ring-signal/18",
                  layout === "list" &&
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13.5px] font-medium",
                  layout === "icon-grid" &&
                    "group relative grid aspect-square place-items-center rounded-[8px] hover:-translate-y-px hover:bg-hover",
                  isSelected && layout === "list" && "bg-hover text-foreground",
                  !isSelected && layout === "list" && "text-foreground hover:bg-hover",
                  isSelected &&
                    layout === "icon-grid" &&
                    "bg-signal-wash text-signal shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--signal)_35%,transparent)]"
                )}
              >
                {option.leading ? (
                  <span className="shrink-0">{option.leading}</span>
                ) : null}
                {layout === "list" ? (
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                ) : null}
                {isSelected && layout === "list" ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-signal" />
                ) : null}
              </button>
            );
          })}
          </div>
          {layout === "icon-grid" ? (
            <p className="mt-2 border-t border-rule-soft px-1 pt-2 text-[11.5px] text-faint">
              {selected?.label ?? placeholder}
            </p>
          ) : null}
        </PopoverContent>
      </Popover>
    </>
  );
}
