import { Transaction } from "../../types";
import type { CategoryPredictionStrategy, PredictionContext } from "./types";

/** Tries strategies in order; returns first non-N/A result. */
export class FallbackChainStrategy implements CategoryPredictionStrategy {
  constructor(private readonly strategies: CategoryPredictionStrategy[]) {}

  predict(transaction: Transaction, context?: PredictionContext): string {
    for (const strategy of this.strategies) {
      const result = strategy.predict(transaction, context);
      if (result !== "N/A") {
        return result;
      }
    }
    return "N/A";
  }
}
