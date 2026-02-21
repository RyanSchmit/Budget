"use client";

import { createClient } from "../../lib/supabase/client";
import { Transaction } from "../types";

type DbTransaction = {
  transact_id: string;
  user_id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  created_at?: string;
  updated_at?: string;
};

export async function loadTransactions(): Promise<Transaction[]> {
  const supabase = createClient();

  // 1) Get user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("No authenticated user:", userError);
    return [];
  }

  // 2) Fetch all rows (pagination)
  const pageSize = 1000;
  let from = 0;
  let allRows: DbTransaction[] = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("transactions")
      .select(
        "transact_id,user_id,date,description,category,amount,created_at,updated_at",
      )
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Fetch error:", error);
      return [];
    }

    const rows = (data ?? []) as DbTransaction[];
    allRows = allRows.concat(rows);

    if (rows.length < pageSize) break;

    from += pageSize;
  }

  // 3) Map to app type
  return allRows.map((r) => ({
    id: r.transact_id,
    date: r.date,
    description: r.description,
    category: r.category,
    amount: Number(r.amount),
  }));
}