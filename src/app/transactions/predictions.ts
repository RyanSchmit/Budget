import { KeywordRuleStrategy } from "./prediction-strategies/KeywordRuleStrategy";

const keywordStrategy = new KeywordRuleStrategy();

/** Predict category using keyword rules (client-safe; TF-IDF runs on backend). */
export function predictCategory(transaction: {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}): string {
  return keywordStrategy.predict(transaction);
}
