"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { sankey } from "d3-sankey";
import { Transaction } from "../types";
import { formatMoney } from "../format";
import { isIncome, spendByCategory, summarize } from "../summary";
import SavingsRateStat from "./SavingsRateStat";

interface CategoryPieChartProps {
  transactions: Transaction[];
  filters?: ReactNode;
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

// Known employers: map a keyword found in the description to the display name
// used for the company that paid you. Add employers here for clean labels.
const employerMap: Record<string, string> = {
  calmatters: "CalMatters",
};

// Pull a readable company name out of a raw bank payroll description, stripping
// the boilerplate ("DIRECT DEP", "PPD ID", reference numbers, etc.) that banks
// wrap around the actual employer name.
const extractCompanyName = (description: string): string | null => {
  const cleaned = description
    .replace(
      /\b(direct\s+dep(osit)?|payroll|salary|des|ppd|ccd|indn|orig(inator)?|co(mpany)?\s*id|co\s+name|type|ach|credit|dep(osit)?|pmt|payment|trn|id)\b/gi,
      " ",
    )
    .replace(/[:#*].*$/, " ") // drop trailing reference / id segments
    .replace(/\d{3,}/g, " ") // drop account / reference numbers
    .replace(/[^a-zA-Z& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 2) return null;

  return cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

// Categorize income by source
const getIncomeSource = (description: string): string => {
  const desc = description.toLowerCase();
  if (
    desc.includes("payroll") ||
    desc.includes("salary") ||
    desc.includes("mobile deposit") ||
    desc.includes("interest payment") ||
    Object.keys(employerMap).some((keyword) => desc.includes(keyword))
  ) {
    // Name the company that paid you rather than a generic "Salary" bucket.
    const knownKeyword = Object.keys(employerMap).find((keyword) =>
      desc.includes(keyword),
    );
    if (knownKeyword) return employerMap[knownKeyword];
    return extractCompanyName(description) ?? "Salary";
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
  filters,
}: CategoryPieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { income: totalIncome, expenses: totalSpent } = useMemo(
    () => summarize(transactions),
    [transactions],
  );

  // A category whose credits outweigh its charges has no ribbon to draw, so it
  // is left out of the diagram even though it still counts toward the total.
  const spend = useMemo(
    () => spendByCategory(transactions).filter((entry) => entry.amount > 0),
    [transactions],
  );

  // Process income by source
  const incomeBySource = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (!isIncome(t)) return acc;
      const source = getIncomeSource(t.description);
      acc[source] = (acc[source] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
  }, [transactions]);

  // Process expenses by major category
  const expensesByMajorCategory = useMemo(() => {
    return spend.reduce((acc, { category, amount }) => {
      const majorCategory = majorCategoryMap[category] || "Other";
      acc[majorCategory] = (acc[majorCategory] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
  }, [spend]);

  // Process expenses by subcategory
  const expensesBySubcategory = useMemo(() => {
    return spend.reduce((acc, { category, amount }) => {
      acc[category] = amount;
      return acc;
    }, {} as Record<string, number>);
  }, [spend]);

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

    const svg = d3
      .select(svgRef.current)
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
      "#22d3ee",
      "#a78bfa",
      "#34d399",
      "#fbbf24",
      "#f87171",
      "#60a5fa",
      "#c084fc",
      "#4ade80",
      "#fb923c",
      "#e879f9",
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

    // Color each node to match the links that touch it (so "ends of the lines" match line color)
    const nodeColor = (d: SankeyNode) => {
      const incoming = links.find(
        (l: SankeyLink) => (l.target as SankeyNode).name === d.name
      );
      if (incoming) return colorScale((incoming.source as SankeyNode).name);
      return colorScale(d.name);
    };

    // Draw nodes (same color as their connecting links)
    const node = svg
      .append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", (d: SankeyNode) => d.x0 || 0)
      .attr("y", (d: SankeyNode) => d.y0 || 0)
      .attr("height", (d: SankeyNode) => (d.y1 || 0) - (d.y0 || 0))
      .attr("width", (d: SankeyNode) => (d.x1 || 0) - (d.x0 || 0))
      .attr("fill", (d: SankeyNode) => nodeColor(d))
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

    // Add labels with background (only for items >= 0.5%)
    const labelNodes = nodes.filter((d: SankeyNode) => {
      const value = d.value || 0;
      const percent = totalIncome > 0 ? (value / totalIncome) * 100 : 0;
      return percent >= 0.5;
    });

    const label = svg
      .append("g")
      .selectAll("g")
      .data(labelNodes)
      .join("g")
      .attr("transform", (d: SankeyNode) => {
        const x = (d.x0 || 0) < width / 2 ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6;
        const y = ((d.y0 || 0) + (d.y1 || 0)) / 2;
        return `translate(${x},${y})`;
      })
      .each(function (d: SankeyNode) {
        const g = d3.select(this);
        const value = d.value || 0;
        const percent = totalIncome > 0 ? (value / totalIncome) * 100 : 0;
        const amt = value > 0 ? ` ${formatMoney(value)} ` : " ";
        const textStr = `${d.name}${amt}(${percent.toFixed(1)}%)`;
        const anchor = (d.x0 || 0) < width / 2 ? "start" : "end";

        const text = g
          .append("text")
          .attr("x", 0)
          .attr("dy", "0.35em")
          .attr("text-anchor", anchor)
          .attr("fill", "#111")
          .attr("font-size", "12px")
          .text(textStr);

        const textEl = text.node() as SVGTextElement;
        if (textEl) {
          const bbox = textEl.getBBox();
          const pad = 5;
          g.insert("rect", "text")
            .attr("x", bbox.x - pad)
            .attr("y", bbox.y - pad)
            .attr("width", bbox.width + pad * 2)
            .attr("height", bbox.height + pad * 2)
            .attr("fill", "white")
            .attr("fill-opacity", 0.7)
            .attr("rx", 4)
            .attr("ry", 4);
        }
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
            <span className="font-bold">{formatMoney(totalIncome)}</span>
          </p>
          <p className="text-white/70 mt-1">
            Total spent:{" "}
            <span className="font-bold">{formatMoney(totalSpent)}</span>
          </p>
          <SavingsRateStat transactions={transactions} />
        </div>
        {filters ? <div className="flex gap-3 flex-wrap">{filters}</div> : null}
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
