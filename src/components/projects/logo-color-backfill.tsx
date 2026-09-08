"use client";

import * as React from "react";
import {
  completeLogoColorBackfill,
  fetchLogoDataUrl,
} from "@/app/actions/logo-color";
import type {
  LogoColorBackfillPlan,
  LogoColorResult,
} from "@/lib/logo-color-backfill";
import { isRemoteLogoUrl } from "@/lib/logo";
import {
  extractAccentFromDataUrl,
  readSameOriginUrlAsDataUrl,
} from "@/lib/logo-color-client";

/** Runs the work once the page has settled, so it never competes with paint. */
function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(run, { timeout: 3000 });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(run, 400);
  return () => window.clearTimeout(handle);
}

/**
 * Fills in colours for projects that pre-date them.
 *
 * Colour extraction needs a `<canvas>`, so it cannot run in the migration or
 * anywhere else on the server — this walks the projects the server flagged,
 * reads each logo through the same path the project dialog uses, and hands the
 * results back in one call. Renders nothing.
 */
export function LogoColorBackfill({ plan }: { plan: LogoColorBackfillPlan }) {
  const started = React.useRef(false);
  const { pending, candidates } = plan;

  React.useEffect(() => {
    if (started.current || !pending) return;
    started.current = true;

    let cancelled = false;

    async function run() {
      const results: LogoColorResult[] = [];

      for (const candidate of candidates) {
        if (cancelled) return;

        const dataUrl = isRemoteLogoUrl(candidate.logoUrl)
          ? await fetchLogoDataUrl(candidate.logoUrl)
          : await readSameOriginUrlAsDataUrl(candidate.logoUrl);
        if (!dataUrl) continue;

        const color = await extractAccentFromDataUrl(dataUrl);
        if (color) results.push({ id: candidate.id, color });
      }

      // Leaving the page mid-pass simply defers the work: nothing has been
      // written, so the next load picks the same projects up again.
      if (cancelled) return;

      // Sent even when `results` is empty — that call is what stamps the
      // database as done, and without it an install with nothing to backfill
      // would re-run this query on every page load forever.
      try {
        await completeLogoColorBackfill(results);
      } catch {
        // A colour is cosmetic — a failed backfill must never surface as an
        // error to someone who only opened their dashboard.
        started.current = false;
      }
    }

    const cancelIdle = whenIdle(() => {
      void run();
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return null;
}
