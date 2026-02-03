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
