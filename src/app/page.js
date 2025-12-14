import Navbar from "./Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <Navbar />

      <main className="pt-20 flex min-h-screen w-full flex-col items-center gap-8 bg-black">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Content */}
        </div>

        <footer className="w-full text-center text-sm text-zinc-400">
          Manage your money simply and achieve more.
        </footer>
      </main>
    </div>
  );
}
