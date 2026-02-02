"use client";

import { useState } from "react";
import Navbar from "@/app/Navbar";

export default function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(200);
  const [annualRate, setAnnualRate] = useState(7);
  const [years, setYears] = useState(30);
  const [compoundFrequency, setCompoundFrequency] = useState(12); // Monthly

  const calculateCompoundInterest = () => {
    const r = annualRate / 100;
    const n = compoundFrequency;
    const t = years;
    const P = principal;
    const PMT = monthlyContribution;

    // Future value with compound interest and regular contributions
    const futureValuePrincipal = P * Math.pow(1 + r / n, n * t);
    const futureValueContributions =
      PMT * ((Math.pow(1 + r / n, n * t) - 1) / (r / n)) * (n / 12);

    const totalValue = futureValuePrincipal + futureValueContributions;
    const totalContributed = P + PMT * 12 * t;
    const totalInterest = totalValue - totalContributed;

    return { totalValue, totalContributed, totalInterest };
  };

  const generateYearlyBreakdown = () => {
    const r = annualRate / 100;
    const n = compoundFrequency;
    const P = principal;
    const PMT = monthlyContribution;

    const breakdown = [];

    for (let year = 0; year <= years; year++) {
      const t = year;
      const futureValuePrincipal = P * Math.pow(1 + r / n, n * t);
      const futureValueContributions =
        year > 0
          ? PMT * ((Math.pow(1 + r / n, n * t) - 1) / (r / n)) * (n / 12)
          : 0;

      const totalValue = futureValuePrincipal + futureValueContributions;
      const totalContributed = P + PMT * 12 * year;
      const totalInterest = totalValue - totalContributed;

      breakdown.push({
        year,
        totalValue,
        totalContributed,
        totalInterest,
      });
    }

    return breakdown;
  };

  const results = calculateCompoundInterest();
  const yearlyData = generateYearlyBreakdown();
  const maxValue = Math.max(...yearlyData.map((d) => d.totalValue));
  const chartHeight = 300;

  const frequencyOptions = [
    { value: 1, label: "Annually" },
    { value: 4, label: "Quarterly" },
    { value: 12, label: "Monthly" },
    { value: 365, label: "Daily" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            Compound Interest Calculator
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            See how your money grows over time with compound interest
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Investment Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Initial Investment: ${principal.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100000"
                      step="1000"
                      value={principal}
                      onChange={(e) => setPrincipal(Number(e.target.value))}
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
                      Annual Interest Rate: {annualRate}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.5"
                      value={annualRate}
                      onChange={(e) => setAnnualRate(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Time Period: {years} years
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={years}
                      onChange={(e) => setYears(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Compound Frequency
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {frequencyOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setCompoundFrequency(option.value)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            compoundFrequency === option.value
                              ? "bg-black dark:bg-white text-white dark:text-black"
                              : "bg-white dark:bg-black text-black dark:text-white border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Summary
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Total Contributions
                    </span>
                    <span className="font-semibold text-black dark:text-white">
                      $
                      {results.totalContributed.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Total Interest Earned
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      $
                      {results.totalInterest.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-black dark:text-white">
                        Final Balance
                      </span>
                      <span className="text-2xl font-bold text-black dark:text-white">
                        $
                        {results.totalValue.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  The Power of Compound Interest
                </h3>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Your interest earns{" "}
                  {results.totalInterest > results.totalContributed - principal
                    ? "more than"
                    : "interest on"}{" "}
                  your contributions! That's{" "}
                  <strong>
                    {(
                      (results.totalInterest / results.totalContributed) *
                      100
                    ).toFixed(1)}
                    %
                  </strong>{" "}
                  of your total contributions earned as interest.
                </p>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Growth Breakdown
                </h2>

                {/* Pie Chart Representation */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      {/* Principal */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="20"
                        strokeDasharray={`${
                          (principal / results.totalValue) * 251.2
                        } 251.2`}
                      />
                      {/* Contributions */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgb(168, 85, 247)"
                        strokeWidth="20"
                        strokeDasharray={`${
                          ((results.totalContributed - principal) /
                            results.totalValue) *
                          251.2
                        } 251.2`}
                        strokeDashoffset={`-${
                          (principal / results.totalValue) * 251.2
                        }`}
                      />
                      {/* Interest */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgb(34, 197, 94)"
                        strokeWidth="20"
                        strokeDasharray={`${
                          (results.totalInterest / results.totalValue) * 251.2
                        } 251.2`}
                        strokeDashoffset={`-${
                          (results.totalContributed / results.totalValue) *
                          251.2
                        }`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-black dark:text-white">
                          {years}
                        </div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          years
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        Initial Investment
                      </span>
                    </div>
                    <span className="font-medium text-black dark:text-white">
                      ${principal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        Contributions
                      </span>
                    </div>
                    <span className="font-medium text-black dark:text-white">
                      $
                      {(results.totalContributed - principal).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 0 },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        Interest Earned
                      </span>
                    </div>
                    <span className="font-medium text-black dark:text-white">
                      $
                      {results.totalInterest.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Growth Over Time
                </h2>

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
                  <div className="absolute left-16 right-0 top-0 bottom-8 border-l border-b border-zinc-200 dark:border-zinc-700">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      {/* Total contributions area */}
                      <path
                        d={
                          yearlyData
                            .map((d, i) => {
                              const x = (i / (yearlyData.length - 1)) * 100;
                              const y =
                                100 - (d.totalContributed / maxValue) * 100;
                              return `${i === 0 ? "M" : "L"} ${x}% ${y}%`;
                            })
                            .join(" ") + ` L 100% 100% L 0% 100% Z`
                        }
                        fill="rgb(59, 130, 246)"
                        opacity="0.6"
                      />

                      {/* Total value line */}
                      <path
                        d={yearlyData
                          .map((d, i) => {
                            const x = (i / (yearlyData.length - 1)) * 100;
                            const y = 100 - (d.totalValue / maxValue) * 100;
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
                  <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
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
                      Contributions
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Key Milestones
                </h2>

                <div className="space-y-3">
                  {[5, 10, 15, 20, 25, 30]
                    .filter((y) => y <= years)
                    .slice(-4)
                    .map((year) => {
                      const data = yearlyData[year];
                      return (
                        <div
                          key={year}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-zinc-600 dark:text-zinc-400">
                            Year {year}
                          </span>
                          <span className="font-semibold text-black dark:text-white">
                            $
                            {data?.totalValue.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
