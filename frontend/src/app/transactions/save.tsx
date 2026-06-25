"use client";

import { Transaction } from "../types";
import {
  bulkUpdateTransactions,
  bulkCreateTransactions,
} from "../../lib/api/client";
import { useMemo, useState } from "react";

function keyOf(t: { date: string; description: string; amount: number }) {
  return `${t.date}|${t.description.trim()}|${Number(t.amount)}`;
}

export default function SaveButton({
  transactions,
  baselineById,
  onSaved,
  onCreated,
  onSkipped,
}: {
  transactions: Transaction[];
  baselineById: Record<string, string>;
  onSaved?: (saved: Transaction[]) => void;
  onCreated?: (oldId: string, newTransaction: Transaction) => void;
  onSkipped?: (oldId: string) => void;
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

      // Bulk-update existing transactions in batches of 200
      const UPDATE_BATCH = 200;
      for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
        const batch = toUpdate.slice(i, i + UPDATE_BATCH);
        await bulkUpdateTransactions(
          batch.map((t) => ({
            id: t.id,
            date: t.date,
            description: t.description,
            category: t.category ?? "N/A",
            amount: t.amount,
          })),
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

        // The backend silently skips duplicates, so it may return fewer rows
        // than we sent. Match returned rows back to their temp batch item by
        // key, then treat any unmatched temp row as a skipped duplicate.
        const createdByKey = new Map(
          created.map((record) => [keyOf(record), record] as const),
        );
        for (const t of batch) {
          const record = createdByKey.get(keyOf(t));
          if (record) {
            createdByKey.delete(keyOf(t));
            onCreated?.(t.id, {
              id: record.transact_id,
              date: record.date,
              description: record.description,
              category: record.category,
              amount: record.amount,
            });
          } else {
            onSkipped?.(t.id);
          }
        }
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
