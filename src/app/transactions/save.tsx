"use client";

import { Transaction } from "../types";
import { createClient } from "../../lib/supabase/client";

export default function SaveButton({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const supabase = createClient();

  const handleSave = async (): Promise<void> => {
    if (!transactions || transactions.length === 0) return;

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

    const { data, error } = await supabase
      .from("transactions")
      .insert(rows)
      .select();

    if (error) {
      console.error("Insert error:", error);
    } else {
      console.log("Inserted rows:", data);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleSave}
        disabled={transactions.length === 0}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save
      </button>
    </div>
  );
}
