"use client";

import * as React from "react";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar, MobileTabBar } from "@/components/app-top-bar";
import { BrandMark } from "@/components/brand-mark";
import { NotificationBell } from "@/components/notification-bell";
import { SearchPalette } from "@/components/search-palette";
import { SettingsDialog } from "@/components/settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn, isTypingTarget } from "@/lib/utils";
import type { SearchIndex } from "@/lib/search";
import type { SidebarStats } from "@/lib/sidebar-stats";

const SIDEBAR_COLLAPSED_KEY = "dh-sidebar-collapsed";

type AppShellProps = {
  stats: SidebarStats;
  searchIndex: SearchIndex;
  children: React.ReactNode;
};

function SidebarWithSearchParams({
  stats,
  collapsed,
  animate,
}: {
  stats: SidebarStats;
  collapsed: boolean;
  animate: boolean;
}) {
  return (
    <AppSidebar
      stats={stats}
      collapsed={collapsed}
      animate={animate}
    />
  );
}

export function AppShell({ stats, searchIndex, children }: AppShellProps) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [sidebarReady, setSidebarReady] = React.useState(false);

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // Ignore private-mode / blocked storage.
    }
    const frame = requestAnimationFrame(() => setSidebarReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Ignore private-mode / blocked storage.
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === "/") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (event.key.toLowerCase() === "n") {
        const composer = document.getElementById("quick-add-title");
        if (composer instanceof HTMLElement) {
          event.preventDefault();
          composer.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
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
        />
      </Suspense>

      <div
        className={cn(
          "flex h-full flex-col",
          sidebarReady &&
            "transition-[padding] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]",
          "dh:pt-[52px]",
          collapsed ? "dh:pl-[68px]" : "dh:pl-64"
        )}
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
                className="grid h-10 w-10 place-items-center rounded-md border border-border bg-card text-muted-foreground shadow-raised transition-colors hover:border-border-strong hover:text-foreground"
                aria-label="Search"
                title="Search (⌘K or /)"
              >
                <Search className="h-4 w-4" />
              </button>
              <NotificationBell
                notifications={stats.notifications}
                className="h-10 w-10"
              />
              <ThemeToggle className="h-10 w-10" />
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
  );
}
