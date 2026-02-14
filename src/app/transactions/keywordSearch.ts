import { keywordRules } from "./keywords/keywords";

export const rulePredict = (description: string, amount: number): string => {
  const text = String(description).toLowerCase();
  for (const rule of keywordRules) {
    if (rule.keywords.some((k) => text.includes(String(k).toLowerCase()))) {
      return rule.category;
    }
  }
  return "N/A";
};
