import { Transaction } from "../../types";
import { getKeywordRules } from "./keywordStore";
import type { CategoryPredictionStrategy } from "./types";

/** Predicts category using keyword matching rules. */
export class KeywordRuleStrategy implements CategoryPredictionStrategy {
  predict(transaction: Transaction): string {
    const keywordRules = getKeywordRules();
    const text = String(transaction.description).toLowerCase();
    for (const rule of keywordRules) {
      if (rule.keywords.some((k) => text.includes(String(k).toLowerCase()))) {
        return rule.category;
      }
    }
    return "N/A";
  }
}
