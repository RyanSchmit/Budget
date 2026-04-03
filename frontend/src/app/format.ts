function formatMoney(
  amount: number,
  locale: string = "en-US",
  currency: string = "USD"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2, // Ensures two decimal places
    signDisplay: "auto", // Show minus for negative amounts (e.g. expenses/withdrawals)
  }).format(amount);
}

export { formatMoney };
