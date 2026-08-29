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
import {
  summarize,
  summarizeByMonth,
  formatRate,
  type MonthlySummary,
} from "../summary";

interface NetIncomeChartProps {
  transactions: Transaction[];
}

const POSITIVE_COLOR = "#22c55e";
const NEGATIVE_COLOR = "#ef4444";
const MUTED_COLOR = "#ffffff66";

const BASIS_DESCRIPTION =
  "Income minus expenses, divided by income. Rows categorized Income count as income; everything else counts as spending, with credits netting against the category they were posted to.";

function rateColor(rate: number | null): string {
  if (rate === null) return MUTED_COLOR;
  return rate >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
}

interface TooltipPayloadItem {
  payload: MonthlySummary;
}

function NetIncomeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const { month, income, expenses, net, rate } = payload[0].payload;
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
      <p className="text-white/70">Expenses: {formatMoney(expenses)}</p>
      <p className="font-semibold" style={{ color: rateColor(rate) }}>
        Savings rate: {formatRate(rate)}
      </p>
    </div>
  );
}

const RING_RADIUS = 11;
const RING_STROKE = 3;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// A ring filled clockwise from the top to show what share of that month's
// income was kept.
function SavingsRing({ cx, cy, rate }: { cx: number; cy: number; rate: number }) {
  const filled = Math.max(0, Math.min(1, rate));
  const color = rateColor(rate);

  return (
    <g transform={`rotate(-90 ${cx} ${cy})`}>
      <circle
        cx={cx}
        cy={cy}
        r={RING_RADIUS}
        fill="none"
        stroke="#ffffff26"
        strokeWidth={RING_STROKE}
      />
      {filled > 0 ? (
        <circle
          cx={cx}
          cy={cy}
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - filled)}
        />
      ) : null}
    </g>
  );
}

interface MonthTickProps {
  x?: number;
  y?: number;
  payload?: { value: string; index: number };
  data: MonthlySummary[];
}

function MonthTick({ x = 0, y = 0, payload, data }: MonthTickProps) {
  const row = payload ? data[payload.index] : undefined;
  const rate = row?.rate ?? null;

  // A month that spent more than it earned has no meaningful savings rate, so
  // the red bar tells the story on its own.
  const showRate = rate !== null && rate >= 0;

  return (
    <g>
      <text x={x} y={y + 14} textAnchor="middle" fill="#ffffffb3" fontSize={12}>
        {payload?.value}
      </text>
      {showRate ? (
        <>
          <text
            x={x}
            y={y + 31}
            textAnchor="middle"
            fill={rateColor(rate)}
            fontSize={12}
            fontWeight={600}
          >
            {formatRate(rate)}
          </text>
          <SavingsRing cx={x} cy={y + 53} rate={rate} />
        </>
      ) : null}
    </g>
  );
}

export default function NetIncomeChart({ transactions }: NetIncomeChartProps) {
  const data = useMemo(() => summarizeByMonth(transactions), [transactions]);

  const overall = useMemo(() => summarize(transactions), [transactions]);

  return (
    <div className="w-full bg-black rounded-xl p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Net Income by Month</h2>
        <p className="text-white/70 mt-1">
          Monthly inflows minus outflows. Green is positive, red is negative.
          Months that saved something show the rate below their label.
        </p>
        <p className="text-white/70 mt-1" title={BASIS_DESCRIPTION}>
          Overall savings rate:{" "}
          <span className="font-bold" style={{ color: rateColor(overall.rate) }}>
            {formatRate(overall.rate)}
          </span>
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
              dataKey="shortMonth"
              tick={<MonthTick data={data} />}
              interval={0}
              height={72}
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
