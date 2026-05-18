"use client";

import { useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../lib/store/hooks";
import {
  resetToDefaults,
  addKeyword,
  removeKeyword,
} from "../../../lib/store/keywordsSlice";
import {
  selectKeywordRules,
  selectKeywordRuleCategories,
  selectTransactions,
} from "../../../lib/store/selectors";
import { saveKeywordRules } from "../../../lib/api/client";
import { Rule } from "../../types";
import { normalizeDescription } from "../normalizeDescription";
import { tokenize } from "./keywordSearch";

export default function KeywordsTab() {
  const dispatch = useAppDispatch();
  const rules = useAppSelector(selectKeywordRules);
  const categories = useAppSelector(selectKeywordRuleCategories);
  const transactions = useAppSelector(selectTransactions);

  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [showCommonWords, setShowCommonWords] = useState(false);
  const [hideExistingKeywords, setHideExistingKeywords] = useState(true);
  const [commonWordsLimit, setCommonWordsLimit] = useState<number>(50);

  const filteredRules =
    categoryFilter === "ALL"
      ? rules
      : rules.filter((r) => r.category === categoryFilter);

  const normalizedDescs = useMemo(
    () =>
      transactions.map((t) =>
        normalizeDescription(String(t.description ?? "")).toLowerCase(),
      ),
    [transactions],
  );

  const keywordCounts = useMemo(() => {
    const uniq = new Set<string>();
    for (const r of rules) {
      for (const k of r.keywords) uniq.add(k.toLowerCase());
    }
    const counts = new Map<string, number>();
    for (const kw of uniq) {
      let n = 0;
      for (const d of normalizedDescs) if (d.includes(kw)) n++;
      counts.set(kw, n);
    }
    return counts;
  }, [rules, normalizedDescs]);

  // Map from a lowercased keyword to the category it belongs to (first match wins,
  // matching rulePredict ordering). Used to flag common words already in use.
  const keywordToCategory = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rules) {
      for (const k of r.keywords) {
        const key = k.toLowerCase();
        if (!map.has(key)) map.set(key, r.category);
      }
    }
    return map;
  }, [rules]);

  // Word-frequency view: tokenize every normalized transaction description and
  // count document frequency (how many transactions contain the token). This is
  // a flat view across all categories, useful for discovering new keywords.
  const commonWords = useMemo(() => {
    if (!showCommonWords) return [] as Array<{ word: string; count: number }>;
    const docFreq = new Map<string, number>();
    for (const d of normalizedDescs) {
      const seen = new Set<string>();
      for (const tok of tokenize(d)) {
        // Skip purely-numeric tokens (dates, store numbers, etc.) — not useful
        // as keyword candidates.
        if (/^\d+$/.test(tok)) continue;
        if (seen.has(tok)) continue;
        seen.add(tok);
        docFreq.set(tok, (docFreq.get(tok) ?? 0) + 1);
      }
    }
    const arr = Array.from(docFreq, ([word, count]) => ({ word, count }));
    arr.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.word.localeCompare(b.word);
    });
    return arr;
  }, [showCommonWords, normalizedDescs]);

  const visibleCommonWords = useMemo(() => {
    const filtered = hideExistingKeywords
      ? commonWords.filter((w) => !keywordToCategory.has(w.word))
      : commonWords;
    return filtered.slice(0, commonWordsLimit);
  }, [commonWords, hideExistingKeywords, keywordToCategory, commonWordsLimit]);

  const syncToBackend = (updatedRules: Rule[]) => {
    saveKeywordRules(updatedRules).catch(() => {
      // Ignore — localStorage already has the update as a fallback
    });
  };

  const handleAdd = () => {
    const kw = newKeyword.trim().toLowerCase();
    const cat = (newCategory.trim() || "N/A").replace(/\s+/g, " ").trim();
    if (!kw) return;
    dispatch(addKeyword({ category: cat, keyword: kw }));
    setNewKeyword("");
    // Build optimistic updated rules to sync
    const existing = rules.find((r) => r.category === cat);
    const updated: Rule[] = existing
      ? rules.map((r) =>
          r.category === cat
            ? { ...r, keywords: [...r.keywords, kw] }
            : r,
        )
      : [...rules, { category: cat, keywords: [kw] }].sort((a, b) =>
          a.category.localeCompare(b.category),
        );
    syncToBackend(updated);
  };

  const handleRemove = (category: string, keyword: string) => {
    dispatch(removeKeyword({ category, keyword }));
    const updated = rules
      .map((r) =>
        r.category === category
          ? { ...r, keywords: r.keywords.filter((k) => k.toLowerCase() !== keyword.toLowerCase()) }
          : r,
      )
      .filter((r) => r.keywords.length > 0);
    syncToBackend(updated);
  };

  const handleResetToDefaults = () => {
    if (
      typeof window !== "undefined" &&
      window.confirm("Reset all keywords to defaults? This cannot be undone.")
    ) {
      dispatch(resetToDefaults());
      // Import defaults inline to avoid circular dep
      import("./keywords").then(({ defaultKeyWords }) => syncToBackend(defaultKeyWords));
    }
  };

  return (
    <div className="mt-4 space-y-6">
      <p className="text-sm text-gray-400">
        Keywords are used to auto-categorize transactions. Add or remove
        keywords per category; changes are saved to your account and used when
        you run Predict.
      </p>

      {/* Add keyword */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Keyword</label>
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. starbucks"
            className="w-48 rounded-md border border-gray-700 bg-black px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Category</label>
          <input
            type="text"
            list="categories-list"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Restaurants"
            className="w-44 rounded-md border border-gray-700 bg-black px-3 py-2 text-sm text-white placeholder-gray-500"
          />
          <datalist id="categories-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newKeyword.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add keyword
        </button>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-400">Show category:</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-700 bg-black px-3 py-2 text-sm text-white"
        >
          <option value="ALL">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Most common words across all transactions (category-agnostic) */}
      <div className="rounded-lg border border-gray-800 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium text-white">
              Most common words across transactions
            </h4>
            <p className="mt-1 text-xs text-gray-400">
              Discover frequent words in your transaction descriptions to find
              candidates for new keywords. Click a word to use it as a new
              keyword.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCommonWords((v) => !v)}
            className="rounded-md border border-gray-700 bg-black px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-900"
          >
            {showCommonWords ? "Hide" : "Show"}
          </button>
        </div>

        {showCommonWords && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={hideExistingKeywords}
                  onChange={(e) => setHideExistingKeywords(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Hide words already used as keywords
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                Top:
                <select
                  value={commonWordsLimit}
                  onChange={(e) => setCommonWordsLimit(Number(e.target.value))}
                  className="rounded-md border border-gray-700 bg-black px-2 py-1 text-xs text-white"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
              </label>
              <span className="text-xs text-gray-500">
                Showing {visibleCommonWords.length} of {commonWords.length}{" "}
                unique words
              </span>
            </div>

            {visibleCommonWords.length === 0 ? (
              <p className="text-sm text-gray-500">
                {transactions.length === 0
                  ? "No transactions yet."
                  : hideExistingKeywords
                    ? "All common words are already covered by your keywords."
                    : "No words to show."}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {visibleCommonWords.map(({ word, count }) => {
                  const existingCategory = keywordToCategory.get(word);
                  return (
                    <li
                      key={word}
                      className="flex items-center gap-1 rounded-md bg-gray-800 px-2 py-1 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => setNewKeyword(word)}
                        title={`Use "${word}" as new keyword`}
                        className="text-gray-200 hover:text-blue-300"
                      >
                        {word}
                      </button>
                      <span
                        className="ml-1 rounded bg-gray-700 px-1.5 text-xs text-gray-300"
                        title={`Appears in ${count} transaction${count === 1 ? "" : "s"}`}
                      >
                        {count}
                      </span>
                      {existingCategory && (
                        <span
                          className="ml-1 rounded bg-blue-900/60 px-1.5 text-xs text-blue-200"
                          title={`Already a keyword in "${existingCategory}"`}
                        >
                          {existingCategory}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* List by category */}
      <div className="space-y-4">
        {filteredRules.length === 0 ? (
          <p className="text-sm text-gray-500">
            {categoryFilter === "ALL"
              ? "No keyword rules yet. Add one above."
              : `No keywords for "${categoryFilter}".`}
          </p>
        ) : (
          <ul className="space-y-4">
            {filteredRules.map((rule) => (
              <li
                key={rule.category}
                className="rounded-lg border border-gray-800 bg-white/[0.03] p-4"
              >
                <h4 className="mb-2 text-sm font-medium text-white">
                  {rule.category}
                </h4>
                <ul className="flex flex-wrap gap-2">
                  {[...rule.keywords]
                    .sort((a, b) => {
                      const ca = keywordCounts.get(a.toLowerCase()) ?? 0;
                      const cb = keywordCounts.get(b.toLowerCase()) ?? 0;
                      if (cb !== ca) return cb - ca;
                      return a.localeCompare(b);
                    })
                    .map((kw) => {
                      const count = keywordCounts.get(kw.toLowerCase()) ?? 0;
                      return (
                        <li
                          key={kw}
                          className="flex items-center gap-1 rounded-md bg-gray-800 px-2 py-1 text-sm"
                        >
                          <span className="text-gray-200">{kw}</span>
                          <span
                            className="ml-1 rounded bg-gray-700 px-1.5 text-xs text-gray-300"
                            title={`${count} transaction${count === 1 ? "" : "s"} contain "${kw}"`}
                          >
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(rule.category, kw)}
                            className="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-700 hover:text-red-400"
                            aria-label={`Remove ${kw}`}
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={handleResetToDefaults}
        className="pb-4 text-sm text-gray-500 hover:text-gray-300 underline"
      >
        Reset to default keywords
      </button>
    </div>
  );
}
