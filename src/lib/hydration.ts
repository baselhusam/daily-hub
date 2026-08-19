"use client";

import * as React from "react";
import { getTodayDate } from "@/lib/dates";

export function useHydrated() {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

export function useDisplayDay(serverTodayISO: string) {
  const hydrated = useHydrated();

  return React.useMemo(() => {
    if (!hydrated) {
      return {
        today: new Date(serverTodayISO),
        mode: "utc" as const,
        hydrated: false,
      };
    }
    return {
      today: getTodayDate(),
      mode: "local" as const,
      hydrated: true,
    };
  }, [hydrated, serverTodayISO]);
}
