"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  CalendarCheck,
} from "lucide-react";
import { BrandLockup } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/daily", label: "Habits", icon: CalendarCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <header className="flex h-12 items-center justify-between border-b bg-paper px-4">
        <Link href="/" aria-label="DailyHub">
          <BrandLockup size={24} wordmarkClassName="text-[15px] leading-none" />
        </Link>
        <ThemeToggle />
      </header>
      <nav className="flex border-b bg-background">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px]",
                isActive
                  ? "font-semibold text-foreground"
                  : "font-medium text-faint"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 h-[2.5px] w-[26px] -translate-x-1/2 rounded-sm bg-signal" />
              )}
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
