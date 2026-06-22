import {
  fetchSnapshots,
  createSnapshot,
  type ApiSnapshot,
  type ApiSnapshotAccount,
} from "../../lib/api/client";
import type { NetWorthHistoryItem } from "../types";

export type NetWorthAccountType = "asset" | "liability";

export type NetWorthAccountLine = {
  key?: "checking" | "credit_card";
  name: string;
  amount: number;
  type: NetWorthAccountType;
  sort_order?: number;
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapApiAccount(a: ApiSnapshotAccount): NetWorthAccountLine {
  return {
    key: (a.account_key as "checking" | "credit_card") ?? undefined,
    name: a.account_name,
    amount: Number(a.amount),
    type: a.account_type,
    sort_order: a.sort_order,
  };
}

export function computeNetWorthFromAccounts(
  accounts: NetWorthAccountLine[],
): number {
  const assets = accounts
    .filter((a) => a.type === "asset")
    .reduce((sum, a) => sum + a.amount, 0);
  const liabilities = accounts
    .filter((a) => a.type === "liability")
    .reduce((sum, a) => sum + a.amount, 0);
  return assets - liabilities;
}

function snapshotToHistoryItem(snapshot: ApiSnapshot): NetWorthHistoryItem {
  const accounts = (snapshot.net_worth_snapshot_accounts ?? []).map(mapApiAccount);
  return {
    date: snapshot.snapshot_date,
    value: computeNetWorthFromAccounts(accounts),
  };
}

export async function fetchAllSavedNetWorthHistory(): Promise<
  NetWorthHistoryItem[]
> {
  const snapshots = await fetchSnapshots();
  if (!snapshots || snapshots.length === 0) return [];

  return snapshots
    .map(snapshotToHistoryItem)
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
}

export async function saveNetWorthSnapshot(params: {
  date?: string;
  accounts: NetWorthAccountLine[];
}): Promise<{ snapshotId: string }> {
  const date = params.date ?? todayISODate();

  const accounts = params.accounts.map((a, idx) => ({
    account_key: a.key ?? null,
    account_name: a.name,
    amount: a.amount,
    account_type: a.type,
    sort_order: a.sort_order ?? idx,
  }));

  const snapshot = await createSnapshot({
    snapshot_date: date,
    accounts,
  });

  return { snapshotId: snapshot.id };
}

export async function fetchLatestNetWorthSnapshot(): Promise<{
  date: string;
  accounts: NetWorthAccountLine[];
} | null> {
  const snapshots = await fetchSnapshots();

  if (!snapshots || snapshots.length === 0) return null;

  const latest = snapshots[0];
  const accounts = (latest.net_worth_snapshot_accounts ?? []).map(mapApiAccount);

  return { date: latest.snapshot_date, accounts };
}
