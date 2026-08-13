"use client";

import { useState } from "react";
import { Transaction } from "../types";
import MoneyInput from "../MoneyInput";
import { normalizeDate } from "./csv";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
  addTransaction,
  setCategoriesList,
} from "../../lib/store/transactionsSlice";
import {
  selectMergedCategories,
  selectCategoriesList,
} from "../../lib/store/selectors";

const NEW_CATEGORY = "__NEW__";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ManualEntryForm() {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectMergedCategories);
  const categoriesList = useAppSelector(selectCategoriesList);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("N/A");
  const [newCategory, setNewCategory] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDate(today());
    setDescription("");
    setCategory("N/A");
    setNewCategory("");
    setAmount(null);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setError("Description is required.");
      return;
    }
    if (amount == null || Number.isNaN(amount)) {
      setError("Amount is required.");
      return;
    }

    const normalizedDate = normalizeDate(date.trim());
    if (!normalizedDate || Number.isNaN(new Date(normalizedDate).getTime())) {
      setError("Enter a valid date.");
      return;
    }

    let finalCategory = category;
    if (category === NEW_CATEGORY) {
      const value = newCategory.trim();
      if (!value) {
        setError("Enter a name for the new category.");
        return;
      }
      const exists = categoriesList.some(
        (c) => c.toLowerCase() === value.toLowerCase(),
      );
      if (!exists) {
        dispatch(setCategoriesList([...categoriesList, value].sort()));
      }
      finalCategory = value;
    }

    const tx: Transaction = {
      id: crypto.randomUUID(),
      date: normalizedDate,
      description: trimmedDesc,
      category: finalCategory || "N/A",
      amount,
    };

    dispatch(addTransaction(tx));
    reset();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
      >
        + Add transaction
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-gray-800 bg-gray-900/40 p-4"
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 bg-black border border-gray-700 rounded-md px-3 text-sm text-white"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1 min-w-48">
          <label className="text-xs text-gray-400">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Coffee shop"
            className="h-10 w-full bg-black border border-gray-700 rounded-md px-3 text-sm text-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Category</label>
          {category === NEW_CATEGORY ? (
            <input
              type="text"
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category"
              className="h-10 bg-black border border-gray-700 rounded-md px-3 text-sm text-white"
            />
          ) : (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 bg-black border border-gray-700 rounded-md px-3 text-sm text-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value={NEW_CATEGORY}>+ Add new…</option>
            </select>
          )}
        </div>

        <div className="flex w-32 flex-col gap-1">
          <label className="text-xs text-gray-400">Amount</label>
          <MoneyInput
            value={amount}
            onChange={setAmount}
            placeholder="$0.00"
            className="text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="h-10 rounded-md bg-blue-600 px-4 text-sm font-medium hover:bg-blue-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="h-10 rounded-md bg-white/10 px-4 text-sm font-medium hover:bg-white/20"
          >
            Cancel
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <p className="mt-3 text-xs text-gray-500">
        Use a negative amount for expenses and a positive amount for income. New
        entries are highlighted until you Save.
      </p>
    </form>
  );
}
