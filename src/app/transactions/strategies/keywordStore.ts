import type { KeywordRule } from "./keywords";
import { keywordRules as defaultKeywordRules } from "./keywords";

const STORAGE_KEY = "budget_keyword_rules";

function isClient(): boolean {
  return typeof window !== "undefined";
}

/** Get keyword rules: from localStorage if set (client), otherwise defaults. */
export function getKeywordRules(): KeywordRule[] {
  if (isClient()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as KeywordRule[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore invalid JSON
    }
  }
  return defaultKeywordRules;
}

/** Persist keyword rules to localStorage (client only). */
export function setKeywordRules(rules: KeywordRule[]): void {
  if (isClient()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    } catch {
      // ignore quota / disabled storage
    }
  }
}

const DEFAULT_CATEGORIES = [
  "Restaurants",
  "College",
  "Income",
  "Trips",
  "Utilities",
  "Energy Drink",
  "Groceries",
  "Bars",
  "Golf",
  "Transportation",
  "Alcohol",
  "Snacks",
  "Subscriptions",
  "Sports Games",
  "Traffic Tickets",
  "Gym",
  "Gambling",
  "Clothes",
  "Online Shopping",
  "Books",
  "N/A",
];

/** All categories (from rules + defaults) for dropdowns. */
export function getCategories(): string[] {
  const rules = getKeywordRules();
  const fromRules = new Set(rules.map((r) => r.category));
  DEFAULT_CATEGORIES.forEach((c) => fromRules.add(c));
  return Array.from(fromRules).sort();
}
