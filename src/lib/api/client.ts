import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return session.access_token;
}

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Transactions ──────────────────────────────────────────────

export interface ApiTransaction {
  transact_id: string;
  user_id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  created_at?: string;
  updated_at?: string;
}

export function fetchTransactions(): Promise<ApiTransaction[]> {
  return apiFetch("/api/transactions");
}

export function createTransaction(
  data: Pick<ApiTransaction, "date" | "description" | "category" | "amount">,
): Promise<ApiTransaction> {
  return apiFetch("/api/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTransaction(
  id: string,
  data: Partial<Pick<ApiTransaction, "date" | "description" | "category" | "amount">>,
): Promise<ApiTransaction> {
  return apiFetch(`/api/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteTransaction(id: string): Promise<void> {
  return apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
}

// ── Snapshots ─────────────────────────────────────────────────

export interface ApiSnapshotAccount {
  id?: string;
  snapshot_id?: string;
  account_key: string | null;
  account_name: string;
  amount: number;
  account_type: "asset" | "liability";
  sort_order: number;
}

export interface ApiSnapshot {
  id: string;
  user_id?: string;
  snapshot_date: string;
  accounts?: ApiSnapshotAccount[];
  created_at?: string;
  updated_at?: string;
}

export function fetchSnapshots(): Promise<ApiSnapshot[]> {
  return apiFetch("/api/snapshots");
}

export function fetchSnapshot(id: string): Promise<ApiSnapshot> {
  return apiFetch(`/api/snapshots/${id}`);
}

export function createSnapshot(data: {
  snapshot_date: string;
  accounts: Omit<ApiSnapshotAccount, "id" | "snapshot_id">[];
}): Promise<ApiSnapshot> {
  return apiFetch("/api/snapshots", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSnapshot(
  id: string,
  data: Partial<Pick<ApiSnapshot, "snapshot_date">>,
): Promise<ApiSnapshot> {
  return apiFetch(`/api/snapshots/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteSnapshot(id: string): Promise<void> {
  return apiFetch(`/api/snapshots/${id}`, { method: "DELETE" });
}

// ── Snapshot Accounts ─────────────────────────────────────────

export function fetchSnapshotAccounts(
  snapshotId: string,
): Promise<ApiSnapshotAccount[]> {
  return apiFetch(`/api/snapshots/${snapshotId}/accounts`);
}

export function createSnapshotAccount(
  snapshotId: string,
  data: Omit<ApiSnapshotAccount, "id" | "snapshot_id">,
): Promise<ApiSnapshotAccount> {
  return apiFetch(`/api/snapshots/${snapshotId}/accounts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSnapshotAccount(
  snapshotId: string,
  accountId: string,
  data: Partial<Omit<ApiSnapshotAccount, "id" | "snapshot_id">>,
): Promise<ApiSnapshotAccount> {
  return apiFetch(`/api/snapshots/${snapshotId}/accounts/${accountId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteSnapshotAccount(
  snapshotId: string,
  accountId: string,
): Promise<void> {
  return apiFetch(`/api/snapshots/${snapshotId}/accounts/${accountId}`, {
    method: "DELETE",
  });
}
