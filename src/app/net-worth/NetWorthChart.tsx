"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { NetWorthHistoryItem } from "../types";

interface NetWorthChartProps {
  data: NetWorthHistoryItem[];
}

export default function NetWorthChart({ data }: NetWorthChartProps) {
  const [fullscreen, setFullscreen] = useState(false);

  // Prevent background scrolling when fullscreen
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  return (
    <section
      className={`bg-gray-900 shadow-md transition-all duration-300 ${
        fullscreen
          ? "fixed inset-0 z-50 p-6 rounded-none"
          : "w-full p-6 rounded-md"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Net Worth Over Time</h2>

        <button
          onClick={() => setFullscreen((prev) => !prev)}
          className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-500 rounded text-white"
        >
          {fullscreen ? "Exit Full Screen" : "Full Screen"}
        </button>
      </div>

      {/* Chart */}
      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={fullscreen ? "90%" : 300}>
          <LineChart data={data} margin={{ right: 50 }}>
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis
              stroke="#9CA3AF"
              tickFormatter={(val: number) =>
                new Intl.NumberFormat("en-US", {
                  notation: "compact",
                  style: "currency",
                  currency: "USD",
                }).format(val)
              }
            />
            <Tooltip
              formatter={(val) =>
                typeof val === "number"
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(val)
                  : ""
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
