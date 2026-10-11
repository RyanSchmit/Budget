"use client";

import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import type { RootState } from "@/lib/store/store";

const LINK_CLASS =
  "text-sm font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50 px-3 py-1 rounded";

export default function Navbar() {
  const advisorEnabled = useSelector(
    (state: RootState) =>
      state.preferences.preferences?.enable_ai_advisor ?? true,
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image
                src="/logo/wealthpath-logo.png"
                alt="WealthPath"
                width={200}
                height={10}
                className="dark:invert max-h-20 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <nav aria-label="Primary" className="flex items-center gap-4">
              <Link href="/goals" className={LINK_CLASS}>
                Goals
              </Link>
              <Link href="/transactions" className={LINK_CLASS}>
                Transactions
              </Link>
              <Link href="/insights" className={LINK_CLASS}>
                Insights
              </Link>
              <Link href="/net-worth" className={LINK_CLASS}>
                Net Worth
              </Link>
              {advisorEnabled && (
                <Link href="/advisor" className={LINK_CLASS}>
                  AI Advisor
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-4 ml-4">
              <Link
                href="/profile"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-100 underline-offset-2 hover:underline"
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
