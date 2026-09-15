"use client";

import * as React from "react";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  AppTopBar,
  MobileTabBar,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_WIDTH,
  TOP_BAR_HEIGHT,
} from "@/components/app-top-bar";
import { BrandMark } from "@/components/brand-mark";
import { NotificationBell } from "@/components/notification-bell";
import { SearchPalette } from "@/components/search-palette";
import { SettingsDialog } from "@/components/settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn, isTypingTarget } from "@/lib/utils";
import { WeekStartProvider } from "@/lib/week-start";
import type { SearchIndex } from "@/lib/search";
import type { SidebarStats } from "@/lib/sidebar-stats";

const SIDEBAR_COLLAPSED_KEY = "dh-sidebar-collapsed";
/**
 * Below this the full sidebar leaves the page too little room, so it starts
 * collapsed unless the user has chosen otherwise. Still above the `dh`
 * breakpoint, where the sidebar gives way to the mobile bar entirely.
 */
const NARROW_SHELL_QUERY = "(max-width: 1199px)";

type AppShellProps = {
  stats: SidebarStats;
  searchIndex: SearchIndex;
  children: React.ReactNode;
};

function SidebarWithSearchParams({
  stats,
  collapsed,
  animate,
  onExpand,
}: {
  stats: SidebarStats;
  collapsed: boolean;
  animate: boolean;
  onExpand: () => void;
}) {
  return (
    <AppSidebar
      stats={stats}
      collapsed={collapsed}
      animate={animate}
      onExpand={onExpand}
    />
  );
}

/** `g` then one of these, within a second, jumps to the page. */
const GO_CHORDS: Record<string, string> = {
  t: "/",
  p: "/projects",
  h: "/daily",
  a: "/analytics",
};

export function AppShell({ stats, searchIndex, children }: AppShellProps) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  // The user's explicit choice wins; until they make one, narrow windows
  // start collapsed and follow the viewport as it is resized.
  const [collapsedPref, setCollapsedPref] = React.useState<boolean | null>(null);
  const [narrow, setNarrow] = React.useState(false);
  const [sidebarReady, setSidebarReady] = React.useState(false);
  const collapsed = collapsedPref ?? narrow;

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "1" || stored === "0") setCollapsedPref(stored === "1");
    } catch {
      // Ignore private-mode / blocked storage.
    }
    const media = window.matchMedia(NARROW_SHELL_QUERY);
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    const frame = requestAnimationFrame(() => setSidebarReady(true));
    return () => {
      media.removeEventListener("change", sync);
      cancelAnimationFrame(frame);
    };
  }, []);

  const toggleSidebar = React.useCallback(() => {
    const next = !collapsed;
    setCollapsedPref(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Ignore private-mode / blocked storage.
    }
  }, [collapsed]);

  React.useEffect(() => {
    let chordArmedUntil = 0;

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "b") {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === "/") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (chordArmedUntil > Date.now() && key in GO_CHORDS) {
        chordArmedUntil = 0;
        event.preventDefault();
        router.push(GO_CHORDS[key]);
        return;
      }

      if (key === "g") {
        chordArmedUntil = Date.now() + 1000;
        return;
      }

      if (key === "n") {
        const composer = document.getElementById("quick-add-title");
        if (composer instanceof HTMLElement) {
          event.preventDefault();
          composer.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, toggleSidebar]);

  return (
    <WeekStartProvider value={stats.settings.weekStartsOn}>
    <div className="h-svh overflow-hidden bg-background">
      <SearchPalette
        index={searchIndex}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
      <SettingsDialog
        settings={{
          id: "default",
          ...stats.settings,
        }}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <AppTopBar
        stats={stats}
        onSearchOpen={() => setPaletteOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
        collapsed={collapsed}
        onToggle={toggleSidebar}
        animate={sidebarReady}
      />

      <Suspense fallback={null}>
        <SidebarWithSearchParams
          stats={stats}
          collapsed={collapsed}
          animate={sidebarReady}
          onExpand={() => {
            if (collapsed) toggleSidebar();
          }}
        />
      </Suspense>

      <div
        className={cn(
          "flex h-full flex-col dh:pt-[var(--shell-top)] dh:pl-[var(--shell-left)]",
          sidebarReady &&
            "transition-[padding] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]"
        )}
        style={
          {
            "--shell-top": `${TOP_BAR_HEIGHT}px`,
            "--shell-left": `${collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH}px`,
          } as React.CSSProperties
        }
        data-shell
      >
        <div className="dh:hidden">
          <header className="flex items-center justify-between gap-2 border-b border-border bg-paper pt-[max(0.625rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-2.5 pl-[max(0.75rem,env(safe-area-inset-left))]">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex min-w-0 items-center gap-2 rounded-md py-1 pr-2 pl-0.5 text-left transition-colors duration-[120ms] hover:bg-hover"
              aria-label="Workspace settings"
              title={stats.settings.workspaceName}
            >
              <BrandMark size={24} className="text-foreground" />
              <span className="max-w-[8.5rem] truncate text-[15px] font-semibold tracking-[-0.02em] leading-none max-[360px]:hidden">
                {stats.settings.workspaceName}
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-1.5">
              {stats.showStreaks && (
                <div className="flex items-center rounded-full border border-border bg-card px-2 py-1">
                  <span className="text-[12px] font-semibold text-signal tabular-nums">
                    {stats.streak}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                aria-label="Search"
                title="Search (⌘K or /)"
              >
                <Search className="h-4 w-4" />
              </button>
              <NotificationBell
                notifications={stats.notifications}
                className="h-10 w-10 rounded-[9px] border border-border bg-card"
              />
              <ThemeToggle className="h-10 w-10 rounded-[9px] border border-border bg-card" />
            </div>
          </header>
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain outline-none pb-[calc(5.25rem+env(safe-area-inset-bottom))] dh:pb-0"
        >
          {children}
        </main>

        <MobileTabBar />
      </div>
    </div>
    </WeekStartProvider>
  );
}
