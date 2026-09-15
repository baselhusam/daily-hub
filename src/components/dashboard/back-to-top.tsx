"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 560;

/**
 * Floats in once the page has scrolled a screen or so. The scroll container
 * is the app's `<main>`, not the window, so we listen there.
 */
export function BackToTop() {
  const [visible, setVisible] = React.useState(false);
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(main.scrollTop > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      main.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          key="top"
          type="button"
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.3, 1] }}
          onClick={() => {
            document
              .getElementById("main-content")
              ?.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
          }}
          className="fixed right-[max(1.5rem,env(safe-area-inset-right))] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 inline-flex h-[34px] items-center gap-[7px] rounded-full border border-border bg-card px-[13px] text-[12.5px] font-semibold text-ink-soft shadow-float transition-colors duration-[120ms] hover:border-border-strong hover:text-foreground dh:bottom-6"
          title="Back to top"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          Top
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
