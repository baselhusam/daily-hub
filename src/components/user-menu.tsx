"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  initials: string;
  displayName: string;
  workspaceName: string;
  collapsed: boolean;
  onSearchOpen: () => void;
  onSettingsOpen: () => void;
  onToggleSidebar: () => void;
};

/**
 * The avatar at the far right of the top bar. Its menu is a short list of
 * jumps with their keyboard chords, so the shortcuts are discoverable
 * without a help screen.
 */
export function UserMenu({
  initials,
  displayName,
  workspaceName,
  collapsed,
  onSearchOpen,
  onSettingsOpen,
  onToggleSidebar,
}: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const items = [
    { label: "Today", key: "G T", run: () => router.push("/") },
    { label: "Projects", key: "G P", run: () => router.push("/projects") },
    { label: "Habits", key: "G H", run: () => router.push("/daily") },
    { label: "Analytics", key: "G A", run: () => router.push("/analytics") },
    { label: "Search", key: "⌘K", run: onSearchOpen },
    {
      label: collapsed ? "Expand sidebar" : "Collapse sidebar",
      key: "⌘B",
      run: onToggleSidebar,
    },
    { label: "Workspace settings", key: "", run: onSettingsOpen },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${displayName} — menu`}
          className={cn(
            "ml-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-[11.5px] font-semibold text-background transition-shadow duration-[120ms]",
            open && "shadow-[0_0_0_3px_var(--hover)]"
          )}
        >
          {initials}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[222px] rounded-[12px] p-1.5">
        <div className="flex items-center gap-[9px] px-2.5 pt-2 pb-2.5">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-foreground text-[11.5px] font-semibold text-background">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{displayName}</span>
            <span className="block truncate text-[11.5px] text-faint">{workspaceName}</span>
          </span>
        </div>
        <div className="my-1 h-px bg-rule-soft" />
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              setOpen(false);
              item.run();
            }}
            className="flex h-8 w-full items-center justify-between rounded-[7px] px-2.5 text-[13px] text-ink-soft transition-colors duration-[120ms] hover:bg-paper hover:text-foreground"
          >
            <span>{item.label}</span>
            {item.key ? (
              <kbd className="font-mono text-[11px] text-faint">{item.key}</kbd>
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
