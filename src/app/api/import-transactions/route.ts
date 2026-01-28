import { importStaticTransactions } from "../../transactions/import-transactions";
import { NextResponse } from "next/server";

/**
 * API route to import transactions from transactions.ts into the database.
 * 
 * Usage: POST /api/import-transactions
 * 
 * This is a one-time migration endpoint. You can call it once to import
 * all existing transactions from the static file into the database.
 */
export async function POST() {
  try {
    const result = await importStaticTransactions();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${result.count} transactions`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
