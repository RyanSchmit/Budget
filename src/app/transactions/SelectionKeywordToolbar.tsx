"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  getKeywordRules,
  setKeywordRules,
  getCategories,
} from "./prediction-strategies/keywordStore";

interface SelectionKeywordToolbarProps {
  /** Only show toolbar when selection is inside this element. */
  containerRef: React.RefObject<HTMLElement | null>;
}

export default function SelectionKeywordToolbar({
  containerRef,
}: SelectionKeywordToolbarProps) {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pickedCategory, setPickedCategory] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  const categories = getCategories();
  const defaultCategory = "N/A";

  const clearSelection = useCallback(() => {
    setSelectedText(null);
    setRect(null);
    setShowCategoryPicker(false);
    setPickedCategory("");
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  const updateFromSelection = useCallback(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const el = document.activeElement;
    const isInputOrTextarea =
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

    // Selection inside <input> or <textarea> (not reported by getSelection())
    if (isInputOrTextarea && containerRef.current.contains(el)) {
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const text = (el.value ?? "").slice(start, end).trim();
      if (!text) {
        setSelectedText(null);
        setRect(null);
        setShowCategoryPicker(false);
        return;
      }
      const r = el.getBoundingClientRect();
      setSelectedText(text);
      setRect(r);
      setShowCategoryPicker(false);
      setPickedCategory(defaultCategory);
      return;
    }

    // Selection in document content (e.g. table cell text if not in an input)
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!text) {
      setSelectedText(null);
      setRect(null);
      setShowCategoryPicker(false);
      return;
    }
    const anchor = sel?.anchorNode;
    if (!anchor || !containerRef.current.contains(anchor)) {
      setSelectedText(null);
      setRect(null);
      return;
    }
    try {
      const range = sel.getRangeAt(0);
      const r = range.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      setSelectedText(text);
      setRect(r);
      setShowCategoryPicker(false);
      setPickedCategory(defaultCategory);
    } catch {
      setSelectedText(null);
      setRect(null);
    }
  }, [containerRef]);

  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay so selection is updated
      requestAnimationFrame(updateFromSelection);
    };
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel?.toString().trim()) {
        setSelectedText(null);
        setRect(null);
        setShowCategoryPicker(false);
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [updateFromSelection]);

  // Close toolbar when clicking outside
  useEffect(() => {
    if (!selectedText || !showCategoryPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (
        toolbarRef.current?.contains(e.target as Node) ||
        containerRef.current?.contains(e.target as Node)
      )
        return;
      clearSelection();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selectedText, showCategoryPicker, clearSelection, containerRef]);

  const handleAddToKeywords = () => {
    if (!selectedText) return;
    const kw = selectedText.toLowerCase().trim();
    const cat = (pickedCategory || defaultCategory).trim() || "N/A";
    const rules = getKeywordRules();
    const next = rules.slice();
    let rule = next.find((r) => r.category === cat);
    if (rule) {
      if (rule.keywords.some((k) => k.toLowerCase() === kw)) {
        clearSelection();
        return;
      }
      const idx = next.findIndex((r) => r.category === cat);
      next[idx] = { ...rule, keywords: [...rule.keywords, kw] };
    } else {
      next.push({ category: cat, keywords: [kw] });
      next.sort((a, b) => a.category.localeCompare(b.category));
    }
    setKeywordRules(next);
    clearSelection();
  };

  if (!selectedText || !rect) return null;

  const toolbarHeight = 40;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 shadow-lg"
      style={{
        top: rect.top - toolbarHeight - 8,
        left: Math.max(8, rect.left + rect.width / 2 - 120),
        transform: "translateY(-2px)",
      }}
    >
      {showCategoryPicker ? (
        <>
          <select
            value={pickedCategory}
            onChange={(e) => setPickedCategory(e.target.value)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white"
            autoFocus
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddToKeywords}
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded px-2 py-1 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="max-w-[140px] truncate text-sm text-gray-300">
            &ldquo;{selectedText}&rdquo;
          </span>
          <button
            type="button"
            onClick={() => setShowCategoryPicker(true)}
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add to keywords
          </button>
        </>
      )}
    </div>
  );
}
