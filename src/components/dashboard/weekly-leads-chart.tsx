"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";

export interface WeeklyLeadsDatum {
  day: string;
  leads: number;
}

/**
 * Lead Activity chart (last 7 days).
 *
 * Kept in its own module so the heavy recharts bundle can be code-split
 * behind a next/dynamic() import in the dashboard overview — the chart is
 * only needed after stats finish loading, not on first paint.
 */
export default function WeeklyLeadsChart({
  data,
}: {
  data: WeeklyLeadsDatum[];
}) {
  if (data.every((d) => d.leads === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <BarChart3 className="h-8 w-8 text-white/10 mb-2" />
        <p className="text-xs text-white/30">No lead activity this week</p>
      </div>
    );
  }
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.04)" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(0 0% 100% / 0.25)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(0 0% 100% / 0.2)", fontSize: 10 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0 0% 3%)",
              border: "1px solid hsl(0 0% 100% / 0.08)",
              borderRadius: "12px",
              fontSize: "12px",
              color: "hsl(0 0% 93%)",
            }}
            cursor={{ fill: "hsl(0 0% 100% / 0.03)" }}
          />
          <Bar
            dataKey="leads"
            fill="hsl(217 91% 60%)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
