"use client";

import type { ReactNode } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Transaction } from "../types";
import { formatMoney } from "../format";
import { spendByCategory, summarize } from "../summary";
import SavingsRateStat from "./SavingsRateStat";

interface CategoryPieChartProps {
  transactions: Transaction[];
  filters?: ReactNode;
}

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

const renderPercentLabel = ({ percent }: { percent: number }) => {
  if (percent < 0.05) return null;
  return `${Math.round(percent * 100)}%`;
};

interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

export default function CategoryPieChart({
  transactions,
  filters,
}: CategoryPieChartProps) {
  const { income: totalIncome, expenses: totalSpent } =
    summarize(transactions);

  // A category whose credits outweigh its charges has no slice to draw, so it
  // is left out of the pie even though it still counts toward the total.
  const data: ChartDataItem[] = spendByCategory(transactions)
    .filter((entry) => entry.amount > 0)
    .map((entry) => ({ name: entry.category, value: entry.amount }));

  return (
    <div className="w-full bg-black rounded-xl p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h2 className="text-lg font-semibold">Expenses by Category</h2>
          <p className="text-white/70 mt-1">
            Total Income:{" "}
            <span className="font-bold">{formatMoney(totalIncome)}</span>
          </p>
          <p className="text-white/70 mt-1">
            Total spent:{" "}
            <span className="font-bold">{formatMoney(totalSpent)}</span>
          </p>
          <SavingsRateStat transactions={transactions} />
        </div>
        {filters ? <div className="flex gap-3 flex-wrap">{filters}</div> : null}
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data as any}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={renderPercentLabel as any}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) =>
                typeof value === "number" ? formatMoney(value) : ""
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
