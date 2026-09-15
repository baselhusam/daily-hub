"use client";

import Link from "next/link";
import type { DashboardData } from "@/lib/dashboard";
import { formatFocusHours } from "@/lib/today-insights";

export const WEEK_REVIEW_ID = "week-in-review";

/** The dark band at the foot of Today: one sentence and three numbers. */
export function WeekReviewBanner({ review }: { review: DashboardData["weekReview"] }) {
  const stats = [
    { value: String(review.closed), label: "Closed" },
    {
      value: review.habitsTotal > 0 ? `${review.habitsKept}/${review.habitsTotal}` : "—",
      label: "Habits",
    },
    { value: formatFocusHours(review.focusMinutes), label: "Focus" },
  ];

  return (
    <section
      id={WEEK_REVIEW_ID}
      aria-labelledby="week-review-heading"
      className="flex scroll-mt-6 flex-wrap items-center gap-x-8 gap-y-5 rounded-[14px] bg-foreground px-6 py-[22px] text-background shadow-float"
    >
      <div className="min-w-0 flex-1 basis-[18rem]">
        <p
          id="week-review-heading"
          className="text-[10.5px] font-bold tracking-[0.08em] text-background/50 uppercase"
        >
          Week in review
        </p>
        <p className="mt-2.5 max-w-[34ch] text-[22px] leading-[1.35] tracking-[-0.02em] text-pretty">
          {review.line}
        </p>
      </div>
      <div className="flex gap-7">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-[26px] leading-none font-semibold tabular-nums">{stat.value}</div>
            <div className="mt-[7px] text-[11.5px] text-background/50">{stat.label}</div>
          </div>
        ))}
      </div>
      <Link
        href="/analytics"
        className="inline-flex h-[34px] items-center gap-[7px] rounded-[8px] border border-background/22 px-[15px] text-[13px] font-semibold text-background transition-colors duration-[120ms] hover:bg-background/10"
      >
        Full analytics →
      </Link>
    </section>
  );
}
