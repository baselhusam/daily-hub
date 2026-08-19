"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/notifications";

type NotificationBellProps = {
  notifications: AppNotification[];
};

function toneDot(tone: AppNotification["tone"]) {
  if (tone === "warn") return "bg-warn";
  if (tone === "signal") return "bg-signal";
  return "bg-faint";
}

export function NotificationBell({ notifications }: NotificationBellProps) {
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
        <Button
          variant="outline"
          size="icon"
          className="relative h-8 w-8 border-border bg-card text-muted-foreground shadow-none hover:text-foreground"
          aria-label={
            count === 0
              ? "Notifications"
              : `${count} notification${count === 1 ? "" : "s"}`
          }
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-background bg-signal" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <p className="text-[13px] font-semibold">Notifications</p>
          <span className="text-[11.5px] font-semibold tabular-nums text-faint">
            {count}
          </span>
        </div>
        {count === 0 ? (
          <p className="px-3.5 py-8 text-center text-[13px] text-muted-foreground">
            Nothing needs attention.
          </p>
        ) : (
          <div className="max-h-[360px] overflow-y-auto overscroll-contain py-1">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-[120ms] hover:bg-hover"
              >
                {item.project ? (
                  <EntityAvatar
                    name={item.project.name}
                    color={item.project.color}
                    logoUrl={item.project.logoUrl}
                    iconKey={item.project.iconKey}
                    size={22}
                    className="mt-0.5"
                  />
                ) : (
                  <span
                    className={cn(
                      "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full",
                      toneDot(item.tone)
                    )}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium leading-snug">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                {item.actionLabel ? (
                  <span className="shrink-0 pt-0.5 text-[12.5px] font-semibold text-signal">
                    {item.actionLabel} →
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
