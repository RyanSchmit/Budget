import { getAccessToken } from "@/lib/api/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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

export interface TransactionsPage {
  data: ApiTransaction[];
  count: number;
}

export function fetchTransactions(
  page = 0,
  limit = 1000,
): Promise<TransactionsPage> {
  return apiFetch(`/api/transactions?page=${page}&limit=${limit}`);
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

// ── Goals ─────────────────────────────────────────────────────

export interface ApiGoal {
  id: string;
  type: string;
  name: string;
  targetAmount: number;
  currentSavings: number;
  weeklyContribution: number;
  annualRate: number;
  timeline: string;
  durationYears?: number;
  emergencyMonths?: number;
  currentAge?: number;
  retirementAge?: number;
  desiredAnnualIncome?: number;
  homePrice?: number;
  debtInterestRate?: number;
  createdAt: string;
}

export function fetchGoals(): Promise<ApiGoal[]> {
  return apiFetch("/api/goals");
}

export function createGoal(
  data: Omit<ApiGoal, "id" | "createdAt">,
): Promise<ApiGoal> {
  return apiFetch("/api/goals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateGoal(id: string, data: Omit<ApiGoal, "id" | "createdAt">): Promise<ApiGoal> {
  return apiFetch(`/api/goals/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteGoal(id: string): Promise<void> {
  return apiFetch(`/api/goals/${id}`, { method: "DELETE" });
}

// ── Category Limits ───────────────────────────────────────────

export interface ApiCategoryLimit {
  id: string;
  categoryName: string;
  monthlyLimit: number;
  createdAt: string;
  updatedAt: string;
}

export function fetchCategoryLimits(): Promise<ApiCategoryLimit[]> {
  return apiFetch("/api/category-limits");
}

export function createCategoryLimit(data: {
  categoryName: string;
  monthlyLimit: number;
}): Promise<ApiCategoryLimit> {
  return apiFetch("/api/category-limits", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCategoryLimit(
  id: string,
  data: { monthlyLimit: number },
): Promise<ApiCategoryLimit> {
  return apiFetch(`/api/category-limits/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteCategoryLimit(id: string): Promise<void> {
  return apiFetch(`/api/category-limits/${id}`, { method: "DELETE" });
}

// ── Advisor ───────────────────────────────────────────────────

export interface AdvisorConversation {
  id: string;
  user_id: string;
  title: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
  advisor_conversation_context?: { snapshot_id: string }[];
}

export interface AdvisorMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown> | null;
  tokens_used?: number | null;
  created_at: string;
}

export function listAdvisorConversations(): Promise<{
  conversations: AdvisorConversation[];
}> {
  return apiFetch("/api/advisor/conversations");
}

export function createAdvisorConversation(data?: {
  title?: string;
  snapshot_id?: string;
}): Promise<{ conversation: AdvisorConversation }> {
  return apiFetch("/api/advisor/conversations", {
    method: "POST",
    body: JSON.stringify(data ?? {}),
  });
}

export function getAdvisorConversation(
  id: string,
): Promise<{ conversation: AdvisorConversation }> {
  return apiFetch(`/api/advisor/conversations/${id}`);
}

export function updateAdvisorConversation(
  id: string,
  data: { title?: string; status?: "active" | "archived" },
): Promise<{ conversation: AdvisorConversation }> {
  return apiFetch(`/api/advisor/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAdvisorConversation(id: string): Promise<void> {
  return apiFetch(`/api/advisor/conversations/${id}`, { method: "DELETE" });
}

export function getAdvisorMessages(
  conversationId: string,
  options?: { limit?: number; before?: string },
): Promise<{ messages: AdvisorMessage[]; next_cursor: string | null }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.before) params.set("before", options.before);
  const qs = params.toString();
  return apiFetch(
    `/api/advisor/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`,
  );
}

export function sendAdvisorMessage(
  conversationId: string,
  content: string,
): Promise<{ user_message: AdvisorMessage; assistant_message: AdvisorMessage }> {
  return apiFetch(`/api/advisor/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
