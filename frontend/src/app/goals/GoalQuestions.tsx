"use client";

import { useState } from "react";
import Navbar from "@/app/Navbar";
import { useGoals } from "./useGoals";
import { Goal, GOAL_TYPE_OPTIONS } from "./goalTypes";
import GoalCard from "./GoalCard";
import GoalForm from "./GoalForm";
import { formatMoney } from "@/app/format";
import { calculateTimeToGoal } from "./goalCalculate";
import {
  GoalFrequencyProvider,
  useContributionFrequency,
  fromWeekly,
  frequencyLabel,
  FREQUENCY_OPTIONS,
} from "./goalFrequency";
import LoadTransactionsClient from "@/app/transactions/LoadTransactionsClient";
import { useAppDispatch } from "@/lib/store/hooks";
import { loadTransactionsSuccess } from "@/lib/store/transactionsSlice";
import { Transaction } from "@/app/types";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableGoalCard({
  goal,
  onEdit,
  onDelete,
  isDragOverlay = false,
}: {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: goal.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={isDragOverlay ? undefined : style}>
      <GoalCard
        goal={goal}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
        isDragOverlay={isDragOverlay}
      />
    </div>
  );
}

function FrequencyToggle() {
  const { frequency, setFrequency } = useContributionFrequency();
  return (
    <div className="inline-flex rounded-lg border border-gray-700 bg-gray-900 p-0.5">
      {FREQUENCY_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setFrequency(o.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            frequency === o.value
              ? "bg-green-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function GoalQuestions() {
  return (
    <GoalFrequencyProvider>
      <GoalsContent />
    </GoalFrequencyProvider>
  );
}

function GoalsContent() {
  const dispatch = useAppDispatch();
  const { frequency } = useContributionFrequency();
  const { goals, loaded, addGoal, updateGoal, removeGoal, reorderGoals } = useGoals();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const goal = goals.find((g) => g.id === event.active.id);
    setActiveGoal(goal ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveGoal(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = goals.findIndex((g) => g.id === active.id);
    const newIndex = goals.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    reorderGoals(arrayMove(goals, oldIndex, newIndex));
  }

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

  // Summary stats — commitment only counts goals still in progress
  const totalWeekly = goals
    .filter((g) => g.currentSavings < g.targetAmount)
    .reduce((sum, g) => sum + g.weeklyContribution, 0);

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
        <div className="mt-8 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Goals</h1>
            <p className="mt-1 text-sm text-gray-400">
              Plan and track your financial goals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <FrequencyToggle />
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
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                {frequencyLabel(frequency)} commitment
              </p>
              <p className="mt-1 text-2xl font-bold">
                {formatMoney(fromWeekly(totalWeekly, frequency))}
              </p>
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={goals.map((g) => g.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {goals.map((goal) => (
                      <SortableGoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={removeGoal}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeGoal ? (
                    <SortableGoalCard
                      goal={activeGoal}
                      onEdit={handleEdit}
                      onDelete={removeGoal}
                      isDragOverlay
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </>
        )}
      </div>
    </div>
  );
}
