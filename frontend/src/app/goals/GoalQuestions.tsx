"use client";

import { useState } from "react";
import Navbar from "@/app/Navbar";
import { useGoals } from "./useGoals";
import { Goal, GOAL_TYPE_OPTIONS } from "./goalTypes";
import GoalCard from "./GoalCard";
import GoalForm from "./GoalForm";
import { formatMoney } from "@/app/format";
import { calculateTimeToGoal } from "./goalCalculate";
import LoadTransactionsClient from "@/app/transactions/LoadTransactionsClient";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { loadTransactionsSuccess } from "@/lib/store/transactionsSlice";
import { Transaction } from "@/app/types";

export default function GoalQuestions() {
  const dispatch = useAppDispatch();
  const { goals, loaded, addGoal, updateGoal, removeGoal } = useGoals();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  function handleSave(goal: Goal) {
    if (editingGoal) {
      updateGoal(goal);
    } else {
      addGoal(goal);
    }
    setShowForm(false);
    setEditingGoal(null);
  }

  function handleEdit(goal: Goal) {
    setEditingGoal(goal);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingGoal(null);
  }

  // Summary stats
  const totalWeekly = goals.reduce((sum, g) => sum + g.weeklyContribution, 0);

  const nearestEta = goals.reduce<{ label: string; weeks: number } | null>((best, g) => {
    if (g.weeklyContribution <= 0 || g.currentSavings >= g.targetAmount) return best;
    if (g.timeline === "flexible") {
      const result = calculateTimeToGoal({
        principal: g.currentSavings,
        weeklyContribution: g.weeklyContribution,
        annualRate: g.annualRate,
        target: g.targetAmount,
      });
      if (!result) return best;
      if (!best || result.weeks < best.weeks) {
        const etaStr =
          result.years === 0
            ? `${result.months}mo`
            : result.months === 0
            ? `${result.years}y`
            : `${result.years}y ${result.months}mo`;
        return { label: `${g.name} in ${etaStr}`, weeks: result.weeks };
      }
    }
    return best;
  }, null);

  const completedGoals = goals.filter((g) => g.currentSavings >= g.targetAmount).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <LoadTransactionsClient
        onLoaded={(txs: Transaction[]) => dispatch(loadTransactionsSuccess(txs))}
      />
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 pt-20 pb-20">
        {/* Page header */}
        <div className="mt-8 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Goals</h1>
            <p className="mt-1 text-sm text-gray-400">
              Plan and track your financial goals
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setEditingGoal(null);
                setShowForm(true);
              }}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium transition hover:bg-green-500"
            >
              + Add Goal
            </button>
          )}
        </div>

        {/* Summary stats (only if there are goals) */}
        {goals.length > 0 && !showForm && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Goals</p>
              <p className="mt-1 text-2xl font-bold">{goals.length}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{completedGoals}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Weekly commitment</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(totalWeekly)}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Nearest deadline</p>
              <p className="mt-1 text-sm font-semibold text-yellow-300 leading-snug">
                {nearestEta?.label ?? "—"}
              </p>
            </div>
          </div>
        )}

        {/* Add / Edit form */}
        {showForm && (
          <div className="mb-8 rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-semibold">
              {editingGoal ? `Edit: ${editingGoal.name}` : "New Goal"}
            </h2>
            <GoalForm
              initial={editingGoal ?? undefined}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Goals grid */}
        {!showForm && loaded && (
          <>
            {goals.length === 0 ? (
              <div className="mt-16 flex flex-col items-center gap-5 text-center">
                <div className="text-6xl">🎯</div>
                <div>
                  <h2 className="text-xl font-semibold">No goals yet</h2>
                  <p className="mt-2 text-sm text-gray-400 max-w-sm">
                    Add your first financial goal to start tracking your progress and
                    see personalized projections.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {GOAL_TYPE_OPTIONS.map((o) => (
                    <span
                      key={o.value}
                      className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-400"
                    >
                      {o.icon} {o.label}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 rounded-lg bg-green-600 px-6 py-3 font-medium transition hover:bg-green-500"
                >
                  Add your first goal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEdit}
                    onDelete={removeGoal}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
