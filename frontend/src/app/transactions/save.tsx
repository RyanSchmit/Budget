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
  onCreated,
}: {
  transactions: Transaction[];
  onSaved?: (saved: Transaction[]) => void;
  onCreated?: (oldId: string, newTransaction: Transaction) => void;
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

      const BATCH_SIZE = 20;
      for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const batch = transactions.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (t) => {
            const body = {
              date: t.date,
              description: t.description,
              category: t.category ?? "N/A",
              amount: t.amount,
            };

            try {
              await updateTransaction(t.id, body);
            } catch (err) {
              if (err instanceof Error && err.message.startsWith("API 404")) {
                const created = await createTransaction(body);
                onCreated?.(t.id, {
                  id: created.transact_id,
                  date: created.date,
                  description: created.description,
                  category: created.category,
                  amount: created.amount,
                });
              } else {
                throw err;
              }
            }
          }),
        );
      }

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
