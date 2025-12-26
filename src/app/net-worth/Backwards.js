export function deriveNetWorthHistory(
  transactions,
  currentNetWorth
) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  let running = currentNetWorth;
  const history = [];

  for (const tx of sorted) {
    history.push({
      date: tx.date,
      value: Number(running.toFixed(2)),
    });

    running -= tx.amount;
  }

  return history.reverse(); // oldest → newest (chart-friendly)
}
