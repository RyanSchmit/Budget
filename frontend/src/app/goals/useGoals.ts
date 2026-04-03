"use client";

import { useState, useEffect } from "react";
import { Goal } from "./goalTypes";
import {
  fetchGoals,
  createGoal,
  updateGoal as apiUpdateGoal,
  deleteGoal,
} from "@/lib/api/client";

function goalToApiPayload(goal: Goal): Omit<import("@/lib/api/client").ApiGoal, "id" | "createdAt"> {
  return {
    type: goal.type,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentSavings: goal.currentSavings,
    weeklyContribution: goal.weeklyContribution,
    annualRate: goal.annualRate,
    timeline: goal.timeline,
    durationYears: goal.durationYears,
    emergencyMonths: goal.emergencyMonths,
    currentAge: goal.currentAge,
    retirementAge: goal.retirementAge,
    desiredAnnualIncome: goal.desiredAnnualIncome,
    homePrice: goal.homePrice,
    debtInterestRate: goal.debtInterestRate,
  };
}

function apiGoalToGoal(api: import("@/lib/api/client").ApiGoal): Goal {
  return {
    id: api.id,
    type: api.type as Goal["type"],
    name: api.name,
    targetAmount: api.targetAmount,
    currentSavings: api.currentSavings,
    weeklyContribution: api.weeklyContribution,
    annualRate: api.annualRate,
    timeline: api.timeline as Goal["timeline"],
    durationYears: api.durationYears,
    emergencyMonths: api.emergencyMonths,
    currentAge: api.currentAge,
    retirementAge: api.retirementAge,
    desiredAnnualIncome: api.desiredAnnualIncome,
    homePrice: api.homePrice,
    debtInterestRate: api.debtInterestRate,
    createdAt: api.createdAt,
  };
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchGoals()
      .then((data) => setGoals(data.map(apiGoalToGoal)))
      .catch(() => {
        // silently fail — goals will just be empty
      })
      .finally(() => setLoaded(true));
  }, []);

  function addGoal(goal: Goal) {
    // Optimistic: add immediately with the client-generated temp id
    setGoals((prev) => [...prev, goal]);

    createGoal(goalToApiPayload(goal))
      .then((serverGoal) => {
        // Replace the optimistic entry with the server-returned goal (real UUID)
        setGoals((prev) =>
          prev.map((g) => (g.id === goal.id ? apiGoalToGoal(serverGoal) : g)),
        );
      })
      .catch(() => {
        // Revert optimistic add on failure
        setGoals((prev) => prev.filter((g) => g.id !== goal.id));
      });
  }

  function updateGoal(goal: Goal) {
    // Optimistic: update immediately
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));

    apiUpdateGoal(goal.id, goalToApiPayload(goal))
      .then((serverGoal) => {
        setGoals((prev) =>
          prev.map((g) => (g.id === goal.id ? apiGoalToGoal(serverGoal) : g)),
        );
      })
      .catch(() => {
        // Revert on failure by re-fetching
        fetchGoals()
          .then((data) => setGoals(data.map(apiGoalToGoal)))
          .catch(() => {});
      });
  }

  function removeGoal(id: string) {
    // Optimistic: remove immediately
    setGoals((prev) => prev.filter((g) => g.id !== id));

    deleteGoal(id).catch(() => {
      // Revert on failure by re-fetching
      fetchGoals()
        .then((data) => setGoals(data.map(apiGoalToGoal)))
        .catch(() => {});
    });
  }

  return { goals, loaded, addGoal, updateGoal, removeGoal };
}
