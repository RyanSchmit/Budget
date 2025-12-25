const rules = [
  {
    keywords: ["mcdonald", "Panda Express", "Hot Chicken", "Chick-Fil-A"],
    category: "Restaurants",
  },
  { keywords: ["walmart", "target", "costco"], category: "Groceries" },
  { keywords: ["Donut"], category: "Snacks" },
  { keywords: ["uber", "lyft", "MTA"], category: "Transportation" },
  { keywords: ["gas"], category: "Gas" },
  { keywords: ["coffee", "Campus Market"], category: "Energy Drink" },
  {
    keywords: [
      "payroll",
      "salary",
      "CalMatters",
      "Mobile Deposit",
      "Interest Payment",
    ],
    category: "Income",
  },
  {
    keywords: ["Monthly Service Fee", "Spotify", "Audible"],
    category: "Subscriptions",
  },
];

export const rulePredict = (description, amount) => {
  const text = String(description).toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((k) => text.includes(String(k).toLowerCase()))) {
      return rule.category;
    }
  }
  return "N/A";
};
