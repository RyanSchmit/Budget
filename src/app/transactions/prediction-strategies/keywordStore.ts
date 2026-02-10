import type { KeywordRule } from "./defaults";
import { DEFAULT_CATEGORIES, defaultKeywordRules } from "./defaults";

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

/** All categories (from rules + defaults) for dropdowns. */
export function getCategories(): string[] {
  const rules = getKeywordRules();
  const fromRules = new Set(rules.map((r) => r.category));
  DEFAULT_CATEGORIES.forEach((c) => fromRules.add(c));
  return Array.from(fromRules).sort();
}
