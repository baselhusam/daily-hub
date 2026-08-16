"use client";

import * as React from "react";
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { cn } from "@/lib/utils";
import type { SidebarStats } from "@/lib/sidebar-stats";

type AppShellProps = {
  stats: SidebarStats;
  children: React.ReactNode;
};

function SidebarWithSearchParams(props: AppSidebarProps) {
  return <AppSidebar {...props} />;
}

type AppSidebarProps = {
  stats: SidebarStats;
  expanded: boolean;
  onCollapse: () => void;
  onExpand: () => void;
};

export function AppShell({ stats, children }: AppShellProps) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="min-h-svh bg-background">
      <Suspense fallback={null}>
        <SidebarWithSearchParams
          stats={stats}
          expanded={expanded}
          onCollapse={() => setExpanded(false)}
          onExpand={() => setExpanded(true)}
        />
      </Suspense>

      <div
        className={cn(
          "flex min-h-svh flex-col transition-[padding-left] duration-200 ease-in-out",
          expanded ? "md:pl-[216px]" : "md:pl-12"
        )}
      >
        <MobileNav />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
