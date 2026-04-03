"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { formatMoney } from "@/app/format";
import {
  calculateTimeToGoal,
  calculateRequiredWeeklyContribution,
} from "./goalCalculate";
import { Goal, GOAL_TYPE_OPTIONS } from "./goalTypes";
import { ChartDataPoint } from "@/app/types";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

/** Downsample weekly chart data to monthly (every 4 points) for display. */
function downsample(data: ChartDataPoint[], step = 4): ChartDataPoint[] {
  return data.filter((_, i) => i % step === 0);
}

/** Build chart data for three contribution scenarios. */
function buildScenarios(goal: Goal) {
  const base = goal.weeklyContribution;
  const multipliers = [1, 1.5, 2];
  const labels = ["Current", "+50%", "×2"];

  const results = multipliers.map((m) => {
    const contribution = base * m;
    if (goal.timeline === "flexible") {
      return calculateTimeToGoal({
        principal: goal.currentSavings,
        weeklyContribution: contribution,
        annualRate: goal.annualRate,
        target: goal.targetAmount,
      });
    } else {
      return calculateRequiredWeeklyContribution({
        principal: goal.currentSavings,
        annualRate: goal.annualRate,
        target: goal.targetAmount,
        years: goal.durationYears ?? 5,
      });
    }
  });

  // Find the max number of weeks across all scenarios
  const maxWeeks = Math.max(
    ...results.map((r) => (r ? r.chartData[r.chartData.length - 1]?.week ?? 0 : 0))
  );

  // Build a unified week array with all scenario balances
  interface MergedPoint {
    week: number;
    [key: string]: number;
  }

  const weekMap = new Map<number, MergedPoint>();

  results.forEach((r, idx) => {
    if (!r) return;
    const sampled = downsample(r.chartData, 4);
    sampled.forEach((pt) => {
      if (!weekMap.has(pt.week)) {
        weekMap.set(pt.week, { week: pt.week });
      }
      weekMap.get(pt.week)![labels[idx]] = pt.balance;
    });
  });

  const merged = Array.from(weekMap.values()).sort((a, b) => a.week - b.week);
  return { merged, labels, results, maxWeeks };
}

const COLORS = ["#4ade80", "#facc15", "#60a5fa"];

export default function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const [showChart, setShowChart] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const option = GOAL_TYPE_OPTIONS.find((o) => o.value === goal.type);
  const progress = goal.targetAmount > 0 ? Math.min(1, goal.currentSavings / goal.targetAmount) : 0;
  const progressPct = Math.round(progress * 100);

  const primaryResult =
    goal.timeline === "flexible"
      ? calculateTimeToGoal({
          principal: goal.currentSavings,
          weeklyContribution: goal.weeklyContribution,
          annualRate: goal.annualRate,
          target: goal.targetAmount,
        })
      : null;

  const etaText = (() => {
    if (progressPct >= 100) return "Goal reached!";
    if (goal.weeklyContribution <= 0) return "Set a weekly contribution";
    if (goal.timeline === "flexible" && primaryResult) {
      const { years, months } = primaryResult;
      if (years === 0) return `~${months} month${months !== 1 ? "s" : ""}`;
      if (months === 0) return `~${years} year${years !== 1 ? "s" : ""}`;
      return `~${years}y ${months}mo`;
    }
    if (goal.timeline === "duration" && goal.durationYears) {
      return `${goal.durationYears} yr fixed`;
    }
    return null;
  })();

  const advisorPrompt = encodeURIComponent(
    `I have a ${option?.label ?? goal.type} goal called "${goal.name}". ` +
      `My target is ${formatMoney(goal.targetAmount)}, I currently have ${formatMoney(goal.currentSavings)} saved, ` +
      `and I contribute ${formatMoney(goal.weeklyContribution)} per week. ` +
      `What advice do you have to help me reach this goal faster?`
  );

  const { merged, labels, results } = buildScenarios(goal);

  // Milestone reference values for the chart (25%, 50%, 75%, 100%)
  const milestones = [0.25, 0.5, 0.75, 1].map((pct) => ({
    value: goal.targetAmount * pct,
    label: `${pct * 100}%`,
  }));

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">{option?.icon ?? "🎯"}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">{goal.name}</h3>
            <p className="text-xs text-gray-400">{option?.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(goal)}
            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            Edit
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(goal.id)}
                className="rounded px-2 py-1 text-xs bg-red-700 text-white hover:bg-red-600 transition"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 transition"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-800 hover:text-red-400 transition"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Progress bar (Idea 5) */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">
            {formatMoney(goal.currentSavings)}{" "}
            <span className="text-gray-600">of {formatMoney(goal.targetAmount)}</span>
          </span>
          <span
            className={`font-semibold ${
              progressPct >= 100
                ? "text-green-400"
                : progressPct >= 75
                ? "text-yellow-400"
                : "text-gray-300"
            }`}
          >
            {progressPct}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct >= 100
                ? "bg-green-400"
                : progressPct >= 75
                ? "bg-yellow-400"
                : "bg-green-600"
            }`}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      </div>

      {/* Stats row (Idea 1) */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-gray-800/60 px-2 py-2.5">
          <p className="text-xs text-gray-500">Weekly</p>
          <p className="mt-0.5 text-sm font-medium text-white">
            {formatMoney(goal.weeklyContribution)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800/60 px-2 py-2.5">
          <p className="text-xs text-gray-500">ETA</p>
          <p className={`mt-0.5 text-sm font-medium ${progressPct >= 100 ? "text-green-400" : "text-white"}`}>
            {etaText ?? "—"}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800/60 px-2 py-2.5">
          <p className="text-xs text-gray-500">Return</p>
          <p className="mt-0.5 text-sm font-medium text-white">{goal.annualRate}%/yr</p>
        </div>
      </div>

      {/* What-if chart toggle (Ideas 6 + 8) */}
      <button
        onClick={() => setShowChart((v) => !v)}
        className="w-full rounded-md border border-gray-700 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
      >
        {showChart ? "Hide chart" : "Show growth chart & scenarios"}
      </button>

      {showChart && (
        <div className="space-y-3">
          {/* What-if scenario summary */}
          <div className="grid grid-cols-3 gap-2">
            {labels.map((label, i) => {
              const res = results[i];
              const contribution = goal.weeklyContribution * [1, 1.5, 2][i];
              let etaSummary = "—";
              if (res && "weeks" in res) {
                const { years, months } = res as { years: number; months: number };
                etaSummary = years === 0 ? `${months}mo` : months === 0 ? `${years}y` : `${years}y ${months}mo`;
              }
              return (
                <div
                  key={label}
                  className="rounded-lg bg-gray-800/60 px-2 py-2.5 text-center border border-gray-700/50"
                >
                  <div className="text-xs font-medium" style={{ color: COLORS[i] }}>
                    {label}
                  </div>
                  <div className="mt-0.5 text-xs text-white font-medium">
                    {formatMoney(contribution)}/wk
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">{etaSummary}</div>
                </div>
              );
            })}
          </div>

          {/* Chart */}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={merged} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(w: number) => (w % 52 === 0 ? `${w / 52}y` : "")}
                  stroke="#374151"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `$${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1000
                      ? `$${Math.round(v / 1000)}k`
                      : `$${v}`
                  }
                  stroke="#374151"
                  width={48}
                />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#9ca3af", fontSize: 11 }}
                  formatter={(value, name) => [
                    typeof value === "number" ? formatMoney(value) : "",
                    name,
                  ]}
                  labelFormatter={(w: number) => `Week ${w} (${(w / 52).toFixed(1)} yrs)`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                />

                {/* Milestone reference lines (Idea 8) */}
                {milestones.map((m) => (
                  <ReferenceLine
                    key={m.label}
                    y={m.value}
                    stroke="#374151"
                    strokeDasharray="4 3"
                    label={{
                      value: m.label,
                      position: "insideTopRight",
                      fontSize: 9,
                      fill: "#6b7280",
                    }}
                  />
                ))}

                {labels.map((label, i) => (
                  <Line
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={COLORS[i]}
                    strokeWidth={i === 0 ? 2 : 1.5}
                    dot={false}
                    strokeDasharray={i === 0 ? undefined : i === 1 ? "4 2" : "2 2"}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-600 text-center">
            Dashed lines show +50% and ×2 contribution scenarios
          </p>
        </div>
      )}

      {/* AI Advisor link (Idea 7) */}
      <Link
        href={`/advisor?q=${advisorPrompt}`}
        className="flex items-center justify-center gap-2 w-full rounded-md border border-gray-700 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
      >
        <span>✨</span>
        Get advice from AI Advisor
      </Link>
    </div>
  );
}
