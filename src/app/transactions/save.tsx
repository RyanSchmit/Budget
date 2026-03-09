"use client";

import { Transaction } from "../types";
import { createClient } from "../../lib/supabase/client";
import { useMemo, useState } from "react";

export default function SaveButton({
  transactions,
  onSaved,
}: {
  transactions: Transaction[];
  onSaved?: (saved: Transaction[]) => void;
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const buttonLabel = useMemo(() => {
    if (saving) return "Saving...";
    if (!transactions?.length) return "Save";
    return transactions.length === 1 ? "Save 1 change" : `Save ${transactions.length} changes`;
  }, [saving, transactions]);

  const handleSave = async (): Promise<void> => {
    if (!transactions || transactions.length === 0 || saving) return;

    // Get current logged in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("No authenticated user:", userError);
      return;
    }

    // Convert transactions to DB format
    const rows = transactions.map((t) => ({
      transact_id: t.id, // assuming t.id is already a UUID
      user_id: user.id,
      date: t.date, // must be "YYYY-MM-DD"
      description: t.description,
      category: t.category ?? "N/A",
      amount: t.amount,
    }));

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("transactions")
        .upsert(rows, { onConflict: "transact_id" })
        .select();

      if (error) {
        console.error("Upsert error:", error);
        return;
      }

      console.log("Upserted rows:", data);
      onSaved?.(transactions);
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
