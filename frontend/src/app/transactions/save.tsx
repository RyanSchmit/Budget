"use client";

import { Transaction } from "../types";
import {
  updateTransaction,
  bulkCreateTransactions,
} from "../../lib/api/client";
import { useMemo, useState } from "react";

export default function SaveButton({
  transactions,
  baselineById,
  onSaved,
  onCreated,
}: {
  transactions: Transaction[];
  baselineById: Record<string, string>;
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

      // Split into existing (update) vs new (bulk create) based on baseline
      const toUpdate: Transaction[] = [];
      const toCreate: Transaction[] = [];

      for (const t of transactions) {
        if (baselineById[t.id]) {
          toUpdate.push(t);
        } else {
          toCreate.push(t);
        }
      }

      // Update existing transactions in batches
      const UPDATE_BATCH = 20;
      for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
        const batch = toUpdate.slice(i, i + UPDATE_BATCH);
        await Promise.all(
          batch.map((t) =>
            updateTransaction(t.id, {
              date: t.date,
              description: t.description,
              category: t.category ?? "N/A",
              amount: t.amount,
            }),
          ),
        );
      }

      // Bulk-create new transactions in batches of 200
      const BULK_BATCH = 200;
      for (let i = 0; i < toCreate.length; i += BULK_BATCH) {
        const batch = toCreate.slice(i, i + BULK_BATCH);
        const { data: created } = await bulkCreateTransactions(
          batch.map((t) => ({
            date: t.date,
            description: t.description,
            category: t.category ?? "N/A",
            amount: t.amount,
          })),
        );
        created.forEach((record, idx) => {
          onCreated?.(batch[idx].id, {
            id: record.transact_id,
            date: record.date,
            description: record.description,
            category: record.category,
            amount: record.amount,
          });
        });
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
