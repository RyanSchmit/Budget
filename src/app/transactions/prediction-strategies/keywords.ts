export interface KeywordRule {
  keywords: string[];
  category: string;
}

export const keywordRules: KeywordRule[] = [
  {
    keywords: [
      "Mcdonald",
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
    keywords: ["Walmart", "Target", "Costco", "Grocery"],
    category: "Groceries",
  },
  {
    keywords: ["Zelle", "PayPal", "Venmo", "Cash App", "Transfer"],
    category: "Transfers",
  },
  { keywords: ["Donut"], category: "Snacks" },
  {
    keywords: ["Uber", "Lyft", "MTA", "Rail", "Flix"],
    category: "Transportation",
  },
  { keywords: ["Gas"], category: "Gas" },
  {
    keywords: [
      "Coffee",
      "Campus Market",
      "Starbucks",
      "Espresso",
      "UU MARKET",
      "Cafe",
    ],
    category: "Energy Drink",
  },
  {
    keywords: [
      "Payroll",
      "Salary",
      "CalMatters",
      "Mobile Deposit",
      "Interest Payment",
      "Deposit",
    ],
    category: "Income",
  },
  {
    keywords: ["Monthly Service Fee", "Spotify", "Apple.com/Bill"],
    category: "Subscriptions",
  },
  { keywords: ["Audible", "books"], category: "Books" },
  { keywords: ["Pub", "Brew", "Brewing"], category: "Bar" },
  { keywords: ["Golf"], category: "Golf" },
  { keywords: ["Beverages & More", "Liquor"], category: "Alcohol" },
  { keywords: ["Field", "Stadium"], category: "Sports Games" },
  { keywords: ["Fines"], category: "Traffic Tickets" },
];
