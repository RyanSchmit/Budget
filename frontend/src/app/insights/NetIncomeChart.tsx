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
  income: number;
  expenses: number;
}

/** Share of the month's income that was kept, or null when it isn't meaningful. */
function savingsRate({ income, expenses }: MonthlyNet): number | null {
  if (income <= 0) return null;
  const saved = income - expenses;
  if (saved <= 0) return null;
  return saved / income;
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
  const monthlyNet = payload[0].payload;
  const { month, net, income, expenses } = monthlyNet;
  const rate = savingsRate(monthlyNet);
  return (
    <div className="rounded-lg border border-white/20 bg-[#111] px-3 py-2 text-sm">
      <p className="text-white/70">{month}</p>
      <p
        className="font-semibold"
        style={{ color: net >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR }}
      >
        {formatMoney(net)}
      </p>
      <p className="text-white/70">Income: {formatMoney(income)}</p>
      <p className="text-white/70">Expense: {formatMoney(expenses)}</p>
      {rate !== null ? (
        <p className="text-white/70">
          Savings rate: {(rate * 100).toFixed(1)}%
        </p>
      ) : null}
    </div>
  );
}

const RING_MAX_RADIUS = 13;
/** Below this radius the ring reads as a dot, so it is dropped instead. */
const RING_MIN_RADIUS = 6;
const RING_GAP = 6;
const LABEL_TOP_GAP = 4;
const MAX_LABEL_SIZE = 12;
const X_AXIS_HEIGHT = 72;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Progressively shorter label lines for a month, so that text keeps fitting
 * inside its band as more months are packed onto the axis.
 */
function labelLines(month: string, year: string, bandWidth: number): string[] {
  if (bandWidth >= 30) return [month, year];
  if (bandWidth >= 18) return [month, `'${year.slice(2)}`];
  if (bandWidth >= 16) return [month];
  return [month.slice(0, 1)];
}

interface MonthTickProps {
  x?: number;
  y?: number;
  /** Width of the plot area, supplied by recharts. */
  width?: number;
  visibleTicksCount?: number;
  payload?: { value: string };
  rates?: Map<string, number | null>;
}

/**
 * Month label with a ring beneath it filled to that month's savings rate. The
 * text and ring scale down with the space each month gets so that no month has
 * to be dropped from the axis.
 */
function MonthTick({
  x = 0,
  y = 0,
  width,
  visibleTicksCount,
  payload,
  rates,
}: MonthTickProps) {
  const label = payload?.value ?? "";
  const rate = rates?.get(label) ?? null;
  const [monthName, year] = label.split(" ");

  const bandWidth =
    width != null && visibleTicksCount
      ? width / visibleTicksCount
      : RING_MAX_RADIUS * 4;

  const labelSize = clamp(Math.round(bandWidth * 0.34), 7, MAX_LABEL_SIZE);
  const lines = labelLines(monthName, year ?? "", bandWidth);
  const labelBottom = LABEL_TOP_GAP + lines.length * (labelSize + 1);

  const radius = clamp((bandWidth - 6) / 2, 0, RING_MAX_RADIUS);
  const ringStroke = radius >= 10 ? 4 : 3;
  const circumference = 2 * Math.PI * radius;
  const rateSize = Math.floor(radius * 0.7);

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={index}
          y={LABEL_TOP_GAP + labelSize + index * (labelSize + 1)}
          textAnchor="middle"
          fill={index === 0 ? "#ffffffb3" : "#ffffff80"}
          fontSize={labelSize}
        >
          {line}
        </text>
      ))}
      {rate !== null && radius >= RING_MIN_RADIUS ? (
        <g
          transform={`translate(0,${labelBottom + RING_GAP + radius + ringStroke})`}
        >
          <circle
            r={radius}
            fill="none"
            stroke="#ffffff26"
            strokeWidth={ringStroke}
          />
          <circle
            r={radius}
            fill="none"
            stroke={POSITIVE_COLOR}
            strokeWidth={ringStroke}
            strokeLinecap="round"
            strokeDasharray={`${rate * circumference} ${circumference}`}
            transform="rotate(-90)"
          />
          {rateSize >= 7 ? (
            <text
              textAnchor="middle"
              dy="0.35em"
              fill="#ffffff"
              fontSize={rateSize}
              fontWeight={600}
            >
              {Math.round(rate * 100)}%
            </text>
          ) : null}
        </g>
      ) : null}
    </g>
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
    const byMonth = new Map<
      string,
      { net: number; income: number; expenses: number }
    >();

    for (const t of transactions) {
      const date = new Date(t.date);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const totals = byMonth.get(key) ?? { net: 0, income: 0, expenses: 0 };
      totals.net += t.amount;
      if (t.category === "Income") {
        totals.income += Math.abs(t.amount);
      } else if (t.amount < 0) {
        totals.expenses += Math.abs(t.amount);
      }
      byMonth.set(key, totals);
    }

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { net, income, expenses }]) => {
        const [year, month] = key.split("-");
        return {
          key,
          month: `${monthShortNames[Number(month) - 1]} ${year}`,
          net,
          income,
          expenses,
        };
      });
  }, [transactions]);

  const ratesByMonth = useMemo(
    () => new Map(data.map((d) => [d.month, savingsRate(d)])),
    [data],
  );

  return (
    <div className="w-full bg-black rounded-xl p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Net Income by Month</h2>
        <p className="text-white/70 mt-1">
          Monthly inflows minus outflows. Green is positive, red is negative.
          The ring under each month shows the share of that month&apos;s income
          you kept.
        </p>
      </div>

      <div className="h-[28rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
            <XAxis
              dataKey="month"
              tick={<MonthTick rates={ratesByMonth} />}
              tickLine={{ stroke: "#ffffff33" }}
              axisLine={{ stroke: "#ffffff33" }}
              height={X_AXIS_HEIGHT}
              interval={0}
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
