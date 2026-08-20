"use client";

import * as React from "react";
import type { ActionResult } from "@/app/actions/types";

type FlagItem = {
  id: string;
  value: boolean;
};

/** Client-side flags that flip immediately and hold until server props match. */
export function useOptimisticFlags(items: FlagItem[]) {
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>(
    {}
  );
  const inFlightRef = React.useRef(new Set<string>());
  const signature = items
    .map((item) => `${item.id}:${item.value ? 1 : 0}`)
    .join("|");
  const server = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!signature) return map;
    for (const pair of signature.split("|")) {
      const sep = pair.lastIndexOf(":");
      map[pair.slice(0, sep)] = pair.slice(sep + 1) === "1";
    }
    return map;
  }, [signature]);

  React.useEffect(() => {
    setOverrides((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (!(id in server) || server[id] === next[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [server]);

  const get = React.useCallback(
    (id: string, fallback: boolean) => overrides[id] ?? fallback,
    [overrides]
  );

  const run = React.useCallback(
    async (
      id: string,
      current: boolean,
      action: () => Promise<ActionResult>
    ) => {
      if (inFlightRef.current.has(id)) {
        return { success: true as const, skipped: true };
      }

      inFlightRef.current.add(id);
      setOverrides((prev) => ({ ...prev, [id]: !current }));

      try {
        const result = await action();
        if (!result.success) {
          setOverrides((prev) => ({ ...prev, [id]: current }));
        }
        return result;
      } catch (error) {
        setOverrides((prev) => ({ ...prev, [id]: current }));
        throw error;
      } finally {
        inFlightRef.current.delete(id);
      }
    },
    []
  );

  return { get, run };
}
