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
import type { BusinessAnalytics } from "@/lib/analytics";

export function BusinessChart({ data }: { data: BusinessAnalytics[] }) {
  const chartData = data.map((b) => ({
    name: b.name,
    open: b.openTasks,
    done: b.completedTasks,
  }));

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground">No businesses yet.</p>;
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
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
            dataKey="open"
            name="Open"
            fill="var(--signal-wash)"
            radius={3}
          />
          <Bar
            dataKey="done"
            name="Completed"
            fill="var(--done)"
            radius={3}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
