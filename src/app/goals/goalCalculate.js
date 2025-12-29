export function calculateTimeToGoal({
  principal,
  weeklyContribution,
  annualRate,
  target,
}) {
  if (
    principal == null ||
    weeklyContribution == null ||
    target == null ||
    annualRate == null
  ) {
    return null;
  }

  const weeklyRate = annualRate / 100 / 52;
  let balance = principal;
  let weeks = 0;

  while (balance < target) {
    balance += weeklyContribution;
    balance *= 1 + weeklyRate;
    weeks++;

    // safety cap (200 years)
    if (weeks > 52 * 200) return null;
  }

  const years = Math.floor(weeks / 52);
  const months = Math.round(((weeks % 52) / 52) * 12);

  return {
    weeks,
    years,
    months,
    finalBalance: balance,
  };
}
