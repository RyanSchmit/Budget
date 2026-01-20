function formatMoney(
  amount: number,
  locale: string = "en-US",
  currency: string = "USD"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2, // Ensures two decimal places
  }).format(amount);
}

export { formatMoney };
