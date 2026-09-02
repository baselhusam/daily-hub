"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

let isThemeTransitionRunning = false;

function switchThemeFromEvent(
  event: React.MouseEvent<HTMLButtonElement>,
  nextTheme: "light" | "dark",
  setTheme: (theme: string) => void,
  onFinish: () => void
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
    onFinish();
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

  let transition: ViewTransition;

  try {
    transition = document.startViewTransition(apply);
  } catch {
    apply();
    onFinish();
    return;
  }

  transition.ready
    .then(() => {
      const animation = document.documentElement.animate(
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

      return animation.finished;
    })
    .catch(() => {
      // Transition skipped (tab hidden, reduced motion, or already running).
    })
    .finally(() => {
      onFinish();
    });
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isSwitching, setIsSwitching] = React.useState(false);

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
      aria-busy={isSwitching || undefined}
      disabled={!mounted || isSwitching}
      onClick={(event) => {
        if (!mounted || isThemeTransitionRunning) return;

        isThemeTransitionRunning = true;
        setIsSwitching(true);
        switchThemeFromEvent(
          event,
          resolvedTheme === "dark" ? "light" : "dark",
          setTheme,
          () => {
            isThemeTransitionRunning = false;
            setIsSwitching(false);
          }
        );
      }}
    >
      <Sun className="h-4 w-4 scale-100 rotate-0 opacity-100 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:scale-0 dark:-rotate-90 dark:opacity-0" />
      <Moon className="absolute h-4 w-4 scale-0 rotate-90 opacity-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:scale-100 dark:rotate-0 dark:opacity-100" />
    </Button>
  );
}
