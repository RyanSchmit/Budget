"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import type { RootState } from "@/lib/store/store";
import Chat from "./Chat";

export default function AdvisorGate() {
  const { preferences, status } = useSelector(
    (state: RootState) => state.preferences,
  );

  // While preferences are still loading, show the chat (avoids flash of disabled state).
  // The backend will enforce the flag regardless.
  if (status === "loading" || status === "idle") {
    return <Chat />;
  }

  if (preferences && !preferences.enable_ai_advisor) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-2xl">
          🔒
        </div>
        <h2 className="text-lg font-semibold text-gray-200">
          AI Advisor is disabled
        </h2>
        <p className="text-sm text-gray-400 max-w-sm">
          You&apos;ve turned off the AI Advisor in your preferences. Enable it
          to start a conversation.
        </p>
        <Link
          href="/profile"
          className="mt-2 px-4 py-2 text-sm font-medium rounded bg-white text-gray-900 hover:bg-gray-100 transition-colors"
        >
          Go to Profile Settings
        </Link>
      </div>
    );
  }

  return <Chat />;
}
