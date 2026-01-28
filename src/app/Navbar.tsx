'use client'

import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

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
            {!loading && user && (
              <nav aria-label="Primary" className="flex items-center gap-4">
                <Link
                  href="/transactions"
                  className="text-sm font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50 px-3 py-1 rounded"
                >
                  Transactions
                </Link>
                <Link
                  href="/insights"
                  className="text-sm font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50 px-3 py-1 rounded"
                >
                  Insights
                </Link>
                <Link
                  href="/goals"
                  className="text-sm font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50 px-3 py-1 rounded"
                >
                  Goals
                </Link>
                <Link
                  href="/net-worth"
                  className="text-sm font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50 px-3 py-1 rounded"
                >
                  Net Worth
                </Link>
              </nav>
            )}

            <div className="flex items-center gap-4 ml-4">
              {loading ? (
                <div className="text-sm text-zinc-400">Loading...</div>
              ) : user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50 px-3 py-1 rounded"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    href="/auth/sign-in"
                    className="text-sm font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50 px-3 py-1 rounded"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="text-sm font-medium bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
