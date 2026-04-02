"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  type AdvisorMessage,
  listAdvisorConversations,
  createAdvisorConversation,
  getAdvisorMessages,
  sendAdvisorMessage,
} from "@/lib/api/client";

const SUGGESTED_QUESTIONS = [
  "What did I spend the most on last month?",
  "How is my net worth trending?",
  "Show me my recent transactions",
  "Where can I cut back on spending?",
  "How should I build an emergency fund?",
  "What's the 50/30/20 budgeting rule?",
];

function MessageBubble({ message }: { message: AdvisorMessage }) {
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
        <div
          className={`prose prose-sm max-w-none ${
            isUser
              ? "prose-neutral"
              : "prose-invert prose-p:text-gray-200 prose-li:text-gray-200 prose-strong:text-white prose-headings:text-white"
          }`}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
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
  const searchParams = useSearchParams();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optimisticIdRef = useRef<string | null>(null);
  const prefillHandledRef = useRef(false);

  // Pre-fill from ?q= param (e.g. when navigating from Goals page)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !prefillHandledRef.current) {
      setInput(decodeURIComponent(q));
    }
  }, [searchParams]);

  useEffect(() => {
    listAdvisorConversations()
      .then(async ({ conversations }) => {
        const recent = conversations[0];
        let id: string;
        if (recent) {
          id = recent.id;
          setConversationId(id);
          const { messages: history } = await getAdvisorMessages(id);
          setMessages(history ?? []);
        } else {
          const { conversation } = await createAdvisorConversation();
          id = conversation.id;
          setConversationId(id);
        }
        // Auto-submit pre-filled question from ?q= param
        const q = searchParams.get("q");
        if (q && !prefillHandledRef.current) {
          prefillHandledRef.current = true;
          const decoded = decodeURIComponent(q);
          setInput("");
          await submitMessageWithId(id, decoded);
        }
      })
      .catch((err) => {
        console.error("Advisor init error:", err);
        setError("Failed to load conversation. Please refresh.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitMessageWithId = async (convId: string, text: string) => {
    if (!text.trim() || isLoading) return;

    const optimisticId = `optimistic-${Date.now()}`;
    optimisticIdRef.current = optimisticId;

    const optimisticMessage: AdvisorMessage = {
      id: optimisticId,
      conversation_id: convId,
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const { user_message, assistant_message } = await sendAdvisorMessage(
        convId,
        text.trim(),
      );
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== optimisticId)
          .concat([user_message, assistant_message]),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitMessage = async (text: string) => {
    if (!conversationId) return;
    await submitMessageWithId(conversationId, text);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage(input);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && !isLoading && (
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
                  onClick={() => submitMessage(q)}
                  disabled={!conversationId}
                  className="text-left text-sm p-3 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors disabled:opacity-40"
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

        {error && (
          <p className="text-center text-sm text-red-400">{error}</p>
        )}
      </div>

      <div className="border-t border-gray-800 px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask about your finances..."
            rows={1}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none overflow-hidden"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={isLoading || !conversationId}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !conversationId}
            className="bg-white text-black px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-200 transition-colors shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
