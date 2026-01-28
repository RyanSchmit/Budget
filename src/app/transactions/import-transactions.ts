"use server";

import { insertTransactions } from "./actions";
import { transactions as staticTransactions } from "../transactions";

/**
 * Utility function to import all transactions from transactions.ts into the database.
 * This should be called once to migrate existing data.
 * 
 * To use this, you can create a temporary API route or call it from a script.
 */
export async function importStaticTransactions() {
  try {
    console.log(`Importing ${staticTransactions.length} transactions...`);
    const result = await insertTransactions(staticTransactions);
    
    if (result.success) {
      console.log("Successfully imported all transactions!");
      return { success: true, count: staticTransactions.length };
    } else {
      console.error("Failed to import transactions:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Error importing transactions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
