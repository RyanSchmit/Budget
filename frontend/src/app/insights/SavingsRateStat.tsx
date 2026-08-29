"use client";

import { Transaction } from "../types";
import { formatRate, summarize } from "../summary";

interface SavingsRateStatProps {
  transactions: Transaction[];
}

const BASIS_DESCRIPTION =
  "Income minus expenses, divided by income. Rows categorized Income count as income; everything else counts as spending, with credits netting against the category they were posted to.";

export default function SavingsRateStat({
  transactions,
}: SavingsRateStatProps) {
  const { rate } = summarize(transactions);

  const color =
    rate === null ? "text-white" : rate >= 0 ? "text-green-500" : "text-red-500";

  return (
    <p className="text-white/70 mt-1" title={BASIS_DESCRIPTION}>
      Savings rate: <span className={`font-bold ${color}`}>{formatRate(rate)}</span>
    </p>
  );
}
