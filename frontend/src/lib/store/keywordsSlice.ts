import { createSlice, PayloadAction, current } from "@reduxjs/toolkit";
import { Rule } from "../../app/types";
import { defaultKeyWords } from "../../app/transactions/keywords/keywords";

const STORAGE_KEY = "keyword_rules";

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

function loadFromStorage(): Rule[] {
  if (typeof window === "undefined") return defaultKeyWords;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultKeyWords;
    const parsed: unknown = JSON.parse(raw);
    return isRuleArray(parsed) ? parsed : defaultKeyWords;
  } catch {
    return defaultKeyWords;
  }
}

function saveToStorage(rules: Rule[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // ignore write failures (private mode, storage full, etc.)
  }
}

interface KeywordsState {
  rules: Rule[];
}

const initialState: KeywordsState = {
  rules: defaultKeyWords,
};

const keywordsSlice = createSlice({
  name: "keywords",
  initialState,
  reducers: {
    initFromStorage(state) {
      state.rules = loadFromStorage();
    },
    setRules(state, action: PayloadAction<Rule[]>) {
      state.rules = action.payload;
      saveToStorage(action.payload);
    },
    resetToDefaults(state) {
      state.rules = defaultKeyWords;
      saveToStorage(defaultKeyWords);
    },
    addKeyword(
      state,
      action: PayloadAction<{ category: string; keyword: string }>,
    ) {
      const { category, keyword } = action.payload;
      const kw = keyword.toLowerCase().trim();
      if (!kw) return;
      const cat = (category.trim() || "N/A").replace(/\s+/g, " ").trim();
      const ruleIdx = state.rules.findIndex((r) => r.category === cat);
      if (ruleIdx !== -1) {
        if (
          !state.rules[ruleIdx].keywords.some((k) => k.toLowerCase() === kw)
        ) {
          state.rules[ruleIdx].keywords.push(kw);
        }
      } else {
        state.rules.push({ category: cat, keywords: [kw] });
        state.rules.sort((a, b) => a.category.localeCompare(b.category));
      }
      saveToStorage(current(state.rules));
    },
    removeKeyword(
      state,
      action: PayloadAction<{ category: string; keyword: string }>,
    ) {
      const { category, keyword } = action.payload;
      const ruleIdx = state.rules.findIndex((r) => r.category === category);
      if (ruleIdx === -1) return;
      state.rules[ruleIdx].keywords = state.rules[ruleIdx].keywords.filter(
        (k) => k.toLowerCase() !== keyword.toLowerCase(),
      );
      if (state.rules[ruleIdx].keywords.length === 0) {
        state.rules.splice(ruleIdx, 1);
      }
      saveToStorage(current(state.rules));
    },
  },
});

export const { initFromStorage, setRules, resetToDefaults, addKeyword, removeKeyword } =
  keywordsSlice.actions;

export default keywordsSlice.reducer;
