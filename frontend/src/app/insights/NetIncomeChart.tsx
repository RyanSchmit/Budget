"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Transaction } from "../types";
import { formatMoney } from "../format";

interface NetIncomeChartProps {
  transactions: Transaction[];
}

interface MonthlyNet {
  key: string;
  month: string;
  net: number;
}

const POSITIVE_COLOR = "#22c55e";
const NEGATIVE_COLOR = "#ef4444";

interface TooltipPayloadItem {
  payload: MonthlyNet;
}

function NetIncomeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const { month, net } = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/20 bg-[#111] px-3 py-2 text-sm">
      <p className="text-white/70">{month}</p>
      <p
        className="font-semibold"
        style={{ color: net >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR }}
      >
        {formatMoney(net)}
      </p>
    </div>
  );
}

const monthShortNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function NetIncomeChart({ transactions }: NetIncomeChartProps) {
  const data = useMemo<MonthlyNet[]>(() => {
    const byMonth = new Map<string, number>();

    for (const t of transactions) {
      const date = new Date(t.date);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + t.amount);
    }

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, net]) => {
        const [year, month] = key.split("-");
        return {
          key,
          month: `${monthShortNames[Number(month) - 1]} ${year}`,
          net,
        };
      });
  }, [transactions]);

  return (
    <div className="w-full bg-black rounded-xl p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Net Income by Month</h2>
        <p className="text-white/70 mt-1">
          Monthly inflows minus outflows. Green is positive, red is negative.
        </p>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
            <XAxis
              dataKey="month"
              tick={{ fill: "#ffffffb3", fontSize: 12 }}
              tickLine={{ stroke: "#ffffff33" }}
              axisLine={{ stroke: "#ffffff33" }}
            />
            <YAxis
              tick={{ fill: "#ffffffb3", fontSize: 12 }}
              tickLine={{ stroke: "#ffffff33" }}
              axisLine={{ stroke: "#ffffff33" }}
              tickFormatter={(value: number) =>
                formatMoney(value).replace(/\.00$/, "")
              }
              width={80}
            />
            <Tooltip
              cursor={{ fill: "#ffffff14" }}
              content={<NetIncomeTooltip />}
            />
            <ReferenceLine y={0} stroke="#ffffff66" />
            <Bar dataKey="net" radius={[2, 2, 0, 0]}>
              {data.map((d) => (
                <Cell
                  key={d.key}
                  fill={d.net >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
