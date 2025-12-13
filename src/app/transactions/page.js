import Navbar from "../Navbar";

export default function Transactions() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 font-sans dark:bg-black">
      <Navbar />

      {/* Main content (offset by header height) */}
      <main className="flex min-h-screen w-full flex-col items-center justify-start pt-20 px-0 bg-white dark:bg-black gap-8">
        <div className="max-w-7xl w-full px-4 sm:px-6 lg:px-8">
          {/* Page content goes here */}
        </div>

        <footer className="w-full text-center text-sm text-zinc-500 dark:text-zinc-400">
          Manage your money simply and achieve more.
        </footer>
      </main>
    </div>
  );
}
