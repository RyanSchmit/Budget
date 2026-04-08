"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Transaction } from "../types";
import { formatMoney } from "../format";
import { defaultCategories } from "../transactions/categories";
import {
  ApiCategoryLimit,
  fetchCategoryLimits,
  createCategoryLimit,
  updateCategoryLimit,
  deleteCategoryLimit,
} from "@/lib/api/client";

interface CategoryBudgetManagerProps {
  transactions: Transaction[];
}

type SavedLimits = Record<string, { id: string; monthlyLimit: number }>;

const TRACKED_CATEGORIES = defaultCategories.filter(
  (c) => c !== "Income" && c !== "N/A",
);

const HIDDEN_KEY = "budget-hidden-categories";

function loadHiddenCategories(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveHiddenCategories(hidden: Set<string>) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
}

function getMonthlySpending(
  transactions: Transaction[],
  category: string,
): Record<string, number> {
  const byMonth: Record<string, number> = {};
  for (const t of transactions) {
    if (t.category !== category) continue;
    const [year, month] = t.date.split("-");
    const key = `${year}-${month}`;
    byMonth[key] = (byMonth[key] ?? 0) + Math.abs(t.amount);
  }
  return byMonth;
}

function formatMonthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("default", { month: "short", year: "numeric" });
}

export default function CategoryBudgetManager({
  transactions,
}: CategoryBudgetManagerProps) {
  const [savedLimits, setSavedLimits] = useState<SavedLimits>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    () => loadHiddenCategories(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const expenseTransactions = useMemo(
    () => transactions.filter((t) => t.category !== "Income"),
    [transactions],
  );

  const visibleCategories = useMemo(
    () => TRACKED_CATEGORIES.filter((c) => !hiddenCategories.has(c)),
    [hiddenCategories],
  );

  const categoryStats = useMemo(() => {
    const stats: Record<string, { min: number; avg: number; max: number } | null> = {};
    for (const category of TRACKED_CATEGORIES) {
      const byMonth = getMonthlySpending(expenseTransactions, category);
      const values = Object.values(byMonth);
      if (values.length === 0) {
        stats[category] = null;
      } else {
        stats[category] = {
          min: Math.min(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          max: Math.max(...values),
        };
      }
    }
    return stats;
  }, [expenseTransactions]);

  const overallStats = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const category of visibleCategories) {
      const byMonth = getMonthlySpending(expenseTransactions, category);
      for (const [month, amount] of Object.entries(byMonth)) {
        totals[month] = (totals[month] ?? 0) + amount;
      }
    }
    const values = Object.values(totals);
    if (values.length === 0) return null;
    return {
      min: Math.min(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      max: Math.max(...values),
    };
  }, [expenseTransactions, visibleCategories]);

  const overallLimit = useMemo(
    () =>
      visibleCategories.reduce(
        (sum, c) => sum + (savedLimits[c]?.monthlyLimit ?? 0),
        0,
      ),
    [visibleCategories, savedLimits],
  );

  const loadLimits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const limits: ApiCategoryLimit[] = await fetchCategoryLimits();
      const map: SavedLimits = {};
      const inputs: Record<string, string> = {};
      for (const l of limits) {
        map[l.categoryName] = { id: l.id, monthlyLimit: l.monthlyLimit };
        inputs[l.categoryName] = String(l.monthlyLimit);
      }
      setSavedLimits(map);
      setInputValues(inputs);
    } catch {
      setError("Failed to load budget limits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLimits();
  }, [loadLimits]);

  const handleSave = async (category: string) => {
    const raw = inputValues[category] ?? "";
    const value = parseFloat(raw);
    if (isNaN(value) || value < 0) return;

    setSaving(category);
    try {
      const existing = savedLimits[category];
      if (existing) {
        const updated = await updateCategoryLimit(existing.id, {
          monthlyLimit: value,
        });
        setSavedLimits((prev) => ({
          ...prev,
          [category]: { id: updated.id, monthlyLimit: updated.monthlyLimit },
        }));
      } else {
        const created = await createCategoryLimit({
          categoryName: category,
          monthlyLimit: value,
        });
        setSavedLimits((prev) => ({
          ...prev,
          [category]: { id: created.id, monthlyLimit: created.monthlyLimit },
        }));
      }
    } catch {
      setError(`Failed to save limit for ${category}.`);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (category: string) => {
    const existing = savedLimits[category];
    if (!existing) {
      setHiddenCategories((prev) => {
        const next = new Set(prev);
        next.add(category);
        saveHiddenCategories(next);
        return next;
      });
      return;
    }
    setDeleting(category);
    try {
      await deleteCategoryLimit(existing.id);
      setSavedLimits((prev) => {
        const next = { ...prev };
        delete next[category];
        return next;
      });
      setInputValues((prev) => {
        const next = { ...prev };
        delete next[category];
        return next;
      });
      setHiddenCategories((prev) => {
        const next = new Set(prev);
        next.add(category);
        saveHiddenCategories(next);
        return next;
      });
    } catch {
      setError(`Failed to delete limit for ${category}.`);
    } finally {
      setDeleting(null);
    }
  };

  const handleRestore = (category: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      next.delete(category);
      saveHiddenCategories(next);
      return next;
    });
  };

  const toggleExpand = (category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading budget limits...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-500/40 px-4 py-3 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_72px_72px_72px_160px_120px_36px] gap-4 px-4 py-3 bg-white/5 border-b border-white/10 text-xs font-medium text-white/50 uppercase tracking-wider">
          <span>Category</span>
          <span className="text-right">Min</span>
          <span className="text-right">Avg</span>
          <span className="text-right">Max</span>
          <span>Monthly Limit ($)</span>
          <span></span>
          <span></span>
        </div>

        {/* Rows */}
        {visibleCategories.map((category) => {
          const saved = savedLimits[category];
          const inputVal = inputValues[category] ?? "";
          const isSaving = saving === category;
          const isExpanded = expandedCategory === category;
          const monthlySpending = isExpanded
            ? getMonthlySpending(expenseTransactions, category)
            : null;
          const sortedMonths = monthlySpending
            ? Object.keys(monthlySpending).sort().reverse()
            : [];

          const isDirty =
            inputVal !== "" &&
            (!saved || parseFloat(inputVal) !== saved.monthlyLimit);

          const stats = categoryStats[category];

          return (
            <div key={category} className="border-b border-white/5 last:border-b-0">
              {/* Main row */}
              <div className="grid grid-cols-[1fr_72px_72px_72px_160px_120px_36px] gap-4 px-4 py-3 items-center hover:bg-white/5 transition">
                {/* Category name */}
                <button
                  onClick={() => toggleExpand(category)}
                  className="flex items-center gap-2 text-left text-white hover:text-white/80 transition"
                >
                  <span
                    className={`text-white/40 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  >
                    ▶
                  </span>
                  <span className="font-medium">{category}</span>
                  {saved && (
                    <span className="ml-2 text-xs text-white/30">
                      {formatMoney(saved.monthlyLimit)}/mo
                    </span>
                  )}
                </button>

                {/* Stats */}
                {(["min", "avg", "max"] as const).map((key) => (
                  <span key={key} className="text-right tabular-nums text-sm text-white/50">
                    {stats ? formatMoney(stats[key]) : <span className="text-white/20">—</span>}
                  </span>
                ))}

                {/* Input */}
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="No limit set"
                  value={inputVal}
                  onChange={(e) =>
                    setInputValues((prev) => ({
                      ...prev,
                      [category]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSave(category)}
                  className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />

                {/* Save button */}
                <button
                  onClick={() => handleSave(category)}
                  disabled={isSaving || !inputVal}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                    isSaving
                      ? "bg-white/10 text-white/40 cursor-not-allowed"
                      : isDirty
                        ? "bg-red-600 hover:bg-red-500 text-white"
                        : saved
                          ? "bg-white/10 hover:bg-white/20 text-white/60"
                          : "bg-white/10 text-white/30 cursor-not-allowed"
                  }`}
                >
                  {isSaving ? "Saving…" : saved && !isDirty ? "Saved" : "Save"}
                </button>

                {/* Delete button */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(category)}
                    disabled={deleting === category}
                    title="Remove category"
                    className="text-white/30 hover:text-red-400 transition disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Expanded monthly breakdown */}
              {isExpanded && (
                <div className="bg-white/3 border-t border-white/5 px-4 py-3">
                  {sortedMonths.length === 0 ? (
                    <p className="text-sm text-white/40 py-2">
                      No transactions for this category.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/40 text-xs uppercase tracking-wider">
                          <th className="text-left pb-2 font-medium">Month</th>
                          <th className="text-right pb-2 font-medium">Spent</th>
                          <th className="text-right pb-2 font-medium">Limit</th>
                          <th className="text-right pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sortedMonths.map((month) => {
                          const spent = monthlySpending![month];
                          const limit = saved?.monthlyLimit;
                          const isOver =
                            limit !== undefined && spent > limit;
                          const isUnder =
                            limit !== undefined && spent <= limit;

                          return (
                            <tr key={month}>
                              <td className="py-2 text-white/70">
                                {formatMonthLabel(month)}
                              </td>
                              <td className="py-2 text-right tabular-nums text-white/80">
                                {formatMoney(spent)}
                              </td>
                              <td className="py-2 text-right tabular-nums text-white/50">
                                {limit !== undefined
                                  ? formatMoney(limit)
                                  : "—"}
                              </td>
                              <td className="py-2 text-right">
                                {isOver && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 text-xs font-medium">
                                    Over {formatMoney(spent - limit!)}
                                  </span>
                                )}
                                {isUnder && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 text-xs font-medium">
                                    Under {formatMoney(limit! - spent)}
                                  </span>
                                )}
                                {!isOver && !isUnder && (
                                  <span className="text-white/30 text-xs">
                                    No limit
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Overall row */}
        <div className="grid grid-cols-[1fr_72px_72px_72px_160px_120px_36px] gap-4 px-4 py-3 items-center bg-white/5 border-t border-white/10">
          <span className="text-sm font-semibold text-white/70">Overall</span>
          {(["min", "avg", "max"] as const).map((key) => (
            <span key={key} className="text-right tabular-nums text-sm font-semibold text-white/70">
              {overallStats ? formatMoney(overallStats[key]) : <span className="text-white/20">—</span>}
            </span>
          ))}
          <span className="text-sm tabular-nums text-white/50">
            {overallLimit > 0 ? formatMoney(overallLimit) + "/mo" : <span className="text-white/20">—</span>}
          </span>
          <span />
          <span />
        </div>
      </div>

      {hiddenCategories.size > 0 && (
        <div className="mt-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
            Hidden categories
          </p>
          <div className="flex flex-wrap gap-2">
            {[...hiddenCategories].map((category) => (
              <button
                key={category}
                onClick={() => handleRestore(category)}
                className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/30 transition"
              >
                + {category}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
