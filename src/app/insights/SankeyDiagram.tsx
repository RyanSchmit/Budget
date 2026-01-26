"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { sankey } from "d3-sankey";
import { Transaction } from "../types";
import { formatMoney } from "../format";

interface CategoryPieChartProps {
  transactions: Transaction[];
}

// Map expense categories to major categories
const majorCategoryMap: Record<string, string> = {
  Restaurants: "Food & Drink",
  Groceries: "Food & Drink",
  "Energy Drink": "Food & Drink",
  Snacks: "Food & Drink",
  Bars: "Entertainment",
  "Sports Games": "Entertainment",
  Golf: "Entertainment",
  Books: "Entertainment",
  Subscriptions: "Entertainment",
  Alcohol: "Entertainment",
  Utilities: "Housing",
  Trips: "Travel",
  Transportation: "Travel",
  Gas: "Travel",
  "Online Shopping": "Shopping",
  Clothes: "Shopping",
  College: "Shopping",
  "Traffic Tickets": "Other",
  Gambling: "Other",
  Gym: "Other",
  "N/A": "Other",
};

// Categorize income by source
const getIncomeSource = (description: string): string => {
  const desc = description.toLowerCase();
  if (desc.includes("payroll") || desc.includes("salary") || desc.includes("calmatters") || desc.includes("mobile deposit") || desc.includes("interest payment")) {
    return "Salary";
  }
  if (desc.includes("venmo")) {
    return "Venmo";
  }
  if (desc.includes("paypal")) {
    return "PayPal";
  }
  if (desc.includes("zelle")) {
    return "Zelle";
  }
  if (desc.includes("ebay")) {
    return "eBay";
  }
  if (desc.includes("family") || desc.includes("support")) {
    return "Family Support";
  }
  return "Other Income";
};

const parseDate = (dateStr: string): Date => {
  const [month, day, year] = dateStr.split("-");
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

const isInRange = (dateStr: string, range: string): boolean => {
  const now = new Date();
  const txDate = parseDate(dateStr);

  if (range === "month") {
    return (
      txDate.getMonth() === now.getMonth() &&
      txDate.getFullYear() === now.getFullYear()
    );
  }

  if (range === "3months") {
    const past3Months = new Date(
      now.getFullYear(),
      now.getMonth() - 3,
      now.getDate()
    );
    return txDate >= past3Months;
  }

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return txDate >= startOfYear;
};

interface SankeyNode {
  name: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
}

interface SankeyLink {
  source: number | SankeyNode;
  target: number | SankeyNode;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
}

/** Straight-ended trapezoid between nodes (no curves). */
function sankeyLinkStraight(link: SankeyLink): string {
  const s = link.source as SankeyNode;
  const t = link.target as SankeyNode;
  const w = (link.width ?? 4) / 2;
  const sx = s.x1 ?? 0;
  const tx = t.x0 ?? 0;
  const sy0 = (link.y0 ?? 0) - w;
  const sy1 = (link.y0 ?? 0) + w;
  const ty0 = (link.y1 ?? 0) - w;
  const ty1 = (link.y1 ?? 0) + w;
  return `M${sx},${sy0} L${sx},${sy1} L${tx},${ty1} L${tx},${ty0} Z`;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export default function SankeyDiagram({
  transactions,
}: CategoryPieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [range, setRange] = useState("ytd");
  const [showAllTime, setShowAllTime] = useState(false);

  // Filter transactions
  const expensesOnly = transactions.filter((t) => t.category !== "Income");
  const incomeOnly = transactions.filter((t) => t.category === "Income");

  const filteredExpenses = expensesOnly.filter((t) =>
    showAllTime ? true : isInRange(t.date, range)
  );

  const filteredIncome = incomeOnly.filter((t) =>
    showAllTime ? true : isInRange(t.date, range)
  );

  // Process income by source
  const incomeBySource = useMemo(() => {
    return filteredIncome.reduce((acc, t) => {
      const source = getIncomeSource(t.description);
      const amount = Math.abs(t.amount);
      acc[source] = (acc[source] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredIncome]);

  const totalIncome = useMemo(() => {
    return Object.values(incomeBySource).reduce((sum, val) => sum + val, 0);
  }, [incomeBySource]);

  // Process expenses by major category
  const expensesByMajorCategory = useMemo(() => {
    return filteredExpenses.reduce((acc, t) => {
      const majorCategory = majorCategoryMap[t.category] || "Other";
      const amount = Math.abs(t.amount);
      acc[majorCategory] = (acc[majorCategory] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredExpenses]);

  // Process expenses by subcategory
  const expensesBySubcategory = useMemo(() => {
    return filteredExpenses.reduce((acc, t) => {
      const amount = Math.abs(t.amount);
      acc[t.category] = (acc[t.category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
  }, [filteredExpenses]);

  // Build Sankey data
  const data = useMemo((): SankeyData => {
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    const nodeMap = new Map<string, number>();

    // Add income source nodes
    Object.keys(incomeBySource).forEach((source) => {
      if (incomeBySource[source] > 0) {
        const idx = nodes.length;
        nodes.push({ name: source });
        nodeMap.set(source, idx);
      }
    });

    // Add total income node
    const incomeNodeIdx = nodes.length;
    nodes.push({ name: "Income" });
    nodeMap.set("Income", incomeNodeIdx);

    // Link income sources to total income
    Object.entries(incomeBySource).forEach(([source, amount]) => {
      if (amount > 0) {
        const sourceIdx = nodeMap.get(source)!;
        links.push({
          source: sourceIdx,
          target: incomeNodeIdx,
          value: amount,
        });
      }
    });

    // Add major category nodes
    const majorCategoryIndices: Record<string, number> = {};
    Object.keys(expensesByMajorCategory).forEach((category) => {
      if (expensesByMajorCategory[category] > 0) {
        const idx = nodes.length;
        nodes.push({ name: category });
        nodeMap.set(category, idx);
        majorCategoryIndices[category] = idx;

        // Link total income to major category
        links.push({
          source: incomeNodeIdx,
          target: idx,
          value: expensesByMajorCategory[category],
        });
      }
    });

    // Add subcategory nodes and link to major categories
    Object.entries(expensesBySubcategory).forEach(([subcategory, amount]) => {
      if (amount > 0) {
        const majorCategory = majorCategoryMap[subcategory] || "Other";
        if (expensesByMajorCategory[majorCategory] > 0) {
          const subcategoryIdx = nodes.length;
          nodes.push({ name: subcategory });
          nodeMap.set(subcategory, subcategoryIdx);

          const majorIdx = majorCategoryIndices[majorCategory];
          links.push({
            source: majorIdx,
            target: subcategoryIdx,
            value: amount,
          });
        }
      }
    });

    return { nodes, links };
  }, [incomeBySource, expensesByMajorCategory, expensesBySubcategory]);

  useEffect(() => {
    if (!svgRef.current) return;

    if (data.nodes.length === 0 || data.links.length === 0) return;

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth || 1200;
    const height = Math.max(600, data.nodes.length * 40);

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("style", "background: #000");

    // Create Sankey layout – space for connection areas between node columns
    const sankeyGenerator = sankey<SankeyNode, SankeyLink>()
      .nodeWidth(18)
      .nodePadding(24)
      .extent([
        [20, 10],
        [width - 20, height - 10],
      ]);

    const { nodes, links } = sankeyGenerator(data);

    // Color scale – bright colors for black background
    const linkColors = [
      "#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#f87171",
      "#60a5fa", "#c084fc", "#4ade80", "#fb923c", "#e879f9",
    ];
    const colorScale = d3.scaleOrdinal(linkColors);

    // Draw links (straight-ended trapezoids between nodes, no curves)
    const link = svg
      .append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", (d: SankeyLink) => sankeyLinkStraight(d))
      .attr("fill", (d: SankeyLink) => {
        const sourceNode = d.source as SankeyNode;
        return colorScale(sourceNode.name);
      })
      .attr("fill-opacity", 0.85)
      .attr("stroke", "none")
      .on("mouseover", function (_event: MouseEvent, _d: SankeyLink) {
        d3.select(this).attr("fill-opacity", 1);
      })
      .on("mouseout", function (_event: MouseEvent, _d: SankeyLink) {
        d3.select(this).attr("fill-opacity", 0.85);
      });

    // Draw nodes (same palette as links, visible on black)
    const node = svg
      .append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", (d: SankeyNode) => d.x0 || 0)
      .attr("y", (d: SankeyNode) => d.y0 || 0)
      .attr("height", (d: SankeyNode) => (d.y1 || 0) - (d.y0 || 0))
      .attr("width", (d: SankeyNode) => (d.x1 || 0) - (d.x0 || 0))
      .attr("fill", (d: SankeyNode) => colorScale(d.name))
      .attr("opacity", 0.9)
      .on("mouseover", function (_event: MouseEvent, d: SankeyNode) {
        d3.select(this).attr("opacity", 1);
        link.attr("fill-opacity", (l: SankeyLink) => {
          const source = l.source as SankeyNode;
          const target = l.target as SankeyNode;
          return source.name === d.name || target.name === d.name ? 1 : 0.15;
        });
      })
      .on("mouseout", function (_event: MouseEvent, _d: SankeyNode) {
        d3.select(this).attr("opacity", 0.9);
        link.attr("fill-opacity", 0.85);
      });

    // Add labels
    const label = svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", (d: SankeyNode) => ((d.x0 || 0) < width / 2 ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6))
      .attr("y", (d: SankeyNode) => ((d.y0 || 0) + (d.y1 || 0)) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d: SankeyNode) => ((d.x0 || 0) < width / 2 ? "start" : "end"))
      .attr("fill", "white")
      .attr("font-size", "12px")
      .text((d: SankeyNode) => {
        const value = d.value || 0;
        const percent = totalIncome > 0 ? (value / totalIncome) * 100 : 0;
        const amt = value > 0 ? ` ${formatMoney(value)} ` : " ";
        return `${d.name}${amt}(${percent.toFixed(1)}%)`;
      })
      .filter((d: SankeyNode) => {
        const value = d.value || 0;
        const percent = totalIncome > 0 ? (value / totalIncome) * 100 : 0;
        return percent >= 0.5; // Only show labels for items >= 0.5%
      });
  }, [data, totalIncome]);

  return (
    <div className="w-full bg-black rounded-xl p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h2 className="text-lg font-semibold">Income & Expense Flow</h2>
          <p className="text-white/70 mt-1">
            Total Income:{" "}
            <span className="font-bold">
              $
              {totalIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          {!showAllTime &&
            [
              { label: "YTD", value: "ytd" },
              { label: "3M", value: "3months" },
              { label: "Month", value: "month" },
            ].map((btn) => (
              <button
                key={btn.value}
                onClick={() => setRange(btn.value)}
                className={`px-3 py-1 rounded-lg text-sm transition ${
                  range === btn.value
                    ? "bg-red-600 text-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {btn.label}
              </button>
            ))}

          {/* All Time Total Button */}
          <button
            onClick={() => setShowAllTime((prev) => !prev)}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              showAllTime
                ? "bg-green-600 text-white"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {showAllTime ? "Show Range Total" : "Show All Time Total"}
          </button>
        </div>
      </div>

      {/* Chart – black background, connections visible between nodes */}
      <div className="w-full overflow-x-auto bg-black rounded-lg">
        <svg
          ref={svgRef}
          className="w-full bg-black"
          style={{ minHeight: "600px", background: "#000" }}
        />
      </div>
    </div>
  );
}
