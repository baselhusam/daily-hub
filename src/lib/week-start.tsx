"use client";

import * as React from "react";
import type { WeekStart } from "@/lib/settings";

const WeekStartContext = React.createContext<WeekStart>(1);

/** Makes the workspace's first weekday available to calendars and pickers. */
export function WeekStartProvider({
  value,
  children,
}: {
  value: WeekStart;
  children: React.ReactNode;
}) {
  return (
    <WeekStartContext.Provider value={value}>{children}</WeekStartContext.Provider>
  );
}

export function useWeekStart(): WeekStart {
  return React.useContext(WeekStartContext);
}

/** Weekday indexes (0 = Sunday) in display order for the given week start. */
export function weekdayOrder(weekStartsOn: WeekStart): number[] {
  return Array.from({ length: 7 }, (_, index) => (weekStartsOn + index) % 7);
}
