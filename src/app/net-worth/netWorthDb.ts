import { createClient } from "../../lib/supabase/client";

export type NetWorthAccountType = "asset" | "liability";

export type NetWorthAccountLine = {
  key?: "checking" | "credit_card";
  name: string;
  amount: number;
  type: NetWorthAccountType;
  sort_order?: number;
};

type DbSnapshot = {
  id: string;
  snapshot_date: string; // YYYY-MM-DD
};

type DbAccountLine = {
  account_key: "checking" | "credit_card" | null;
  account_name: string;
  amount: string | number;
  account_type: NetWorthAccountType;
  sort_order: number;
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function saveNetWorthSnapshot(params: {
  date?: string; // YYYY-MM-DD
  accounts: NetWorthAccountLine[];
}): Promise<{ snapshotId: string }> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message || "No authenticated user");
  }

  const date = params.date ?? todayISODate();

  const payload = params.accounts.map((a, idx) => ({
    key: a.key ?? null,
    name: a.name,
    amount: a.amount,
    type: a.type,
    sort_order: a.sort_order ?? idx,
  }));

  const { data, error } = await supabase.rpc("save_net_worth_snapshot", {
    p_snapshot_date: date,
    p_accounts: payload,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("No snapshot id returned");

  return { snapshotId: data as string };
}

export async function fetchLatestNetWorthSnapshot(): Promise<{
  date: string;
  accounts: NetWorthAccountLine[];
} | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: snapshot, error: snapshotError } = await supabase
    .from("net_worth_snapshots")
    .select("id,snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotError) throw new Error(snapshotError.message);
  if (!snapshot) return null;

  const s = snapshot as DbSnapshot;

  const { data: lines, error: linesError } = await supabase
    .from("net_worth_snapshot_accounts")
    .select("account_key,account_name,amount,account_type,sort_order")
    .eq("snapshot_id", s.id)
    .order("sort_order", { ascending: true });

  if (linesError) throw new Error(linesError.message);

  const accounts: NetWorthAccountLine[] = (lines ?? []).map((l) => {
    const line = l as DbAccountLine;
    return {
      key: line.account_key ?? undefined,
      name: line.account_name,
      amount: Number(line.amount),
      type: line.account_type,
      sort_order: line.sort_order,
    };
  });

  return { date: s.snapshot_date, accounts };
}

