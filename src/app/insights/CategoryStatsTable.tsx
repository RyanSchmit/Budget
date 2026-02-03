"use client";

import { useState, useMemo } from "react";
import { Transaction } from "../types";
import { formatMoney } from "../format";

interface CategoryStatsTableProps {
  transactions: Transaction[];
}

interface CategoryStats {
  category: string;
  min: number;
  avg: number;
  max: number;
  count: number; // average transactions per month
}

type SortKey = keyof CategoryStats;

interface SortConfig {
  key: SortKey | null;
  direction: "asc" | "desc";
}

export default function CategoryStatsTable({
  transactions,
}: CategoryStatsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "avg",
    direction: "desc",
  });

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "desc" ? "asc" : "desc",
        };
      }
      return { key, direction: "desc" };
    });
  };

  const SortArrow = ({
    active,
    direction,
  }: {
    active: boolean;
    direction: "asc" | "desc";
  }) => {
    if (!active) return <span className="ml-1 text-white/50">⇅</span>;
    return <span className="ml-1">{direction === "desc" ? "▼" : "▲"}</span>;
  };

  const stats = useMemo(() => {
    const expensesOnly = transactions.filter((t) => t.category !== "Income");
    // Group by category and month (YYYY-MM)
    const byCatMonth: Record<
      string,
      Record<string, { sum: number; count: number }>
    > = {};
    for (const t of expensesOnly) {
      const amount = Math.abs(t.amount);
      const [month, , year] = t.date.split("-");
      const monthKey = `${year}-${month}`;
      if (!byCatMonth[t.category]) byCatMonth[t.category] = {};
      const monthData = byCatMonth[t.category][monthKey] ?? {
        sum: 0,
        count: 0,
      };
      monthData.sum += amount;
      monthData.count += 1;
      byCatMonth[t.category][monthKey] = monthData;
    }

    const result: CategoryStats[] = Object.entries(byCatMonth).map(
      ([category, months]) => {
        const totals = Object.values(months).map((m) => m.sum);
        const counts = Object.values(months).map((m) => m.count);
        const n = totals.length;
        const sumTotal = totals.reduce((a, b) => a + b, 0);
        const sumCount = counts.reduce((a, b) => a + b, 0);
        return {
          category,
          min: n ? Math.min(...totals) : 0,
          max: n ? Math.max(...totals) : 0,
          avg: n ? sumTotal / n : 0,
          count: n ? sumCount / n : 0,
        };
      }
    );

    return result;
  }, [transactions]);

  const sortedStats = useMemo(() => {
    if (!sortConfig.key) return stats;
    return [...stats].sort((a, b) => {
      const aVal = a[sortConfig.key!];
      const bVal = b[sortConfig.key!];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "desc"
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      return sortConfig.direction === "desc" ? bNum - aNum : aNum - bNum;
    });
  }, [stats, sortConfig]);

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, row) => ({
        min: acc.min + row.min,
        avg: acc.avg + row.avg,
        max: acc.max + row.max,
        count: acc.count + row.count,
      }),
      { min: 0, avg: 0, max: 0, count: 0 }
    );
  }, [stats]);

  if (stats.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No expense categories to display.
      </div>
    );
  }

  return (
    <div className="relative h-96 overflow-y-auto overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-black border-b border-white/10">
          <tr>
            <th
              onClick={() => handleSort("category")}
              className="px-4 py-3 font-medium text-white/90 cursor-pointer select-none hover:bg-white/5"
            >
              Category
              <SortArrow
                active={sortConfig.key === "category"}
                direction={sortConfig.direction}
              />
            </th>
            <th
              onClick={() => handleSort("min")}
              className="px-4 py-3 font-medium text-white/90 text-right cursor-pointer select-none hover:bg-white/5"
            >
              Min per month
              <SortArrow
                active={sortConfig.key === "min"}
                direction={sortConfig.direction}
              />
            </th>
            <th
              onClick={() => handleSort("avg")}
              className="px-4 py-3 font-medium text-white/90 text-right cursor-pointer select-none hover:bg-white/5"
            >
              Avg per month
              <SortArrow
                active={sortConfig.key === "avg"}
                direction={sortConfig.direction}
              />
            </th>
            <th
              onClick={() => handleSort("max")}
              className="px-4 py-3 font-medium text-white/90 text-right cursor-pointer select-none hover:bg-white/5"
            >
              Max per month
              <SortArrow
                active={sortConfig.key === "max"}
                direction={sortConfig.direction}
              />
            </th>
            <th
              onClick={() => handleSort("count")}
              className="px-4 py-3 font-medium text-white/90 text-right cursor-pointer select-none hover:bg-white/5"
            >
              Transactions per month
              <SortArrow
                active={sortConfig.key === "count"}
                direction={sortConfig.direction}
              />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sortedStats.map((row) => (
            <tr
              key={row.category}
              className="border-b border-white/5 hover:bg-white/5 transition"
            >
              <td className="px-4 py-3 text-white">{row.category}</td>
              <td className="px-4 py-3 text-white/80 text-right tabular-nums">
                {formatMoney(row.min)}
              </td>
              <td className="px-4 py-3 text-white/80 text-right tabular-nums">
                {formatMoney(row.avg)}
              </td>
              <td className="px-4 py-3 text-white/80 text-right tabular-nums">
                {formatMoney(row.max)}
              </td>
              <td className="px-4 py-3 text-white/60 text-right tabular-nums">
                {row.count % 1 === 0 ? row.count : row.count.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-10 bg-black border-t-2 border-white/20">
          <tr className="bg-white/5 font-medium">
            <td className="px-4 py-3 text-white">Total</td>
            <td className="px-4 py-3 text-white text-right tabular-nums">
              {formatMoney(totals.min)}
            </td>
            <td className="px-4 py-3 text-white text-right tabular-nums">
              {formatMoney(totals.avg)}
            </td>
            <td className="px-4 py-3 text-white text-right tabular-nums">
              {formatMoney(totals.max)}
            </td>
            <td className="px-4 py-3 text-white/80 text-right tabular-nums">
              {totals.count % 1 === 0 ? totals.count : totals.count.toFixed(1)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
