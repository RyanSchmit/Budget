import Navbar from "../Navbar";
import { transactions } from "../transactions";
import CategoryPieChart from "../insights/PieChart";

export default function Home() {
  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex w-full flex-col items-center justify-center gap-8 bg-black">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <CategoryPieChart transactions={transactions} />
        </div>
      </main>
    </div>
  );
}
