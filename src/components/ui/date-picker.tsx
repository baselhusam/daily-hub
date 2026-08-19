"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DATE_INPUT_MAX,
  DATE_INPUT_MIN,
  MAX_CALENDAR_YEAR,
  MIN_CALENDAR_YEAR,
  parseDateInput,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

type DatePickerProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: "field" | "compact";
  allowClear?: boolean;
};

export function DatePicker({
  name,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  min = DATE_INPUT_MIN,
  max = DATE_INPUT_MAX,
  placeholder = "No date",
  disabled,
  className,
  variant = "field",
  allowClear = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = controlledValue ?? uncontrolled;
  const selected = parseDateInput(value);
  const minDate = parseDateInput(min) ?? new Date(MIN_CALENDAR_YEAR, 0, 1);
  const maxDate = parseDateInput(max) ?? new Date(MAX_CALENDAR_YEAR, 11, 31);
  const [visibleMonth, setVisibleMonth] = React.useState(
    () => selected ?? new Date()
  );

  React.useEffect(() => {
    if (open) {
      setVisibleMonth(selected ?? new Date());
    }
  }, [open, selected]);

  function setValue(next: string) {
    if (controlledValue === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  const gridStart = startOfWeek(startOfMonth(visibleMonth), {
    weekStartsOn: 1,
  });
  const days = Array.from({ length: 42 }, (_, index) =>
    addDays(gridStart, index)
  );

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex min-w-0 items-center gap-2 text-left outline-none transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50",
              variant === "field" &&
                "h-auto w-full rounded-[10px] border border-input bg-background px-3 py-[9px] text-[14.5px] focus-visible:border-signal focus-visible:ring-[3px] focus-visible:ring-signal/16",
              variant === "compact" &&
                "rounded-md border border-border bg-muted px-2.5 py-2 text-[13.5px] focus-visible:border-signal focus-visible:ring-[3px] focus-visible:ring-signal/16",
              className
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-faint" />
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                selected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {selected ? format(selected, "d MMM yyyy") : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
              onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-[13.5px] font-semibold tracking-[-0.01em]">
              {format(visibleMonth, "MMMM yyyy")}
            </p>
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="py-1 text-center text-[10.5px] font-semibold tracking-[0.04em] text-faint"
              >
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const inMonth = isSameMonth(day, visibleMonth);
              const isSelected = selected ? isSameDay(day, selected) : false;
              const isToday = isSameDay(day, new Date());
              const outOfRange = day < minDate || day > maxDate;
              const key = format(day, "yyyy-MM-dd");

              return (
                <button
                  key={key}
                  type="button"
                  disabled={outOfRange}
                  onClick={() => {
                    setValue(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "grid h-8 place-items-center rounded-md text-[12.5px] tabular-nums transition-colors duration-[120ms] disabled:opacity-30",
                    inMonth ? "text-foreground" : "text-faint",
                    isSelected
                      ? "bg-signal font-semibold text-white"
                      : "hover:bg-hover",
                    !isSelected && isToday && "font-semibold text-signal"
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-rule-soft pt-2">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-[12px] font-semibold text-signal hover:bg-signal-wash"
              onClick={() => {
                const today = format(new Date(), "yyyy-MM-dd");
                setValue(today);
                setOpen(false);
              }}
            >
              Today
            </button>
            {allowClear ? (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-[12px] font-semibold text-faint hover:bg-hover hover:text-foreground"
                onClick={() => {
                  setValue("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
