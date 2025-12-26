const rules = [
  {
    keywords: [
      "mcdonald",
      "Panda Express",
      "Hot Chicken",
      "Chick-Fil-A",
      "Mexican food",
      "Pizza",
      "Restaurant",
      "BBQ",
      "Grill",
      "Five Guys",
      "Chipotle",
      "Dining",
      "In-N-Out",
      "Diner",
      "Sushi",
      "Taco",
    ],
    category: "Restaurants",
  },
  {
    keywords: ["walmart", "target", "costco", "Grocery"],
    category: "Groceries",
  },
  { keywords: ["Donut"], category: "Snacks" },
  {
    keywords: ["uber", "lyft", "MTA", "rail", "flix"],
    category: "Transportation",
  },
  { keywords: ["gas"], category: "Gas" },
  {
    keywords: [
      "coffee",
      "Campus Market",
      "Starbucks",
      "Espresso",
      "UU MARKET",
      "cafe",
    ],
    category: "Energy Drink",
  },
  {
    keywords: [
      "payroll",
      "salary",
      "CalMatters",
      "Mobile Deposit",
      "Interest Payment",
      "Deposit",
    ],
    category: "Income",
  },
  {
    keywords: ["Monthly Service Fee", "Spotify", "APPLE.COM/BILL"],
    category: "Subscriptions",
  },
  { keywords: ["Audible", "books"], category: "Books" },
  { keywords: ["Pub", "Brew", "Brewing"], category: "Bar" },
  { keywords: ["Golf"], category: "Golf" },
  { keywords: ["BEVERAGES & MOR", "Liquor"], category: "Alcohol" },
  { keywords: ["Field", "Stadium"], category: "Sports Games" },
  { keywords: ["fines"], category: "Traffic Tickets" },
];

export const rulePredict = (description, amount) => {
  const text = String(description).toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((k) => text.includes(String(k).toLowerCase()))) {
      return rule.category;
    }
  }
  if (
    text.includes(String("7-ELEVEN").toLowerCase()) &&
    Math.abs(amount) < 10
  ) {
    return "Energy Drink";
  }
  if (
    text.includes(String("7-ELEVEN").toLowerCase()) &&
    Math.abs(amount) >= 10
  ) {
    return "Alcohol";
  }
  return "N/A";
};
