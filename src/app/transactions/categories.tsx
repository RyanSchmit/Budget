import { useState } from "react";

const defaultCategories = [
  "Restaurants",
  "College",
  "Income",
  "Trips",
  "Utilities",
  "Energy Drink",
  "Groceries",
  "Bars",
  "Golf",
  "Transportation",
  "Alcohol",
  "Snacks",
  "Subscriptions",
  "Sports Games",
  "Traffic Tickets",
  "Gym",
  "Gambling",
  "Clothes",
  "Online Shopping",
  "Books",
  "N/A",
];

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(defaultCategories);

  return { categories, setCategories };
}