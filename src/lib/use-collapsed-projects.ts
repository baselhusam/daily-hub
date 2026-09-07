"use client";

import * as React from "react";

export type CollapseOverride = { value: boolean; forAuto: boolean };

const STORAGE_KEY = "dailyhub:collapsed-projects";

type CollapsibleProject = { id: string; autoCollapsed: boolean };

function readStoredOverrides(): Record<string, CollapseOverride> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, CollapseOverride>;
  } catch {
    return {};
  }
}

function writeStoredOverrides(overrides: Record<string, CollapseOverride>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore write failures (private browsing, storage disabled, quota, etc.)
  }
}

/**
 * Tracks which Today projects are collapsed. The default (auto) state is a
 * pure function of the project list, so server and first client render always
 * agree; manual overrides are only loaded from localStorage after mount to
 * avoid a hydration mismatch (mirrors `useHydrated` / `useDisplayDay`).
 *
 * An override records the `autoCollapsed` value it was made against; once the
 * project's auto state actually changes (e.g. a finished task is reopened),
 * the stale override is dropped and the card follows the auto rule again.
 */
export function useCollapsedProjects(projects: CollapsibleProject[]): {
  isCollapsed: (id: string) => boolean;
  toggle: (id: string) => void;
  setAll: (collapsed: boolean) => void;
} {
  const [overrides, setOverrides] = React.useState<Record<string, CollapseOverride>>({});

  React.useEffect(() => {
    // Load once on mount, after hydration — see the doc comment above.
    const stored = readStoredOverrides();
    if (Object.keys(stored).length > 0) setOverrides(stored);
  }, []);

  const autoById = React.useMemo(() => {
    const map = new Map<string, boolean>();
    for (const project of projects) map.set(project.id, project.autoCollapsed);
    return map;
  }, [projects]);

  const persist = React.useCallback(
    (next: Record<string, CollapseOverride>) => {
      const validIds = new Set(projects.map((project) => project.id));
      const pruned: Record<string, CollapseOverride> = {};
      for (const [id, override] of Object.entries(next)) {
        if (validIds.has(id)) pruned[id] = override;
      }
      setOverrides(pruned);
      writeStoredOverrides(pruned);
    },
    [projects]
  );

  const isCollapsed = React.useCallback(
    (id: string) => {
      const autoCollapsed = autoById.get(id) ?? false;
      const override = overrides[id];
      if (override && override.forAuto === autoCollapsed) return override.value;
      return autoCollapsed;
    },
    [autoById, overrides]
  );

  const toggle = React.useCallback(
    (id: string) => {
      const autoCollapsed = autoById.get(id) ?? false;
      const current = isCollapsed(id);
      persist({
        ...overrides,
        [id]: { value: !current, forAuto: autoCollapsed },
      });
    },
    [autoById, isCollapsed, overrides, persist]
  );

  const setAll = React.useCallback(
    (collapsed: boolean) => {
      const next: Record<string, CollapseOverride> = { ...overrides };
      for (const project of projects) {
        next[project.id] = { value: collapsed, forAuto: project.autoCollapsed };
      }
      persist(next);
    },
    [overrides, persist, projects]
  );

  return { isCollapsed, toggle, setAll };
}
