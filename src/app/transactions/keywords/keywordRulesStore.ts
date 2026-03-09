import { defaultKeyWords } from "./keywords";
import { Rule } from "../../types";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "keyword_rules";

let cachedRaw: string | null | undefined = undefined;
let cachedRules: Rule[] = defaultKeyWords;

function isRuleArray(value: unknown): value is Rule[] {
  if (!Array.isArray(value)) return false;
  return value.every((r) => {
    if (!r || typeof r !== "object") return false;
    const maybe = r as { category?: unknown; keywords?: unknown };
    return (
      typeof maybe.category === "string" &&
      Array.isArray(maybe.keywords) &&
      maybe.keywords.every((k) => typeof k === "string")
    );
  });
}

export function getKeywordRules(): Rule[] {
  if (typeof window === "undefined") return defaultKeyWords;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // useSyncExternalStore expects getSnapshot to return a stable reference
    // when the underlying store hasn't changed.
    if (raw === cachedRaw) return cachedRules;

    cachedRaw = raw;
    if (!raw) {
      cachedRules = defaultKeyWords;
      return cachedRules;
    }

    const parsed: unknown = JSON.parse(raw);
    cachedRules = isRuleArray(parsed) ? parsed : defaultKeyWords;
    return cachedRules;
  } catch {
    cachedRaw = null;
    cachedRules = defaultKeyWords;
    return cachedRules;
  }
}

export function subscribeKeywordRules(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("keyword_rules_updated", listener);
  return () => window.removeEventListener("keyword_rules_updated", listener);
}

export function useKeywordRules(): Rule[] {
  return useSyncExternalStore(subscribeKeywordRules, getKeywordRules, () => {
    return defaultKeyWords;
  });
}

export function setKeywordRules(next: Rule[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedRules = next;
    window.dispatchEvent(new Event("keyword_rules_updated"));
  } catch {
    // ignore write failures (private mode, storage full, etc.)
  }
}

export function resetKeywordRulesToDefaults() {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(defaultKeyWords);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedRules = defaultKeyWords;
    window.dispatchEvent(new Event("keyword_rules_updated"));
  } catch {
    // ignore
  }
}

export function getKeywordRuleCategories(rules: Rule[]): string[] {
  const set = new Set<string>();
  for (const r of rules) {
    const c = (r.category ?? "").trim();
    if (c) set.add(c);
  }
  if (!set.has("N/A")) set.add("N/A");
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

