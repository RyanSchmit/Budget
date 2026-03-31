"use client";

import { Transaction } from "../types";
import {
  updateTransaction,
  createTransaction,
} from "../../lib/api/client";
import { useMemo, useState } from "react";

export default function SaveButton({
  transactions,
  onSaved,
}: {
  transactions: Transaction[];
  onSaved?: (saved: Transaction[]) => void;
}) {
  const [saving, setSaving] = useState(false);

  const buttonLabel = useMemo(() => {
    if (saving) return "Saving...";
    if (!transactions?.length) return "Save";
    return transactions.length === 1 ? "Save 1 change" : `Save ${transactions.length} changes`;
  }, [saving, transactions]);

  const handleSave = async (): Promise<void> => {
    if (!transactions || transactions.length === 0 || saving) return;

    try {
      setSaving(true);

      await Promise.all(
        transactions.map(async (t) => {
          const body = {
            date: t.date,
            description: t.description,
            category: t.category ?? "N/A",
            amount: t.amount,
          };

          try {
            await updateTransaction(t.id, body);
          } catch {
            await createTransaction(body);
          }
        }),
      );

      onSaved?.(transactions);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleSave}
        disabled={transactions.length === 0 || saving}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
