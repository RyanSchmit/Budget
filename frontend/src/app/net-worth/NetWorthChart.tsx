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

const RANGES = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: null },
] as const;

type RangeLabel = (typeof RANGES)[number]["label"];

function filterByRange(data: NetWorthHistoryItem[], months: number | null) {
  if (months === null) return data;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return data.filter((d) => new Date(d.date) >= cutoff);
}

export default function NetWorthChart({ data }: NetWorthChartProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [range, setRange] = useState<RangeLabel>("All");

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

        <div className="flex items-center gap-2">
          {/* Time range buttons */}
          <div className="flex gap-1">
            {RANGES.map(({ label, months }) => (
              <button
                key={label}
                onClick={() => setRange(label)}
                className={`px-2 py-1 text-xs rounded ${
                  range === label
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFullscreen((prev) => !prev)}
            className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-500 rounded text-white"
          >
            {fullscreen ? "Exit Full Screen" : "Full Screen"}
          </button>
        </div>
      </div>

      {/* Chart */}
      {(() => {
        const selectedMonths = RANGES.find((r) => r.label === range)?.months ?? null;
        const visibleData = filterByRange(data, selectedMonths);
        return visibleData.length > 1 ? (
        <ResponsiveContainer width="100%" height={fullscreen ? "90%" : 300}>
          <LineChart data={visibleData} margin={{ right: 50 }}>
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              minTickGap={48}
              tickFormatter={(date: string) => {
                const [year, month] = date.split("-").map(Number);
                const d = new Date(year, month - 1);
                return `${d.toLocaleDateString("en-US", { month: "short" })} '${String(year).slice(-2)}`;
              }}
            />
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
      );
      })()}
    </section>
  );
}
