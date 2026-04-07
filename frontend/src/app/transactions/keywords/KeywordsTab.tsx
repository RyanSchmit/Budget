"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../lib/store/hooks";
import {
  resetToDefaults,
  addKeyword,
  removeKeyword,
} from "../../../lib/store/keywordsSlice";
import {
  selectKeywordRules,
  selectKeywordRuleCategories,
} from "../../../lib/store/selectors";
import { saveKeywordRules } from "../../../lib/api/client";
import { Rule } from "../../types";

export default function KeywordsTab() {
  const dispatch = useAppDispatch();
  const rules = useAppSelector(selectKeywordRules);
  const categories = useAppSelector(selectKeywordRuleCategories);

  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filteredRules =
    categoryFilter === "ALL"
      ? rules
      : rules.filter((r) => r.category === categoryFilter);

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
                  {rule.keywords.map((kw) => (
                    <li
                      key={kw}
                      className="flex items-center gap-1 rounded-md bg-gray-800 px-2 py-1 text-sm"
                    >
                      <span className="text-gray-200">{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemove(rule.category, kw)}
                        className="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-700 hover:text-red-400"
                        aria-label={`Remove ${kw}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
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
