"use client";

import { useState } from "react";
import Navbar from "@/app/Navbar";

export default function CarDepreciationGraph() {
  const [purchasePrice, setPurchasePrice] = useState(35000);
  const [carAge, setCarAge] = useState(0);
  const [years, setYears] = useState(10);
  const [mileagePerYear, setMileagePerYear] = useState(12000);
  const [condition, setCondition] = useState<"excellent" | "good" | "fair">(
    "good",
  );

  // Depreciation rates based on condition and typical car depreciation curves
  const depreciationRates = {
    excellent: {
      year1: 0.2, // 20% first year
      year2: 0.15, // 15% second year
      year3: 0.1, // 10% third year
      yearlyAfter: 0.08, // 8% per year after
    },
    good: {
      year1: 0.25,
      year2: 0.18,
      year3: 0.12,
      yearlyAfter: 0.1,
    },
    fair: {
      year1: 0.3,
      year2: 0.22,
      year3: 0.15,
      yearlyAfter: 0.12,
    },
  };

  const calculateDepreciation = () => {
    const rates = depreciationRates[condition];
    const data = [];
    let currentValue = purchasePrice;

    // Account for initial age
    for (let i = 0; i < carAge; i++) {
      if (i === 0) currentValue *= 1 - rates.year1;
      else if (i === 1) currentValue *= 1 - rates.year2;
      else if (i === 2) currentValue *= 1 - rates.year3;
      else currentValue *= 1 - rates.yearlyAfter;
    }

    // Add starting point
    data.push({
      year: carAge,
      age: carAge,
      value: currentValue,
      mileage: carAge * mileagePerYear,
      percentLost: ((purchasePrice - currentValue) / purchasePrice) * 100,
    });

    // Calculate future depreciation
    for (let i = 1; i <= years; i++) {
      const totalAge = carAge + i;
      let depreciationRate;

      if (totalAge === 1) depreciationRate = rates.year1;
      else if (totalAge === 2) depreciationRate = rates.year2;
      else if (totalAge === 3) depreciationRate = rates.year3;
      else depreciationRate = rates.yearlyAfter;

      currentValue *= 1 - depreciationRate;

      data.push({
        year: totalAge,
        age: totalAge,
        value: Math.max(currentValue, purchasePrice * 0.05), // Minimum 5% residual value
        mileage: totalAge * mileagePerYear,
        percentLost: ((purchasePrice - currentValue) / purchasePrice) * 100,
      });
    }

    return data;
  };

  const depreciationData = calculateDepreciation();
  const currentValue = depreciationData[0].value;
  const futureValue = depreciationData[depreciationData.length - 1].value;
  const totalDepreciation = purchasePrice - futureValue;
  const annualDepreciation = totalDepreciation / years;

  const maxValue = purchasePrice;
  const chartHeight = 400;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            Car Depreciation Calculator
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Visualize how your car's value decreases over time
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Vehicle Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Purchase Price: ${purchasePrice.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="5000"
                      max="100000"
                      step="1000"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Current Age: {carAge} {carAge === 1 ? "year" : "years"}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={carAge}
                      onChange={(e) => setCarAge(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                      {carAge === 0
                        ? "Brand new car"
                        : `Car is ${carAge} ${
                            carAge === 1 ? "year" : "years"
                          } old`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Years to Project: {years}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={years}
                      onChange={(e) => setYears(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Miles Per Year: {mileagePerYear.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="5000"
                      max="30000"
                      step="1000"
                      value={mileagePerYear}
                      onChange={(e) =>
                        setMileagePerYear(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Vehicle Condition
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["excellent", "good", "fair"] as const).map((cond) => (
                        <button
                          key={cond}
                          onClick={() => setCondition(cond)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                            condition === cond
                              ? "bg-black dark:bg-white text-white dark:text-black"
                              : "bg-white dark:bg-black text-black dark:text-white border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          }`}
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                      {condition === "excellent" &&
                        "Well-maintained, no accidents, regular service"}
                      {condition === "good" &&
                        "Normal wear and tear, maintained regularly"}
                      {condition === "fair" &&
                        "Some visible wear, irregular maintenance"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Current Summary
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Purchase Price
                    </span>
                    <span className="font-semibold text-black dark:text-white">
                      ${purchasePrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Current Value
                    </span>
                    <span className="font-semibold text-black dark:text-white">
                      $
                      {currentValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Current Age
                    </span>
                    <span className="font-semibold text-black dark:text-white">
                      {carAge} {carAge === 1 ? "year" : "years"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Current Mileage
                    </span>
                    <span className="font-semibold text-black dark:text-white">
                      {(carAge * mileagePerYear).toLocaleString()} miles
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Depreciation Facts
                </h3>
                <ul className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
                  <li>• Cars lose 20-30% of value in the first year</li>
                  <li>• By year 5, most cars lose 60% of their value</li>
                  <li>• High mileage accelerates depreciation</li>
                  <li>• Luxury brands often depreciate faster</li>
                </ul>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Depreciation Projection
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white dark:bg-black p-4 rounded-lg">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      Value in {years} Years
                    </div>
                    <div className="text-2xl font-bold text-black dark:text-white">
                      $
                      {futureValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-black p-4 rounded-lg">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      Total Depreciation
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      $
                      {totalDepreciation.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-black p-4 rounded-lg">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      Value Retained
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {((futureValue / purchasePrice) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="bg-white dark:bg-black p-4 rounded-lg">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      Avg. Annual Loss
                    </div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      $
                      {annualDepreciation.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                </div>

                {/* Depreciation Chart */}
                <div className="bg-white dark:bg-black p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-4">
                    Value Over Time
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
                    <div className="absolute left-14 right-0 top-0 bottom-8 border-l border-b border-zinc-200 dark:border-zinc-700">
                      <svg className="w-full h-full" preserveAspectRatio="none">
                        {/* Depreciation area */}
                        <path
                          d={
                            depreciationData
                              .map((d, i) => {
                                const x =
                                  (i / (depreciationData.length - 1)) * 100;
                                const y = 100 - (d.value / maxValue) * 100;
                                return `${i === 0 ? "M" : "L"} ${x}% ${y}%`;
                              })
                              .join(" ") + ` L 100% 100% L 0% 100% Z`
                          }
                          fill="rgb(239, 68, 68)"
                          opacity="0.2"
                        />

                        {/* Value line */}
                        <path
                          d={depreciationData
                            .map((d, i) => {
                              const x =
                                (i / (depreciationData.length - 1)) * 100;
                              const y = 100 - (d.value / maxValue) * 100;
                              return `${i === 0 ? "M" : "L"} ${x}% ${y}%`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="rgb(239, 68, 68)"
                          strokeWidth="3"
                        />

                        {/* Data points */}
                        {depreciationData.map((d, i) => {
                          const x = (i / (depreciationData.length - 1)) * 100;
                          const y = 100 - (d.value / maxValue) * 100;
                          return (
                            <circle
                              key={i}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="2"
                              fill="rgb(239, 68, 68)"
                            />
                          );
                        })}
                      </svg>
                    </div>

                    {/* X-axis labels */}
                    <div className="absolute left-14 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
                      <span>Year {carAge}</span>
                      <span>Year {carAge + Math.floor(years / 2)}</span>
                      <span>Year {carAge + years}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Year-by-Year Breakdown
                </h2>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {depreciationData.slice(0, 11).map((data, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-white dark:bg-black rounded text-sm"
                    >
                      <div>
                        <div className="font-medium text-black dark:text-white">
                          Year {data.age}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-500">
                          {data.mileage.toLocaleString()} miles
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-black dark:text-white">
                          $
                          {data.value.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400">
                          -{data.percentLost.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Tips to Minimize Depreciation
                </h3>
                <ul className="text-sm text-yellow-900 dark:text-yellow-100 space-y-1">
                  <li>• Keep mileage low when possible</li>
                  <li>• Maintain regular service records</li>
                  <li>• Keep the vehicle clean and well-maintained</li>
                  <li>• Avoid modifications that reduce resale value</li>
                  <li>• Choose popular colors and trim levels</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
