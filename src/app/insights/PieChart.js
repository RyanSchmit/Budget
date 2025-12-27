"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const renderPercentLabel = ({ percent }) => {
  if (percent < 0.05) return null;
  return `${Math.round(percent * 100)}%`;
};

const parseDate = (dateStr) => {
  const [month, day, year] = dateStr.split("-");
  return new Date(year, month - 1, day);
};

const isInRange = (dateStr, range) => {
  const now = new Date();
  const txDate = parseDate(dateStr);

  if (range === "month") {
    return (
      txDate.getMonth() === now.getMonth() &&
      txDate.getFullYear() === now.getFullYear()
    );
  }

  if (range === "3months") {
    const past3Months = new Date(
      now.getFullYear(),
      now.getMonth() - 3,
      now.getDate()
    );
    return txDate >= past3Months;
  }

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return txDate >= startOfYear;
};

export default function CategoryPieChart({ transactions }) {
  const [range, setRange] = useState("ytd");
  const [showAllTime, setShowAllTime] = useState(false);

  // Filter out Income
  const expensesOnly = transactions.filter((t) => t.category !== "Income");

  // Filter by range only if not showing all time
  const filtered = expensesOnly.filter((t) =>
    showAllTime ? true : isInRange(t.date, range)
  );

  // Total spent
  const totalSpent = showAllTime
    ? expensesOnly.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    : filtered.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Group by category
  const data = Object.values(
    filtered.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = { name: t.category, value: 0 };
      acc[t.category].value += Math.abs(t.amount);
      return acc;
    }, {})
  );

  return (
    <div className="w-full bg-black rounded-xl p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h2 className="text-lg font-semibold">Expenses by Category</h2>
          <p className="text-white/70 mt-1">
            Total spent:{" "}
            <span className="font-bold">
              $
              {totalSpent.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          {/* Range buttons only if NOT showing all time */}
          {!showAllTime &&
            [
              { label: "YTD", value: "ytd" },
              { label: "Month", value: "month" },
              { label: "3M", value: "3months" },
            ].map((btn) => (
              <button
                key={btn.value}
                onClick={() => setRange(btn.value)}
                className={`px-3 py-1 rounded-lg text-sm transition ${
                  range === btn.value
                    ? "bg-red-600 text-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {btn.label}
              </button>
            ))}

          {/* All Time Total Button */}
          <button
            onClick={() => setShowAllTime((prev) => !prev)}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              showAllTime
                ? "bg-green-600 text-white"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {showAllTime ? "Show Range Total" : "Show All Time Total"}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={renderPercentLabel}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) =>
                `$${value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
