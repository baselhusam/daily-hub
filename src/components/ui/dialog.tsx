"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DialogCloseVisibility = React.createContext(true);

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-scrim backdrop-blur-[3px] data-[state=open]:animate-dh-fade data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

function isPopoverEvent(event: { target: EventTarget | null }) {
  const target = event.target as HTMLElement | null;
  return Boolean(target?.closest("[data-slot='popover-content']"));
}

function DialogContent({
  className,
  children,
  showClose = true,
  placement = "sheet",
  onPointerDownOutside,
  onFocusOutside,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showClose?: boolean;
  placement?: "sheet" | "top";
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 flex w-full flex-col gap-0 overflow-y-auto overscroll-contain border border-border bg-card shadow-dialog outline-none data-[state=open]:animate-dh-pop data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          placement === "sheet" &&
            "inset-x-0 bottom-0 top-auto max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-0.75rem))] translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none pb-[env(safe-area-inset-bottom)] dh:inset-auto dh:top-[50%] dh:left-[50%] dh:bottom-auto dh:w-full dh:max-w-[520px] dh:max-h-[min(88dvh,740px)] dh:translate-x-[-50%] dh:translate-y-[-50%] dh:rounded-xl dh:pb-0",
          placement === "top" &&
            "top-[max(0.75rem,env(safe-area-inset-top))] left-[50%] w-[min(calc(100%-1.5rem),480px)] max-h-[min(88dvh,740px)] translate-x-[-50%] translate-y-0 rounded-xl",
          className
        )}
        onPointerDownOutside={(event) => {
          if (isPopoverEvent(event)) event.preventDefault();
          onPointerDownOutside?.(event);
        }}
        onFocusOutside={(event) => {
          if (isPopoverEvent(event)) event.preventDefault();
          onFocusOutside?.(event);
        }}
        onInteractOutside={(event) => {
          if (isPopoverEvent(event)) event.preventDefault();
          onInteractOutside?.(event);
        }}
        {...props}
      >
        <DialogCloseVisibility.Provider value={showClose}>
          {children}
        </DialogCloseVisibility.Provider>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogCloseButton() {
  return (
    <DialogPrimitive.Close
      type="button"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-track text-[15px] leading-none text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-signal/14 disabled:pointer-events-none dh:h-[27px] dh:w-[27px]"
    >
      <X className="h-3.5 w-3.5" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  );
}

function DialogHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const showClose = React.useContext(DialogCloseVisibility);

  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex items-center justify-between gap-3 border-b border-rule-soft px-5 pt-[18px] pb-[15px] text-left",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
      {showClose ? <DialogCloseButton /> : null}
    </div>
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-wrap items-center justify-end gap-2.5 border-t border-rule-soft px-5 py-[15px]",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-[23px] leading-none font-semibold tracking-[-0.015em]",
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("flex flex-col gap-[15px] px-5 py-[18px]", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogBody,
};
