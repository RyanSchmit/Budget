"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Transaction } from "../types";
import { categorizeNAWithTFIDF } from "./strategies/tfidf";

// Convert date to ISO "YYYY-MM-DD". Handles both "MM-DD-YYYY" and "YYYY-MM-DD".
function convertDateToISO(dateStr: string): string {
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) return dateStr;
  const [a, b, c] = parts;
  const isISO = a.length === 4 && /^\d{4}$/.test(a);
  if (isISO) return `${a}-${b!.padStart(2, "0")}-${c!.padStart(2, "0")}`;
  const [month, day, year] = parts;
  return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
}

// Convert date from ISO "YYYY-MM-DD" (or "YYYY-MM-DDTHH:mm:...") to "MM-DD-YYYY"
function convertDateFromISO(val: string | unknown): string {
  let dateStr: string;
  if (typeof val === "string") dateStr = val.slice(0, 10);
  else if (val instanceof Date) dateStr = val.toISOString().slice(0, 10);
  else dateStr = "";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${month}-${day}-${year}`;
}

const PAGE_SIZE = 1000; // Supabase/PostgREST often cap at 1000 per request

export async function fetchTransactions(): Promise<Transaction[]> {
  try {
    const supabase = createAdminClient();
    const userId = getUserId();
    const allRows: Record<string, unknown>[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const from = offset;
      const to = offset + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .order("transact_id", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }

      const page = data ?? [];
      allRows.push(...page);
      hasMore = page.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    // Convert dates from ISO to MM-DD-YYYY format and map transact_id to id.
    // De-duplicate by id (first occurrence wins) to avoid React key conflicts.
    const seenIds = new Set<string>();
    return allRows
      .map((t) => ({
        id: String(t.transact_id),
        date: convertDateFromISO(t.date),
        description: String(t.description ?? ""),
        category: String(t.category ?? ""),
        amount: Number(t.amount),
      }))
      .filter((t) => {
        if (seenIds.has(t.id)) return false;
        seenIds.add(t.id);
        return true;
      });
  } catch (error) {
    console.error("Error in fetchTransactions:", error);
    return [];
  }
}

// True if id is from DB (transact_id), false if new (e.g. UUID from CSV).
function isFromDb(id: string): boolean {
  return /^\d+$/.test(String(id).trim());
}

function getUserId(): number {
  const raw = process.env.DEFAULT_USER_ID;
  if (!raw)
    throw new Error(
      "DEFAULT_USER_ID is not set. Add it to .env.local for the transactions user_id."
    );
  const n = parseInt(raw, 10);
  if (Number.isNaN(n))
    throw new Error("DEFAULT_USER_ID must be a valid integer.");
  return n;
}

/** Generate a unique bigint for transact_id when the DB has no default. */
function generateTransactId(index: number): number {
  return Date.now() * 1000 + index;
}

export async function insertTransactions(
  transactions: Transaction[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const userId = getUserId();

    // Only insert new rows (e.g. from CSV). DB rows have numeric id (transact_id).
    const newOnes = transactions.filter((t) => !isFromDb(t.id));
    if (newOnes.length === 0) return { success: true };

    const rows = newOnes.map((t, i) => ({
      transact_id: generateTransactId(i),
      user_id: userId,
      date: convertDateToISO(t.date),
      description: String(t.description ?? "").trim() || "(no description)",
      category: String(t.category ?? "N/A").trim() || "N/A",
      amount: Math.round(Number(t.amount)),
    }));

    const { error } = await supabase.from("transactions").insert(rows);

    if (error) {
      console.error("Error inserting transactions:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error("Error in insertTransactions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isFromDb(id)) return { success: true }; // New rows not in DB yet

    const supabase = createAdminClient();
    const dbUpdates: Record<string, unknown> = {};
    if (updates.date) dbUpdates.date = convertDateToISO(updates.date);
    if (updates.description !== undefined)
      dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.amount !== undefined)
      dbUpdates.amount = Math.round(Number(updates.amount));
    if (Object.keys(dbUpdates).length === 0) return { success: true };

    const { error } = await supabase
      .from("transactions")
      .update(dbUpdates)
      .eq("transact_id", parseInt(id, 10));

    if (error) {
      console.error("Error updating transaction:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error("Error in updateTransaction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/** Run TF-IDF prediction on uncategorized transactions (server-side). */
export async function predictCategoriesWithTFIDF(
  transactions: Transaction[]
): Promise<Transaction[]> {
  return categorizeNAWithTFIDF(transactions);
}

export async function deleteTransactions(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbIds = ids.filter((id) => isFromDb(id));
    if (dbIds.length === 0) return { success: true };

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("transactions")
      .delete()
      .in(
        "transact_id",
        dbIds.map((id) => parseInt(id, 10))
      );

    if (error) {
      console.error("Error deleting transactions:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error("Error in deleteTransactions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
