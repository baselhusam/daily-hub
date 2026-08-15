"use client";

import * as React from "react";
import { Suspense } from "react";
import { PanelLeft } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
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
        />
      </Suspense>

      {!expanded && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="fixed left-3 top-3 z-40 hidden h-8 w-8 md:inline-flex"
          onClick={() => setExpanded(true)}
          aria-label="Open sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}

      <div
        className={cn(
          "flex min-h-svh flex-col transition-[padding-left] duration-200 ease-in-out",
          expanded ? "md:pl-56" : "md:pl-12"
        )}
      >
        <MobileNav />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
