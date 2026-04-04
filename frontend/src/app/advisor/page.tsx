import { Suspense } from "react";
import Navbar from "@/app/Navbar";
import AdvisorGate from "./AdvisorGate";

export const metadata = {
  title: "AI Advisor — WealthPath",
};

export default function AdvisorPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <div className="flex flex-col mx-auto max-w-3xl h-screen pt-20">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-4 pt-6 pb-2 shrink-0">
            <h1 className="text-2xl font-semibold">AI Financial Advisor</h1>
            <p className="text-sm text-gray-400 mt-1">
              Powered by GPT-4o mini · Has access to your real financial data
            </p>
          </div>

          <div className="flex-1 min-h-0 border border-gray-800 rounded-xl mx-4 mb-4 overflow-hidden flex flex-col">
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                  Loading…
                </div>
              }
            >
              <AdvisorGate />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
