import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const systemTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are WealthPath AI, a knowledgeable and encouraging personal finance advisor built into the WealthPath app.

You have access to tools to look up the user's real financial data. When the user asks about their finances, spending, net worth, or transactions, always call the appropriate tool first so you can give accurate, personalized advice based on real numbers.

Today's date is {currentDate}.

When answering:
- Reference actual numbers from the user's data when available
- Offer actionable, specific advice tailored to their situation
- Use clear formatting with bullet points or numbered lists when listing multiple items
- For general budgeting or financial planning questions you can answer without data, do so directly
- Be encouraging and supportive — money is stressful and the user is trying to improve their financial life

Transaction categories in this app include: Restaurants, Groceries, Bars, Income, Subscriptions, Transportation, Golf, Gym, and others the user has configured.

When discussing spending, negative amounts are expenses and positive amounts are income.`,
  ],
]);

export async function POST(req: Request) {
  const { messages } = await req.json();

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formattedMessages = await systemTemplate.formatMessages({
    currentDate: new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });

  const systemPrompt = formattedMessages[0].content as string;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(5),
    tools: {
      getSpendingByCategory: tool({
        description:
          "Get the user's spending totals grouped by category for a date range. Use this when the user asks about their spending habits, where their money goes, budget breakdowns, or wants to know their top expense categories.",
        inputSchema: z.object({
          startDate: z
            .string()
            .describe("Start date in YYYY-MM-DD format (inclusive)"),
          endDate: z
            .string()
            .describe("End date in YYYY-MM-DD format (inclusive)"),
        }),
        execute: async (input) => {
          const { startDate, endDate } = input;
          const { data, error } = await supabase
            .from("transactions")
            .select("category, amount")
            .gte("date", startDate)
            .lte("date", endDate);

          if (error) return { error: error.message };

          const grouped: Record<string, number> = {};
          for (const t of data ?? []) {
            const cat = t.category || "Uncategorized";
            grouped[cat] = (grouped[cat] || 0) + Number(t.amount);
          }

          return {
            startDate,
            endDate,
            categories: Object.entries(grouped)
              .map(([category, total]) => ({
                category,
                total: Math.round(total * 100) / 100,
              }))
              .sort((a, b) => a.total - b.total),
          };
        },
      }),

      getRecentTransactions: tool({
        description:
          "Get the user's most recent transactions. Use this when the user asks about recent purchases, specific transactions, or wants to review what they have spent money on lately.",
        inputSchema: z.object({
          limit: z
            .number()
            .min(1)
            .max(50)
            .default(20)
            .describe("Number of recent transactions to fetch (max 50)"),
        }),
        execute: async (input) => {
          const { limit } = input;
          const { data, error } = await supabase
            .from("transactions")
            .select("date, description, category, amount")
            .order("date", { ascending: false })
            .limit(limit);

          if (error) return { error: error.message };

          return {
            transactions: (data ?? []).map((t) => ({
              date: t.date,
              description: t.description,
              category: t.category,
              amount: Number(t.amount),
            })),
          };
        },
      }),

      getNetWorthSummary: tool({
        description:
          "Get the user's latest net worth snapshot including a full breakdown of assets and liabilities. Use this when the user asks about their net worth, total assets, debts, or overall financial position.",
        inputSchema: z.object({}),
        execute: async () => {
          const { data: snapshot, error: snapshotError } = await supabase
            .from("net_worth_snapshots")
            .select("id, snapshot_date")
            .order("snapshot_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (snapshotError) return { error: snapshotError.message };
          if (!snapshot)
            return {
              error:
                "No net worth data found. The user has not saved a net worth snapshot yet.",
            };

          const { data: accounts, error: accountsError } = await supabase
            .from("net_worth_snapshot_accounts")
            .select("account_name, amount, account_type")
            .eq("snapshot_id", snapshot.id)
            .order("sort_order", { ascending: true });

          if (accountsError) return { error: accountsError.message };

          const assets = (accounts ?? []).filter(
            (a) => a.account_type === "asset"
          );
          const liabilities = (accounts ?? []).filter(
            (a) => a.account_type === "liability"
          );
          const totalAssets = assets.reduce(
            (sum, a) => sum + Number(a.amount),
            0
          );
          const totalLiabilities = liabilities.reduce(
            (sum, a) => sum + Number(a.amount),
            0
          );

          return {
            date: snapshot.snapshot_date,
            assets: assets.map((a) => ({
              name: a.account_name,
              amount: Number(a.amount),
            })),
            liabilities: liabilities.map((a) => ({
              name: a.account_name,
              amount: Number(a.amount),
            })),
            totalAssets: Math.round(totalAssets * 100) / 100,
            totalLiabilities: Math.round(totalLiabilities * 100) / 100,
            netWorth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
          };
        },
      }),

      getNetWorthHistory: tool({
        description:
          "Get the history of the user's net worth over time. Use this when the user asks about their financial progress, wealth trends, or how their net worth has changed over months.",
        inputSchema: z.object({}),
        execute: async () => {
          const { data: snapshots, error } = await supabase
            .from("net_worth_snapshots")
            .select(
              "snapshot_date, net_worth_snapshot_accounts(amount, account_type)"
            )
            .order("snapshot_date", { ascending: true });

          if (error) return { error: error.message };

          const history = (snapshots ?? []).map((s) => {
            const accts = (
              s as unknown as {
                snapshot_date: string;
                net_worth_snapshot_accounts: {
                  amount: number;
                  account_type: string;
                }[];
              }
            ).net_worth_snapshot_accounts;
            const totalAssets = accts
              .filter((a) => a.account_type === "asset")
              .reduce((sum, a) => sum + Number(a.amount), 0);
            const totalLiabilities = accts
              .filter((a) => a.account_type === "liability")
              .reduce((sum, a) => sum + Number(a.amount), 0);
            return {
              date: s.snapshot_date,
              netWorth:
                Math.round((totalAssets - totalLiabilities) * 100) / 100,
            };
          });

          return { history };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
