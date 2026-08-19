"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function switchThemeFromEvent(
  event: React.MouseEvent<HTMLButtonElement>,
  nextTheme: "light" | "dark",
  setTheme: (theme: string) => void
) {
  const apply = () => {
    flushSync(() => {
      setTheme(nextTheme);
    });
  };

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reducedMotion || typeof document.startViewTransition !== "function") {
    apply();
    return;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const fromPointer = event.clientX > 0 || event.clientY > 0;
  const x = fromPointer ? event.clientX : rect.left + rect.width / 2;
  const y = fromPointer ? event.clientY : rect.top + rect.height / 2;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = document.startViewTransition(apply);

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 560,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    })
    .catch(() => {
      // Transition skipped (tab hidden, reduced motion, or already running).
    });
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        "relative h-8 w-8 overflow-hidden border-border bg-card text-muted-foreground shadow-none hover:text-foreground",
        className
      )}
      aria-label="Toggle theme"
      onClick={(event) => {
        if (!mounted) return;
        switchThemeFromEvent(
          event,
          resolvedTheme === "dark" ? "light" : "dark",
          setTheme
        );
      }}
    >
      <Sun className="h-4 w-4 scale-100 rotate-0 opacity-100 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:scale-0 dark:-rotate-90 dark:opacity-0" />
      <Moon className="absolute h-4 w-4 scale-0 rotate-90 opacity-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:scale-100 dark:rotate-0 dark:opacity-100" />
    </Button>
  );
}
