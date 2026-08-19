"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar, MobileTabBar } from "@/components/app-top-bar";
import { BrandLockup } from "@/components/brand-mark";
import { SearchProvider } from "@/components/search-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { SidebarStats } from "@/lib/sidebar-stats";

const SIDEBAR_COLLAPSED_KEY = "dh-sidebar-collapsed";

type AppShellProps = {
  stats: SidebarStats;
  children: React.ReactNode;
};

function SidebarWithSearchParams({
  stats,
  collapsed,
  onToggle,
  animate,
}: {
  stats: SidebarStats;
  collapsed: boolean;
  onToggle: () => void;
  animate: boolean;
}) {
  return (
    <AppSidebar
      stats={stats}
      collapsed={collapsed}
      onToggle={onToggle}
      animate={animate}
    />
  );
}

export function AppShell({ stats, children }: AppShellProps) {
  const [search, setSearch] = React.useState("");
  const [collapsed, setCollapsed] = React.useState(false);
  const [sidebarReady, setSidebarReady] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

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
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-svh bg-background">
      <Suspense fallback={null}>
        <SidebarWithSearchParams
          stats={stats}
          collapsed={collapsed}
          onToggle={toggleSidebar}
          animate={sidebarReady}
        />
      </Suspense>

      <div
        className={cn(
          "flex min-h-svh flex-col",
          sidebarReady &&
            "transition-[padding] duration-200 ease-[cubic-bezier(0.2,0.8,0.3,1)]",
          collapsed ? "dh:pl-[68px]" : "dh:pl-64"
        )}
      >
        <div className="hidden dh:block">
          <AppTopBar
            stats={stats}
            search={search}
            onSearchChange={setSearch}
            searchInputRef={searchInputRef}
          />
        </div>

        <div className="dh:hidden">
          <header className="flex items-center justify-between border-b border-border bg-paper px-4 py-3">
            <Link href="/" aria-label="DailyHub">
              <BrandLockup size={24} wordmarkClassName="text-[15px] leading-none" />
            </Link>
            <div className="flex items-center gap-2">
              {stats.showStreaks && (
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
                  <span className="text-[12px] font-semibold text-signal tabular-nums">
                    {stats.streak}
                  </span>
                </div>
              )}
              <ThemeToggle />
            </div>
          </header>
        </div>

        <main className="flex-1 overflow-y-auto pb-24 dh:pb-0">
          <SearchProvider value={search}>{children}</SearchProvider>
        </main>

        <MobileTabBar />
      </div>
    </div>
  );
}
