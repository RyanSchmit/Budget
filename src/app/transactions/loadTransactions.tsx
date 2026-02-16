"use client";

import { useEffect, useRef } from "react";
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

export default function LoadTransactions({
  onLoaded,
}: {
  onLoaded: (transactions: Transaction[]) => void;
}) {
  const supabase = createClient();

  // Avoid re-running the effect if parent recreates onLoaded
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancelled = false;

    const loadAllTransactions = async () => {
      try {
        // 1) Get logged-in user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("No authenticated user:", userError);
          return;
        }

        // 2) Fetch ALL rows using pagination
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
            return;
          }

          const rows = (data ?? []) as DbTransaction[];
          allRows = allRows.concat(rows);

          // If we received fewer than pageSize, we're done
          if (rows.length < pageSize) break;

          from += pageSize;

          // Optional: safety guard if something goes wrong and it keeps looping
          // if (from > 1_000_000) break;
        }

        if (cancelled) return;

        // 3) Map DB rows to your app Transaction type
        const mapped: Transaction[] = allRows.map((r) => ({
          id: r.transact_id,
          date: r.date,
          description: r.description,
          category: r.category,
          amount: Number(r.amount),
        }));

        onLoadedRef.current(mapped);
      } catch (err) {
        console.error("Unexpected load error:", err);
      }
    };

    loadAllTransactions();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return null;
}
