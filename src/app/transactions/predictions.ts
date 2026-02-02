import { KeywordRuleStrategy } from "./strategies/KeywordRuleStrategy";

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

/** @deprecated Use predictCategory instead. */
export const rulePredict = (description: string, amount: number): string =>
  predictCategory({
    id: "",
    date: "",
    description,
    category: "N/A",
    amount,
  });
