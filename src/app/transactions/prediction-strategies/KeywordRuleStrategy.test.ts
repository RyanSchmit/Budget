import { describe, expect, it } from "vitest";
import { KeywordRuleStrategy } from "./KeywordRuleStrategy";

const strategy = new KeywordRuleStrategy();

function tx(
  description: string,
  overrides?: Partial<{
    id: string;
    date: string;
    category: string;
    amount: number;
  }>
) {
  return {
    id: "1",
    date: "2024-01-15",
    description,
    category: "",
    amount: 0,
    ...overrides,
  };
}

describe("KeywordRuleStrategy", () => {
  describe("Restaurants", () => {
    it("matches McDonald's", () => {
      expect(strategy.predict(tx("MCDONALD'S #12345"))).toBe("Restaurants");
      expect(strategy.predict(tx("McDonald"))).toBe("Restaurants");
      expect(strategy.predict(tx("mcdonald"))).toBe("Restaurants");
    });

    it("matches other restaurant keywords", () => {
      expect(strategy.predict(tx("Panda Express #456"))).toBe("Restaurants");
      expect(strategy.predict(tx("CHIPOTLE 1234"))).toBe("Restaurants");
      expect(strategy.predict(tx("Five Guys Burgers"))).toBe("Restaurants");
      expect(strategy.predict(tx("In-N-Out Burger"))).toBe("Restaurants");
    });
  });

  describe("Groceries", () => {
    it("matches grocery store keywords", () => {
      expect(strategy.predict(tx("WALMART SUPERCENTER"))).toBe("Groceries");
      expect(strategy.predict(tx("Target"))).toBe("Groceries");
      expect(strategy.predict(tx("COSTCO WHOLESALE"))).toBe("Groceries");
      expect(strategy.predict(tx("Local Grocery Store"))).toBe("Groceries");
    });
  });

  describe("Transfers", () => {
    it("matches transfer keywords", () => {
      expect(strategy.predict(tx("Zelle payment from John"))).toBe("Transfers");
      expect(strategy.predict(tx("PayPal *MERCHANT"))).toBe("Transfers");
      expect(strategy.predict(tx("VENMO"))).toBe("Transfers");
      expect(strategy.predict(tx("Cash App"))).toBe("Transfers");
      expect(strategy.predict(tx("Transfer to Checking 11:02a #7458 ONLINE Reference # 000230"))).toBe("Transfers");
    });
  });

  describe("Transportation", () => {
    it("matches transportation keywords", () => {
      expect(strategy.predict(tx("UBER TRIP"))).toBe("Transportation");
      expect(strategy.predict(tx("LYFT Rides"))).toBe("Transportation");
      expect(strategy.predict(tx("MTA MetroCard"))).toBe("Transportation");
    });
  });

  describe("Income", () => {
    it("matches income keywords", () => {
      expect(strategy.predict(tx("Payroll Deposit"))).toBe("Income");
      expect(strategy.predict(tx("Salary"))).toBe("Income");
      expect(strategy.predict(tx("Mobile Deposit"))).toBe("Income");
      expect(strategy.predict(tx("Interest Payment"))).toBe("Income");
      expect(strategy.predict(tx("Deposit"))).toBe("Income");
    });
  });

  describe("Subscriptions", () => {
    it("matches subscription keywords", () => {
      expect(strategy.predict(tx("Spotify"))).toBe("Subscriptions");
      expect(strategy.predict(tx("Apple.com/Bill"))).toBe("Subscriptions");
    });
  });

  describe("Energy Drink / Coffee", () => {
    it("matches coffee and cafe keywords", () => {
      expect(strategy.predict(tx("Starbucks"))).toBe("Energy Drink");
      expect(strategy.predict(tx("Campus Market"))).toBe("Energy Drink");
      expect(strategy.predict(tx("Cafe Roma"))).toBe("Energy Drink");
    });
  });

  describe("case insensitivity", () => {
    it("matches keywords regardless of case", () => {
      expect(strategy.predict(tx("WALMART"))).toBe("Groceries");
      expect(strategy.predict(tx("walmart"))).toBe("Groceries");
      expect(strategy.predict(tx("WalMaRt"))).toBe("Groceries");
    });

    it("matches when description has mixed case", () => {
      expect(strategy.predict(tx("McDonald's #12345"))).toBe("Restaurants");
      expect(strategy.predict(tx("STARBUCKS COFFEE"))).toBe("Energy Drink");
    });
  });

  describe("substring matching", () => {
    it("matches keyword as substring within description", () => {
      expect(strategy.predict(tx("Some text McDonald more text"))).toBe(
        "Restaurants"
      );
      expect(strategy.predict(tx("12345 Chipotle 67890"))).toBe("Restaurants");
    });
  });

  describe("rule precedence", () => {
    it("returns first matching rule when multiple could match", () => {
      // "Transfer" could match Transfers; "Gas" matches Gas
      // Rules are ordered: Transfers before Gas, so Transfer wins
      expect(strategy.predict(tx("Transfer"))).toBe("Transfers");
      expect(strategy.predict(tx("Gas Station"))).toBe("Gas");
    });
  });

  describe("no match", () => {
    it("returns N/A when no keyword matches", () => {
      expect(strategy.predict(tx("Unknown Merchant XYZ"))).toBe("N/A");
      expect(strategy.predict(tx("Random Purchase 123"))).toBe("N/A");
      expect(strategy.predict(tx(""))).toBe("N/A");
    });
  });

  describe("edge cases", () => {
    it("handles description with special characters", () => {
      expect(strategy.predict(tx("MCDONALD'S #12345 - CARD"))).toBe(
        "Restaurants"
      );
    });

    it("handles numeric descriptions", () => {
      expect(strategy.predict(tx("12345"))).toBe("N/A");
    });
  });
});
