"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage, DynamicToolUIPart, TextUIPart } from "ai";
import ReactMarkdown from "react-markdown";

const SUGGESTED_QUESTIONS = [
  "What did I spend the most on last month?",
  "How is my net worth trending?",
  "Show me my recent transactions",
  "Where can I cut back on spending?",
  "How should I build an emergency fund?",
  "What's the 50/30/20 budgeting rule?",
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

type SpendingResult = {
  startDate: string;
  endDate: string;
  categories: { category: string; total: number }[];
};

type TransactionsResult = {
  transactions: {
    date: string;
    description: string;
    category: string;
    amount: number;
  }[];
};

type NetWorthResult = {
  date: string;
  assets: { name: string; amount: number }[];
  liabilities: { name: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

type NetWorthHistoryResult = {
  history: { date: string; netWorth: number }[];
};

function SpendingCard({ data }: { data: SpendingResult }) {
  const expenses = data.categories.filter((c) => c.total < 0);
  const income = data.categories.filter((c) => c.total > 0);
  const maxExpense = Math.abs(Math.min(...expenses.map((c) => c.total), 0));

  return (
    <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 overflow-hidden text-sm">
      <div className="px-3 py-2 border-b border-gray-700 flex justify-between items-center">
        <span className="font-medium text-gray-200">Spending Breakdown</span>
        <span className="text-xs text-gray-500">
          {data.startDate} to {data.endDate}
        </span>
      </div>
      {income.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-800">
          {income.map((c) => (
            <div key={c.category} className="flex justify-between py-0.5">
              <span className="text-gray-400">{c.category}</span>
              <span className="text-green-400">+{formatCurrency(c.total)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="px-3 py-2 space-y-1.5">
        {expenses.map((c) => {
          const pct =
            maxExpense > 0 ? (Math.abs(c.total) / maxExpense) * 100 : 0;
          return (
            <div key={c.category}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-300">{c.category}</span>
                <span className="text-gray-400">{formatCurrency(c.total)}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TransactionsCard({ data }: { data: TransactionsResult }) {
  return (
    <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 overflow-hidden text-sm">
      <div className="px-3 py-2 border-b border-gray-700">
        <span className="font-medium text-gray-200">
          Recent Transactions ({data.transactions.length})
        </span>
      </div>
      <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
        {data.transactions.map((t, i) => (
          <div
            key={i}
            className="px-3 py-2 flex justify-between items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-gray-300 truncate">{t.description}</p>
              <p className="text-xs text-gray-500">
                {t.category} · {t.date}
              </p>
            </div>
            <span
              className={
                t.amount >= 0
                  ? "text-green-400 shrink-0"
                  : "text-gray-400 shrink-0"
              }
            >
              {t.amount >= 0 ? "+" : ""}
              {formatCurrency(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetWorthCard({ data }: { data: NetWorthResult }) {
  return (
    <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 overflow-hidden text-sm">
      <div className="px-3 py-2 border-b border-gray-700 flex justify-between items-center">
        <span className="font-medium text-gray-200">Net Worth</span>
        <span className="text-xs text-gray-500">as of {data.date}</span>
      </div>
      <div className="px-3 py-2 border-b border-gray-800">
        <div className="flex justify-between py-0.5 text-xs text-gray-500 uppercase tracking-wide">
          <span>Assets</span>
          <span className="text-green-400">
            {formatCurrency(data.totalAssets)}
          </span>
        </div>
        {data.assets.map((a) => (
          <div key={a.name} className="flex justify-between py-0.5 pl-2">
            <span className="text-gray-400">{a.name}</span>
            <span className="text-gray-300">{formatCurrency(a.amount)}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-b border-gray-800">
        <div className="flex justify-between py-0.5 text-xs text-gray-500 uppercase tracking-wide">
          <span>Liabilities</span>
          <span className="text-red-400">
            {formatCurrency(data.totalLiabilities)}
          </span>
        </div>
        {data.liabilities.map((a) => (
          <div key={a.name} className="flex justify-between py-0.5 pl-2">
            <span className="text-gray-400">{a.name}</span>
            <span className="text-gray-300">{formatCurrency(a.amount)}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 flex justify-between font-semibold">
        <span className="text-gray-200">Net Worth</span>
        <span
          className={data.netWorth >= 0 ? "text-green-400" : "text-red-400"}
        >
          {data.netWorth >= 0 ? "" : "-"}
          {formatCurrency(data.netWorth)}
        </span>
      </div>
    </div>
  );
}

function NetWorthHistoryCard({ data }: { data: NetWorthHistoryResult }) {
  return (
    <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 overflow-hidden text-sm">
      <div className="px-3 py-2 border-b border-gray-700">
        <span className="font-medium text-gray-200">Net Worth History</span>
      </div>
      <div className="divide-y divide-gray-800 max-h-48 overflow-y-auto">
        {data.history.map((item, i) => {
          const prev = i > 0 ? data.history[i - 1].netWorth : null;
          const delta = prev !== null ? item.netWorth - prev : null;
          return (
            <div
              key={item.date}
              className="px-3 py-2 flex justify-between items-center"
            >
              <span className="text-gray-400">{item.date}</span>
              <div className="text-right">
                <span
                  className={
                    item.netWorth >= 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  {formatCurrency(item.netWorth)}
                </span>
                {delta !== null && (
                  <span
                    className={`ml-2 text-xs ${delta >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {delta >= 0 ? "▲" : "▼"} {formatCurrency(delta)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToolResultCard({ part }: { part: DynamicToolUIPart }) {
  if (part.state !== "output-available") {
    return (
      <div className="mt-2 text-xs text-gray-500 italic">
        Looking up your data...
      </div>
    );
  }

  const result = part.output as Record<string, unknown>;
  const toolName = part.toolName;

  if (result?.error) {
    return (
      <div className="mt-2 text-xs text-red-400 italic">
        {result.error as string}
      </div>
    );
  }

  if (toolName === "getSpendingByCategory" && result?.categories) {
    return <SpendingCard data={result as unknown as SpendingResult} />;
  }
  if (toolName === "getRecentTransactions" && result?.transactions) {
    return <TransactionsCard data={result as unknown as TransactionsResult} />;
  }
  if (toolName === "getNetWorthSummary" && result?.netWorth !== undefined) {
    return <NetWorthCard data={result as unknown as NetWorthResult} />;
  }
  if (toolName === "getNetWorthHistory" && result?.history) {
    return (
      <NetWorthHistoryCard data={result as unknown as NetWorthHistoryResult} />
    );
  }

  return null;
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-white text-black rounded-br-sm"
            : "bg-gray-900 text-white rounded-bl-sm border border-gray-800"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            const textPart = part as TextUIPart;
            return (
              <div
                key={i}
                className={`prose prose-sm max-w-none ${
                  isUser
                    ? "prose-neutral"
                    : "prose-invert prose-p:text-gray-200 prose-li:text-gray-200 prose-strong:text-white prose-headings:text-white"
                }`}
              >
                <ReactMarkdown>{textPart.text}</ReactMarkdown>
              </div>
            );
          }
          if (part.type === "dynamic-tool") {
            return (
              <ToolResultCard key={i} part={part as DynamicToolUIPart} />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const sendSuggestion = (question: string) => {
    sendMessage({ text: question });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-1">
              <p className="text-gray-300 text-base font-medium">
                Ask me anything about your finances
              </p>
              <p className="text-gray-500 text-sm">
                I can look up your real spending data, net worth, and
                transactions.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendSuggestion(q)}
                  className="text-left text-sm p-3 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && <TypingIndicator />}
      </div>

      <div className="border-t border-gray-800 px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-white text-black px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-200 transition-colors shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
