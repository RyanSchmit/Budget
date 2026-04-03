"use client";

import { useState } from "react";
import Navbar from "@/app/Navbar";

export default function RentVsBuyCalculator() {
  const [homePrice, setHomePrice] = useState(400000);
  const [downPayment, setDownPayment] = useState(80000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [propertyTax, setPropertyTax] = useState(1.2);
  const [hoa, setHoa] = useState(200);
  const [maintenance, setMaintenance] = useState(1);
  const [homeAppreciation, setHomeAppreciation] = useState(3);
  const [monthlyRent, setMonthlyRent] = useState(2000);
  const [rentIncrease, setRentIncrease] = useState(3);
  const [investmentReturn, setInvestmentReturn] = useState(7);
  const [years, setYears] = useState(10);

  const calculateMortgage = () => {
    const principal = homePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;
    const monthlyPayment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    return monthlyPayment;
  };

  const calculateBuyCost = () => {
    const monthlyMortgage = calculateMortgage();
    const monthlyPropertyTax = (homePrice * (propertyTax / 100)) / 12;
    const monthlyMaintenance = (homePrice * (maintenance / 100)) / 12;
    const monthlyTotal =
      monthlyMortgage + monthlyPropertyTax + hoa + monthlyMaintenance;

    let totalCost = downPayment;
    let currentHomeValue = homePrice;

    for (let year = 1; year <= years; year++) {
      totalCost += monthlyTotal * 12;
      currentHomeValue *= 1 + homeAppreciation / 100;
    }

    const equity = currentHomeValue;
    const netCost = totalCost - equity;

    return { totalCost, equity, netCost, monthlyPayment: monthlyTotal };
  };

  const calculateRentCost = () => {
    let totalCost = 0;
    let currentRent = monthlyRent;
    let investmentValue = downPayment;

    for (let year = 1; year <= years; year++) {
      totalCost += currentRent * 12;
      investmentValue *= 1 + investmentReturn / 100;
      currentRent *= 1 + rentIncrease / 100;
    }

    const netCost = totalCost - investmentValue;

    return { totalCost, investmentValue, netCost, monthlyPayment: monthlyRent };
  };

  const buyResults = calculateBuyCost();
  const rentResults = calculateRentCost();
  const difference = rentResults.netCost - buyResults.netCost;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            Rent vs Buy Calculator
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Compare the long-term costs of renting versus buying a home
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              {/* Buy Inputs */}
              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Home Purchase
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Home Price: ${homePrice.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="100000"
                      max="2000000"
                      step="10000"
                      value={homePrice}
                      onChange={(e) => setHomePrice(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Down Payment: ${downPayment.toLocaleString()} (
                      {((downPayment / homePrice) * 100).toFixed(1)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={homePrice * 0.5}
                      step="5000"
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Interest Rate: {interestRate}%
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="10"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Loan Term: {loanTerm} years
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="30"
                      step="5"
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Property Tax Rate: {propertyTax}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.1"
                      value={propertyTax}
                      onChange={(e) => setPropertyTax(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Monthly HOA: ${hoa}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="50"
                      value={hoa}
                      onChange={(e) => setHoa(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Maintenance: {maintenance}% annually
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.1"
                      value={maintenance}
                      onChange={(e) => setMaintenance(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Home Appreciation: {homeAppreciation}% annually
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={homeAppreciation}
                      onChange={(e) =>
                        setHomeAppreciation(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Rent Inputs */}
              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Renting
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Monthly Rent: ${monthlyRent.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="100"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Annual Rent Increase: {rentIncrease}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={rentIncrease}
                      onChange={(e) => setRentIncrease(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Investment Return: {investmentReturn}% annually
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.5"
                      value={investmentReturn}
                      onChange={(e) =>
                        setInvestmentReturn(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Timeline
                </h2>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Years to Compare: {years}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
                  Comparison Results (After {years} Years)
                </h2>

                <div className="space-y-6">
                  {/* Buy Results */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-lg text-black dark:text-white mb-2">
                      Buying
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Monthly Payment:
                        </span>
                        <span className="font-medium text-black dark:text-white">
                          ${buyResults.monthlyPayment.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Total Paid:
                        </span>
                        <span className="font-medium text-black dark:text-white">
                          $
                          {buyResults.totalCost.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Home Equity:
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          $
                          {buyResults.equity.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                        <span className="text-zinc-600 dark:text-zinc-400 font-semibold">
                          Net Cost:
                        </span>
                        <span className="font-bold text-black dark:text-white">
                          $
                          {buyResults.netCost.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rent Results */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-semibold text-lg text-black dark:text-white mb-2">
                      Renting
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Starting Monthly Rent:
                        </span>
                        <span className="font-medium text-black dark:text-white">
                          ${rentResults.monthlyPayment.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Total Rent Paid:
                        </span>
                        <span className="font-medium text-black dark:text-white">
                          $
                          {rentResults.totalCost.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Investments:
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          $
                          {rentResults.investmentValue.toLocaleString(
                            undefined,
                            { maximumFractionDigits: 0 },
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                        <span className="text-zinc-600 dark:text-zinc-400 font-semibold">
                          Net Cost:
                        </span>
                        <span className="font-bold text-black dark:text-white">
                          $
                          {rentResults.netCost.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Winner */}
                  <div className="bg-white dark:bg-black p-4 rounded-lg border-2 border-green-500">
                    <h3 className="font-semibold text-lg text-black dark:text-white mb-2">
                      Recommendation
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                      {difference > 0 ? (
                        <>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            Buying is better
                          </span>{" "}
                          by{" "}
                          <span className="font-bold">
                            $
                            {Math.abs(difference).toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            Renting is better
                          </span>{" "}
                          by{" "}
                          <span className="font-bold">
                            $
                            {Math.abs(difference).toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      This assumes you invest the down payment if renting, and
                      factors in home appreciation and investment returns.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> This calculator provides estimates for
                  comparison purposes. Actual costs may vary based on location,
                  market conditions, and personal circumstances. Consider
                  consulting a financial advisor for personalized advice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
