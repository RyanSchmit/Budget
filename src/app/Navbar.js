import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Image
              src="/logo/wealthpath-logo.png"
              alt="WealthPath"
              width={200}
              height={100}
              className="dark:invert max-h-50 w-auto object-contain"
            />
          </Link>
        </div>

        <nav aria-label="Primary" className="flex items-center gap-4">
          <a
            href="transactions"
            className="text-sm font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50 px-3 py-1 rounded"
            aria-current="page"
          >
            Transactions
          </a>
          <a
            href="goals"
            className="text-sm font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50 px-3 py-1 rounded"
          >
            Goals
          </a>
          <a
            href="net-worth"
            className="text-sm font-medium text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-zinc-50 px-3 py-1 rounded"
          >
            Net Worth
          </a>
        </nav>
      </div>
    </div>
  </nav>;
}
