import { Transaction } from "../../types";
import { KeywordRuleStrategy } from "./KeywordRuleStrategy";
import { TFIDFStrategy } from "./TFIDFStrategy";
import { FallbackChainStrategy } from "./FallbackChainStrategy";
import type { CategoryPredictionStrategy, PredictionContext } from "./types";

/** Full pipeline: keyword rules first, then TF-IDF when context is available. */
export const defaultPredictionStrategy: CategoryPredictionStrategy =
  new FallbackChainStrategy([new KeywordRuleStrategy(), new TFIDFStrategy()]);

/** Predict category (keywords + optional TF-IDF). Use predictCategory from predictions for client-safe keywords-only. */
export function predictWithStrategy(
  transaction: Transaction,
  context?: PredictionContext,
): string {
  return defaultPredictionStrategy.predict(transaction, context);
}

export type { CategoryPredictionStrategy, PredictionContext };
export { KeywordRuleStrategy, TFIDFStrategy, FallbackChainStrategy };
