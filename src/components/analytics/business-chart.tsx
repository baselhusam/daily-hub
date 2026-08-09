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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BusinessAnalytics } from "@/lib/analytics";

export function BusinessChart({ data }: { data: BusinessAnalytics[] }) {
  const chartData = data.map((b) => ({
    name: b.name,
    open: b.openTasks,
    done: b.completedTasks,
    logged: b.completions,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">By business</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No businesses yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey="open" name="Open" fill="var(--foreground)" fillOpacity={0.25} radius={4} />
              <Bar dataKey="done" name="Completed" fill="var(--foreground)" fillOpacity={0.55} radius={4} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
