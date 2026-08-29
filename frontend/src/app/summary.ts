import { Transaction } from "./types";

/**
 * The single definition of income used by every view. A row counts as income
 * because of its category, not because its amount happens to be positive, so a
 * refund posted against Groceries reduces grocery spending instead of inflating
 * income.
 */
export const INCOME_CATEGORY = "Income";

export function isIncome(transaction: Transaction): boolean {
  return transaction.category.trim() === INCOME_CATEGORY;
}

function amountOf(transaction: Transaction): number {
  const { amount } = transaction;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
}

export interface Summary {
  income: number;
  /** Positive when money went out, so credits inside a spending category subtract. */
  expenses: number;
  /** income − expenses, which is also the signed sum of every amount. */
  net: number;
  rate: number | null;
}

export function summarize(transactions: Transaction[]): Summary {
  let income = 0;
  let expenses = 0;

  for (const transaction of transactions) {
    const amount = amountOf(transaction);
    if (isIncome(transaction)) income += amount;
    else expenses -= amount;
  }

  const net = income - expenses;

  return { income, expenses, net, rate: income > 0 ? net / income : null };
}

/** -----------------------
 *  Calendar helpers
 *  ---------------------- */

// Dates are stored as "YYYY-MM-DD", which Date parses as UTC midnight. Reading
// the fields back with local getters shifts the 1st of a month into the previous
// month for anyone west of UTC, so read them off the string instead and only
// fall back to Date for values that are not ISO.
const ISO_DATE = /^(\d{4})-(\d{2})(?:-(\d{2}))?/;

export const UNKNOWN_MONTH = "unknown";

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  /** Normalized "YYYY-MM-DD", so date ranges compare as plain strings. */
  iso: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

function toCalendarDate(year: number, month: number, day: number): CalendarDate {
  return { year, month, day, iso: `${year}-${pad(month)}-${pad(day)}` };
}

export function calendarDate(date: string): CalendarDate | null {
  const iso = ISO_DATE.exec(date);
  if (iso) {
    return toCalendarDate(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3] ?? "1"),
    );
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return toCalendarDate(
    parsed.getFullYear(),
    parsed.getMonth() + 1,
    parsed.getDate(),
  );
}

/** A Date rendered as "YYYY-MM-DD" in the viewer's own calendar, not in UTC. */
export function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthKey(date: string): string {
  const parts = calendarDate(date);
  if (!parts) return UNKNOWN_MONTH;
  return `${parts.year}-${pad(parts.month)}`;
}

const monthShortNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export interface MonthlySummary extends Summary {
  key: string;
  /** Includes the year, for tooltips where months from different years collide. */
  month: string;
  /** Just the month name, for axis labels where space is tight. */
  shortMonth: string;
}

export function summarizeByMonth(
  transactions: Transaction[],
): MonthlySummary[] {
  const byMonth = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const key = monthKey(transaction.date);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(transaction);
    else byMonth.set(key, [transaction]);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, monthTransactions]) => {
      const [year, month] = key.split("-");
      const shortMonth = monthShortNames[Number(month) - 1] ?? "Unknown";
      return {
        key,
        month: shortMonth === "Unknown" ? shortMonth : `${shortMonth} ${year}`,
        shortMonth,
        ...summarize(monthTransactions),
      };
    });
}

/** -----------------------
 *  Category breakdown
 *  ---------------------- */

export interface CategorySpend {
  category: string;
  /** Net outflow for the category; these sum to `summarize().expenses`. */
  amount: number;
}

/**
 * Spending per category, largest first. Credits posted against a spending
 * category (refunds, reimbursements) net against it, so a category can come
 * back non-positive; callers that draw proportional shapes should drop those.
 */
export function spendByCategory(transactions: Transaction[]): CategorySpend[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (isIncome(transaction)) continue;
    const previous = totals.get(transaction.category) ?? 0;
    totals.set(transaction.category, previous - amountOf(transaction));
  }

  return Array.from(totals, ([category, amount]) => ({ category, amount })).sort(
    (a, b) => b.amount - a.amount,
  );
}

export function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}
