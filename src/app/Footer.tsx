"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-sm font-semibold text-black dark:text-white mb-4">
              WealthPath
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Build wealth with intention. Track expenses and achieve your
              financial goals.
            </p>
          </div>

          {/* Calculators Section */}
          <div>
            <h3 className="text-sm font-semibold text-black dark:text-white mb-4">
              Calculators
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/calculators/rent-vs-buy"
                  className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Rent vs Buy Calculator
                </Link>
              </li>
              <li>
                <Link
                  href="/calculators/bonds-vs-stocks"
                  className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Bonds vs. Stocks Simulator
                </Link>
              </li>
              <li>
                <Link
                  href="/calculators/compound-interest"
                  className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Compound Interest Calculator
                </Link>
              </li>
              <li>
                <Link
                  href="/calculators/car-depreciation"
                  className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Car Depreciation Graph
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Section */}
          <div>
            <h3 className="text-sm font-semibold text-black dark:text-white mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/transactions"
                  className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Transactions
                </Link>
              </li>
              <li>
                <Link
                  href="/insights"
                  className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Insights
                </Link>
              </li>
              <li>
                <Link
                  href="/goals"
                  className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Goals
                </Link>
              </li>
              <li>
                <Link
                  href="/net-worth"
                  className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Net Worth
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div>
            <h3 className="text-sm font-semibold text-black dark:text-white mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            © {new Date().getFullYear()} WealthPath. Manage your money simply
            and achieve more.
          </p>
        </div>
      </div>
    </footer>
  );
}
