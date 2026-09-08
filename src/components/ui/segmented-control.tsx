"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string | number> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string | number> = {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
};

/**
 * The timeframe switcher shared by every analysis dialog. Arrow keys move
 * between segments the way a real tablist does, and the active pill slides
 * rather than blinking between positions.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const reducedMotion = useReducedMotion();
  const groupId = React.useId();
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  function focusIndex(index: number) {
    const next = Math.max(0, Math.min(options.length - 1, index));
    refs.current[next]?.focus();
    onChange(options[next].value);
  }

  return (
    <div
      role="group"
      aria-label={props["aria-label"]}
      className={cn(
        "inline-flex rounded-lg border border-border bg-canvas-sunk p-1",
        className
      )}
      onKeyDown={(event) => {
        const index = options.findIndex((option) => option.value === value);
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          focusIndex(index - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          focusIndex(index + 1);
        }
      }}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            aria-pressed={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative h-7 rounded-md px-2.5 text-[11.5px] font-semibold tabular-nums transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20",
              active ? "text-foreground" : "text-faint hover:text-foreground"
            )}
          >
            {active ? (
              <motion.span
                layoutId={`segmented-${groupId}`}
                className="absolute inset-0 rounded-md bg-card shadow-raised"
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 480, damping: 40 }
                }
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
