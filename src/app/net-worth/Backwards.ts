import { Transaction, NetWorthHistoryItem } from "../types";

export function deriveNetWorthHistory(
  transactions: Transaction[],
  currentNetWorth: number
): NetWorthHistoryItem[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let running = currentNetWorth;
  const history: NetWorthHistoryItem[] = [];

  for (const tx of sorted) {
    history.push({
      date: tx.date,
      value: Number(running.toFixed(2)),
    });

    running -= tx.amount;
  }

  return history.reverse(); // oldest → newest (chart-friendly)
}
