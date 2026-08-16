"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CompletionDayPoint } from "@/lib/analytics";

export function CompletionsChart({
  data,
}: {
  data: CompletionDayPoint[];
}) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
              color: "var(--foreground)",
              boxShadow: "none",
            }}
          />
          <Bar
            dataKey="tasks"
            name="Tasks"
            stackId="a"
            fill="var(--signal-wash)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="daily"
            name="Habits"
            stackId="a"
            fill="var(--signal)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
