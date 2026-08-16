"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar, MobileTabBar } from "@/components/app-top-bar";
import { BrandLockup } from "@/components/brand-mark";
import { SearchProvider } from "@/components/search-context";
import type { SidebarStats } from "@/lib/sidebar-stats";

type AppShellProps = {
  stats: SidebarStats;
  children: React.ReactNode;
};

function SidebarWithSearchParams({ stats }: { stats: SidebarStats }) {
  return <AppSidebar stats={stats} />;
}

export function AppShell({ stats, children }: AppShellProps) {
  const [search, setSearch] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

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
        <SidebarWithSearchParams stats={stats} />
      </Suspense>

      <div className="flex min-h-svh flex-col dh:pl-64">
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
            {stats.showStreaks && (
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
                <span className="text-[12px] font-semibold text-signal tabular-nums">
                  {stats.streak}
                </span>
              </div>
            )}
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
