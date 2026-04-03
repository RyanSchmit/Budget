import Navbar from "./Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex w-full flex-col items-center justify-center gap-8 bg-black">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl">
            A Simple, Secure, and Free Expense Tracker
          </h1>
          <p className="mt-4 text-lg sm:text-xl lg:text-2xl text-zinc-400">
            Track your expenses without banking integration. Your data stays
            private and secure.
          </p>
        </div>
      </main>
    </div>
  );
}
