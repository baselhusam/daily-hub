"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompletionDayPoint } from "@/lib/analytics";

export function CompletionsChart({
  data,
  compact = false,
}: {
  data: CompletionDayPoint[];
  compact?: boolean;
}) {
  return (
    <Card className={compact ? "h-full" : undefined}>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className="text-sm font-medium">
          {compact ? "Activity" : "Activity — last 14 days"}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "h-28 px-2" : "h-72"}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--foreground)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            {!compact && (
              <>
                <Bar
                  dataKey="tasks"
                  name="Tasks"
                  stackId="a"
                  fill="var(--foreground)"
                  fillOpacity={0.35}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="daily"
                  name="Daily"
                  stackId="a"
                  fill="var(--foreground)"
                  fillOpacity={0.65}
                  radius={[4, 4, 0, 0]}
                />
              </>
            )}
            {compact && (
              <Bar
                dataKey="total"
                name="Total"
                fill="var(--foreground)"
                fillOpacity={0.5}
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
