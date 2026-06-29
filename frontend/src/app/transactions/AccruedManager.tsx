"use client";

import { useState, useEffect, useMemo } from "react";
import { formatMoney } from "../format";
import MoneyInput from "../MoneyInput";

type AccruedItem = { id: string; label: string; amount: number };
type AccruedData = { income: AccruedItem[]; expenses: AccruedItem[] };

const STORAGE_KEY = "accrued-items";

function loadAccrued(): AccruedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { income: [], expenses: [] };
    const parsed = JSON.parse(raw);
    return {
      income: Array.isArray(parsed?.income) ? parsed.income : [],
      expenses: Array.isArray(parsed?.expenses) ? parsed.expenses : [],
    };
  } catch {
    return { income: [], expenses: [] };
  }
}

function newItem(): AccruedItem {
  return { id: crypto.randomUUID(), label: "", amount: 0 };
}

type Kind = "income" | "expenses";

interface AccruedSectionProps {
  title: string;
  items: AccruedItem[];
  onAdd: () => void;
  onClear: () => void;
  onUpdate: (id: string, patch: Partial<AccruedItem>) => void;
  onDelete: (id: string) => void;
}

function AccruedSection({
  title,
  items,
  onAdd,
  onClear,
  onUpdate,
  onDelete,
}: AccruedSectionProps) {
  const subtotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">
          {title}
        </span>
        <button
          onClick={onClear}
          disabled={items.length === 0}
          className="text-xs text-white/40 hover:text-red-400 transition disabled:opacity-30 disabled:hover:text-white/40"
        >
          Clear all
        </button>
      </div>

      {/* Rows */}
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-white/40 text-center">
          No entries yet.
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_180px_36px] gap-4 px-4 py-3 items-center hover:bg-white/5 transition"
            >
              <input
                type="text"
                placeholder="Description"
                value={item.label}
                onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <MoneyInput
                value={item.amount}
                onChange={(v) => onUpdate(item.id, { amount: v ?? 0 })}
              />
              <div className="flex items-center justify-center">
                <button
                  onClick={() => onDelete(item.id)}
                  title="Remove entry"
                  className="text-white/30 hover:text-red-400 transition"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-t border-white/10">
        <button
          onClick={onAdd}
          className="px-4 py-1.5 rounded-md text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition"
        >
          + Add entry
        </button>
        <span className="text-sm font-semibold text-white/70 tabular-nums">
          {formatMoney(subtotal)}
        </span>
      </div>
    </div>
  );
}

export default function AccruedManager() {
  const [data, setData] = useState<AccruedData>(() => loadAccrued());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore persistence failures
    }
  }, [data]);

  const addItem = (kind: Kind) =>
    setData((prev) => ({ ...prev, [kind]: [...prev[kind], newItem()] }));

  const clearItems = (kind: Kind) =>
    setData((prev) => ({ ...prev, [kind]: [] }));

  const updateItem = (kind: Kind, id: string, patch: Partial<AccruedItem>) =>
    setData((prev) => ({
      ...prev,
      [kind]: prev[kind].map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  const deleteItem = (kind: Kind, id: string) =>
    setData((prev) => ({
      ...prev,
      [kind]: prev[kind].filter((i) => i.id !== id),
    }));

  const incomeTotal = useMemo(
    () => data.income.reduce((sum, i) => sum + (i.amount || 0), 0),
    [data.income],
  );
  const expenseTotal = useMemo(
    () => data.expenses.reduce((sum, i) => sum + (i.amount || 0), 0),
    [data.expenses],
  );
  const net = incomeTotal - expenseTotal;

  return (
    <div className="w-full space-y-4">
      <AccruedSection
        title="Accrued Income"
        items={data.income}
        onAdd={() => addItem("income")}
        onClear={() => clearItems("income")}
        onUpdate={(id, patch) => updateItem("income", id, patch)}
        onDelete={(id) => deleteItem("income", id)}
      />

      <AccruedSection
        title="Accrued Expenses"
        items={data.expenses}
        onAdd={() => addItem("expenses")}
        onClear={() => clearItems("expenses")}
        onUpdate={(id, patch) => updateItem("expenses", id, patch)}
        onDelete={(id) => deleteItem("expenses", id)}
      />

      {/* Net summary */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-white/5">
          <span className="text-sm font-semibold text-white/70">
            Net Accrued
          </span>
          <span className="text-right text-sm text-white/50 tabular-nums">
            {formatMoney(incomeTotal)} − {formatMoney(expenseTotal)}
          </span>
          <span
            className={`text-right text-sm font-semibold tabular-nums ${
              net >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {formatMoney(net)}
          </span>
        </div>
      </div>
    </div>
  );
}
