"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function NetWorthChart({ data }) {
  return (
    <section className="w-full bg-gray-900 p-6 rounded-md shadow-md">
      <h2 className="text-xl font-semibold mb-4">Net Worth Over Time</h2>

      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis
              stroke="#9CA3AF"
              tickFormatter={(val) =>
                new Intl.NumberFormat("en-US", {
                  notation: "compact",
                  style: "currency",
                  currency: "USD",
                }).format(val)
              }
            />
            <Tooltip
              formatter={(val) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(val)
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#22c55e"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-400 text-sm">
          Enter values to start tracking your net worth.
        </p>
      )}
    </section>
  );
}