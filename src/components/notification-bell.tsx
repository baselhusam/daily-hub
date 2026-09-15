"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/notifications";

type NotificationBellProps = {
  notifications: AppNotification[];
  className?: string;
};

function toneDot(tone: AppNotification["tone"]) {
  if (tone === "warn") return "bg-warn";
  if (tone === "signal") return "bg-signal";
  return "bg-done";
}

export function NotificationBell({ notifications, className }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const count = notifications.length;

  function openItem(item: AppNotification) {
    setOpen(false);
    router.push(item.href);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative grid h-8 w-8 place-items-center rounded-[8px] text-muted-foreground transition-colors duration-[120ms] hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/20",
            open && "bg-hover text-foreground",
            className
          )}
          aria-label={
            count === 0
              ? "Notifications"
              : `${count} notification${count === 1 ? "" : "s"}`
          }
        >
          <Bell className="h-[17px] w-[17px]" strokeWidth={1.7} />
          {count > 0 && (
            <span className="absolute top-1.5 right-[7px] h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(306px,calc(100vw-1.25rem))] rounded-[12px] p-1.5"
      >
        <div className="flex items-center justify-between px-2.5 pt-2 pb-[9px]">
          <span className="text-[10.5px] font-bold tracking-[0.08em] text-faint uppercase">
            Notifications
          </span>
          <span className="text-[11px] font-semibold text-faint tabular-nums">
            {count === 0 ? "" : count}
          </span>
        </div>
        {count === 0 ? (
          <div className="px-2.5 pt-[18px] pb-[22px] text-center">
            <p className="text-[13px] text-muted-foreground">Nothing new.</p>
            <p className="mt-[3px] text-[11.5px] text-faint">You are caught up for today.</p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto overscroll-contain">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className="flex w-full items-start gap-[9px] rounded-[8px] px-2.5 py-[9px] text-left transition-colors duration-[120ms] hover:bg-paper"
              >
                {item.project ? (
                  <EntityAvatar
                    name={item.project.name}
                    color={item.project.color}
                    logoUrl={item.project.logoUrl}
                    iconKey={item.project.iconKey}
                    size={18}
                    className="mt-px"
                  />
                ) : (
                  <span
                    className={cn(
                      "mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full",
                      toneDot(item.tone)
                    )}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-snug text-foreground">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-faint">
                    {item.detail}
                    {item.actionLabel ? ` · ${item.actionLabel} →` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
