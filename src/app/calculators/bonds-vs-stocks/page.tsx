"use client";

import { useState, useMemo } from "react";
import Navbar from "@/app/Navbar";

export default function BondsVsStocksSimulator() {
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [stockAllocation, setStockAllocation] = useState(60);
  const [years, setYears] = useState(20);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [stockReturn, setStockReturn] = useState(10);
  const [bondReturn, setBondReturn] = useState(4);
  const [stockVolatility, setStockVolatility] = useState(15);
  const [bondVolatility, setBondVolatility] = useState(5);

  const bondAllocation = 100 - stockAllocation;

  // Generate random returns based on expected return and volatility
  const generateReturns = (
    expectedReturn: number,
    volatility: number,
    years: number,
  ) => {
    const returns = [];
    for (let i = 0; i < years; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const randStdNormal =
        Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const annualReturn = expectedReturn + volatility * randStdNormal;
      returns.push(annualReturn);
    }
    return returns;
  };

  const simulatePortfolio = useMemo(() => {
    const stockReturns = generateReturns(stockReturn, stockVolatility, years);
    const bondReturns = generateReturns(bondReturn, bondVolatility, years);

    let portfolioValue = initialInvestment;
    const yearlyValues = [
      {
        year: 0,
        value: initialInvestment,
        stocks: (initialInvestment * stockAllocation) / 100,
        bonds: (initialInvestment * bondAllocation) / 100,
      },
    ];

    for (let year = 1; year <= years; year++) {
      const stockPortionReturn = stockReturns[year - 1] / 100;
      const bondPortionReturn = bondReturns[year - 1] / 100;

      // Calculate returns on current holdings
      const stockValue =
        ((portfolioValue * stockAllocation) / 100) * (1 + stockPortionReturn);
      const bondValue =
        ((portfolioValue * bondAllocation) / 100) * (1 + bondPortionReturn);

      portfolioValue = stockValue + bondValue;

      // Add monthly contributions (simplified as annual)
      const annualContribution = monthlyContribution * 12;
      portfolioValue += annualContribution;

      yearlyValues.push({
        year,
        value: portfolioValue,
        stocks: (portfolioValue * stockAllocation) / 100,
        bonds: (portfolioValue * bondAllocation) / 100,
      });
    }

    return yearlyValues;
  }, [
    initialInvestment,
    stockAllocation,
    bondAllocation,
    years,
    monthlyContribution,
    stockReturn,
    bondReturn,
    stockVolatility,
    bondVolatility,
  ]);

  const finalValue =
    simulatePortfolio[simulatePortfolio.length - 1]?.value || 0;
  const totalContributed = initialInvestment + monthlyContribution * 12 * years;
  const totalGain = finalValue - totalContributed;
  const totalReturn = (finalValue / totalContributed - 1) * 100;

  // Calculate max and min values for chart scaling
  const maxValue = Math.max(...simulatePortfolio.map((d) => d.value));
  const chartHeight = 300;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            Bonds vs. Stocks Simulator
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Simulate portfolio growth with different stock and bond allocations
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Investment Settings
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Initial Investment: ${initialInvestment.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="1000"
                      max="100000"
                      step="1000"
                      value={initialInvestment}
                      onChange={(e) =>
                        setInitialInvestment(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Monthly Contribution: $
                      {monthlyContribution.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      step="50"
                      value={monthlyContribution}
                      onChange={(e) =>
                        setMonthlyContribution(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Time Horizon: {years} years
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="40"
                      step="1"
                      value={years}
                      onChange={(e) => setYears(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Asset Allocation
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Stocks: {stockAllocation}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={stockAllocation}
                      onChange={(e) =>
                        setStockAllocation(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Bonds: {bondAllocation}%
                    </label>
                    <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${bondAllocation}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Stocks
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-black dark:text-white">
                        {stockAllocation}%
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Bonds
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-black dark:text-white">
                        {bondAllocation}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Expected Returns & Risk
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Stock Expected Return: {stockReturn}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.5"
                      value={stockReturn}
                      onChange={(e) => setStockReturn(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Stock Volatility: {stockVolatility}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={stockVolatility}
                      onChange={(e) =>
                        setStockVolatility(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Bond Expected Return: {bondReturn}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={bondReturn}
                      onChange={(e) => setBondReturn(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Bond Volatility: {bondVolatility}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="1"
                      value={bondVolatility}
                      onChange={(e) =>
                        setBondVolatility(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Projected Results
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white dark:bg-black p-4 rounded-lg">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      Final Value
                    </div>
                    <div className="text-2xl font-bold text-black dark:text-white">
                      $
                      {finalValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-black p-4 rounded-lg">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      Total Gain
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      $
                      {totalGain.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-black p-4 rounded-lg">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      Total Contributed
                    </div>
                    <div className="text-2xl font-bold text-black dark:text-white">
                      $
                      {totalContributed.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-black p-4 rounded-lg">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      Total Return
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {totalReturn.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-white dark:bg-black p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-4">
                    Portfolio Growth Over Time
                  </h3>

                  <div className="relative" style={{ height: chartHeight }}>
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-zinc-500 pr-2">
                      <span>
                        $
                        {maxValue.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <span>
                        $
                        {(maxValue * 0.5).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <span>$0</span>
                    </div>

                    {/* Chart area */}
                    <div className="absolute left-12 right-0 top-0 bottom-8 border-l border-b border-zinc-200 dark:border-zinc-700">
                      {/* Stacked area chart */}
                      <svg className="w-full h-full" preserveAspectRatio="none">
                        {/* Bonds area (bottom) */}
                        <path
                          d={
                            simulatePortfolio
                              .map((d, i) => {
                                const x =
                                  (i / (simulatePortfolio.length - 1)) * 100;
                                const y = 100 - (d.bonds / maxValue) * 100;
                                return `${i === 0 ? "M" : "L"} ${x}% ${y}%`;
                              })
                              .join(" ") + ` L 100% 100% L 0% 100% Z`
                          }
                          fill="rgb(59, 130, 246)"
                          opacity="0.6"
                        />

                        {/* Total value line */}
                        <path
                          d={simulatePortfolio
                            .map((d, i) => {
                              const x =
                                (i / (simulatePortfolio.length - 1)) * 100;
                              const y = 100 - (d.value / maxValue) * 100;
                              return `${i === 0 ? "M" : "L"} ${x}% ${y}%`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="rgb(34, 197, 94)"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>

                    {/* X-axis labels */}
                    <div className="absolute left-12 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
                      <span>0</span>
                      <span>{Math.floor(years / 2)}</span>
                      <span>{years} years</span>
                    </div>
                  </div>

                  <div className="flex gap-4 justify-center mt-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Total Value
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Bonds
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> This simulation uses randomly generated
                  returns based on your expected return and volatility settings.
                  Actual investment results will vary. Past performance does not
                  guarantee future results. Consider consulting a financial
                  advisor for personalized investment advice.
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-black dark:text-white mb-2">
                  Common Allocations
                </h3>
                <div className="space-y-2 text-sm">
                  <button
                    onClick={() => setStockAllocation(20)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-white dark:hover:bg-black transition-colors"
                  >
                    <span className="font-medium">Conservative (20/80):</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {" "}
                      Low risk, steady growth
                    </span>
                  </button>
                  <button
                    onClick={() => setStockAllocation(40)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-white dark:hover:bg-black transition-colors"
                  >
                    <span className="font-medium">Moderate (40/60):</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {" "}
                      Balanced approach
                    </span>
                  </button>
                  <button
                    onClick={() => setStockAllocation(60)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-white dark:hover:bg-black transition-colors"
                  >
                    <span className="font-medium">Growth (60/40):</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {" "}
                      Higher growth potential
                    </span>
                  </button>
                  <button
                    onClick={() => setStockAllocation(80)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-white dark:hover:bg-black transition-colors"
                  >
                    <span className="font-medium">Aggressive (80/20):</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {" "}
                      Maximum growth, higher risk
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
