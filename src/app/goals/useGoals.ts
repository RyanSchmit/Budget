"use client";

import { useState, useEffect } from "react";
import { Goal } from "./goalTypes";

const STORAGE_KEY = "wealthpath_goals";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setGoals(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  function persist(updated: Goal[]) {
    setGoals(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }

  function addGoal(goal: Goal) {
    persist([...goals, goal]);
  }

  function updateGoal(goal: Goal) {
    persist(goals.map((g) => (g.id === goal.id ? goal : g)));
  }

  function removeGoal(id: string) {
    persist(goals.filter((g) => g.id !== id));
  }

  return { goals, loaded, addGoal, updateGoal, removeGoal };
}
