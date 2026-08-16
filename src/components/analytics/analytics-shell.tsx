"use client";

import type { AnalyticsData } from "@/lib/analytics";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard, SurfaceCardBody } from "@/components/ui/surface-card";
import { ChainDots } from "@/components/ui/chain-dots";
import { ProgressBar } from "@/components/ui/progress-bar";

export function AnalyticsShell({ data }: { data: AnalyticsData }) {
  const maxDay = Math.max(1, ...data.completionsByDay.map((d) => d.total));

  return (
    <div className="page-gutter animate-dh-fade py-[clamp(18px,2.6vw,32px)] pb-28">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-5">
        <PageHeader
          eyebrow={data.rangeLabel}
          title="Looking back"
          description={data.lede}
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {data.bigStats.map((stat) => (
            <SurfaceCard key={stat.label} className="px-4 py-[15px]">
              <p className="text-[11.5px] font-semibold tracking-[0.02em] text-faint">
                {stat.label}
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span
                  className="text-metric"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="text-[12px] text-faint">{stat.unit}</span>
                )}
              </div>
            </SurfaceCard>
          ))}
        </div>

        <SurfaceCard>
          <SurfaceCardBody>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-section">Activity over time</h2>
              <div className="flex gap-3.5 text-[11.5px] text-faint">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-foreground" />
                  Tasks
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-[#C7C6C2]" />
                  Habits
                </span>
              </div>
            </div>
            <div className="flex h-[150px] items-end gap-[clamp(3px,0.9vw,9px)]">
              {data.completionsByDay.map((day) => (
                <div
                  key={day.date}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  {day.total > 0 && (
                    <span className="text-[10px] text-faint tabular-nums">
                      {day.total}
                    </span>
                  )}
                  <div className="flex w-full flex-1 flex-col justify-end gap-0.5">
                    <div
                      className="w-full rounded-t-[3px]"
                      style={{
                        height: `${(day.daily / maxDay) * 100}%`,
                        minHeight: day.daily ? 3 : 0,
                        backgroundColor: day.isToday ? "#9CC7EE" : "#D3D2CF",
                      }}
                    />
                    <div
                      className="w-full rounded-b-[3px]"
                      style={{
                        height: `${(day.tasks / maxDay) * 100}%`,
                        minHeight: day.tasks ? 3 : 0,
                        backgroundColor: day.isToday ? "#2383E2" : "#37352F",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-[clamp(3px,0.9vw,9px)]">
              {data.completionsByDay.map((day) => (
                <div
                  key={`${day.date}-label`}
                  className="min-w-0 flex-1 text-center text-[11px] tracking-[-0.02em] tabular-nums"
                  style={{ color: day.isToday ? "#2383E2" : "#9B9A97" }}
                >
                  {day.label}
                </div>
              ))}
            </div>
          </SurfaceCardBody>
        </SurfaceCard>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
          <SurfaceCard>
            <SurfaceCardBody>
              <h2 className="text-section">Where the time went</h2>
              <p className="mb-4 text-[12.5px] text-faint">
                Focus hours by business
              </p>
              <div className="flex flex-col gap-3.5">
                {data.byBusiness.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  data.byBusiness.map((b) => (
                    <div key={b.name}>
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-[13.5px] font-semibold">
                          {b.name}
                        </span>
                        <span className="text-[12px] text-muted-foreground tabular-nums">
                          {b.hours}h · {b.share}
                        </span>
                      </div>
                      <ProgressBar
                        value={b.barWidth}
                        color={b.color}
                        height="md"
                      />
                    </div>
                  ))
                )}
              </div>
            </SurfaceCardBody>
          </SurfaceCard>

          <SurfaceCard>
            <SurfaceCardBody>
              <h2 className="text-section">Project progress</h2>
              <p className="mb-4 text-[12.5px] text-faint">Done vs. still open</p>
              <div className="flex flex-col gap-3.5">
                {data.byProject.map((p) => (
                  <div key={p.id}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[13.5px] font-semibold">
                        {p.name}
                      </span>
                      <span
                        className="text-[12px] tabular-nums"
                        style={{ color: p.noteColor }}
                      >
                        {p.note}
                      </span>
                    </div>
                    <ProgressBar value={p.barWidth} color={p.color} height="md" />
                  </div>
                ))}
              </div>
            </SurfaceCardBody>
          </SurfaceCard>
        </div>

        <SurfaceCard>
          <SurfaceCardBody>
            <h2 className="text-section">Habit consistency</h2>
            <p className="mb-4 text-[12.5px] text-faint">
              Scheduled days only · left is oldest
            </p>
            <div className="flex flex-col gap-3">
              {data.dailyTaskStats.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-wrap items-center gap-3.5"
                >
                  <span className="min-w-0 flex-1 basis-[150px] truncate text-[13.5px] font-semibold">
                    {h.title}
                  </span>
                  <ChainDots dots={h.dots} size="md" />
                  <span
                    className="w-[46px] text-right text-[13px] font-semibold tabular-nums"
                    style={{ color: h.rateColor }}
                  >
                    {h.rate}%
                  </span>
                </div>
              ))}
            </div>
          </SurfaceCardBody>
        </SurfaceCard>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
          <SurfaceCard>
            <SurfaceCardBody>
              <h2 className="text-section">Best and worst days</h2>
              <p className="mb-4 text-[12.5px] text-faint">{data.weekdayNote}</p>
              <div className="flex h-[110px] items-end gap-2">
                {data.weekdays.map((w) => (
                  <div
                    key={w.label}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <span className="text-[10px] text-faint tabular-nums">
                      {w.count}
                    </span>
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${w.barHeight}%`,
                        backgroundColor:
                          w.labelColor === "#2383E2"
                            ? "#2383E2"
                            : w.barHeight <= 3
                              ? "#EDEDEC"
                              : "#C7C6C2",
                      }}
                    />
                    <span
                      className="text-[11.5px] font-semibold tabular-nums"
                      style={{ color: w.labelColor }}
                    >
                      {w.label}
                    </span>
                  </div>
                ))}
              </div>
            </SurfaceCardBody>
          </SurfaceCard>

          <SurfaceCard>
            <SurfaceCardBody>
              <h2 className="text-section">When you actually work</h2>
              <p className="mb-4 text-[12.5px] text-faint">
                {data.timeOfDayNote}
              </p>
              <div className="flex flex-col gap-3">
                {data.timeOfDay.map((t) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <span className="w-[88px] shrink-0 text-[13px] font-semibold">
                      {t.name}
                    </span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-[#EDEDEC]">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${t.barWidth}%`,
                          backgroundColor: t.isPeak ? "#2383E2" : "#C7C6C2",
                        }}
                      />
                    </div>
                    <span className="w-[34px] text-right text-[12px] text-muted-foreground tabular-nums">
                      {t.count}
                    </span>
                  </div>
                ))}
              </div>
            </SurfaceCardBody>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
