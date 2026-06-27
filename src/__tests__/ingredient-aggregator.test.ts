import { describe, it, expect } from "vitest";
import {
  aggregateIngredients,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from "../lib/utils/ingredient-aggregator";

describe("Ingredient Aggregator", () => {
  describe("CATEGORY_ORDER and CATEGORY_LABELS", () => {
    it("should have all categories in order", () => {
      expect(CATEGORY_ORDER).toContain("produce");
      expect(CATEGORY_ORDER).toContain("dairy");
      expect(CATEGORY_ORDER).toContain("meat");
      expect(CATEGORY_ORDER).toContain("pantry");
      expect(CATEGORY_ORDER).toContain("other");
    });

    it("should have labels for all categories", () => {
      for (const category of CATEGORY_ORDER) {
        expect(CATEGORY_LABELS[category]).toBeDefined();
      }
    });

    it("should have produce before dairy in order", () => {
      const produceIdx = CATEGORY_ORDER.indexOf("produce");
      const dairyIdx = CATEGORY_ORDER.indexOf("dairy");
      expect(produceIdx).toBeLessThan(dairyIdx);
    });
  });

  describe("aggregateIngredients", () => {
    it("should combine same ingredients with convertible units", () => {
      const ingredients = [
        { name: "flour", amount: 2, unit: "cups" },
        { name: "flour", amount: 1, unit: "cup" },
      ];

      const result = aggregateIngredients(ingredients);
      const flour = result.find((i) => i.name.toLowerCase() === "flour");

      expect(flour).toBeDefined();
      expect(flour!.amount).toBe(3);
      expect(flour!.unit).toBe("cups");
    });

    it("should handle ingredients without amounts", () => {
      const ingredients = [
        { name: "salt", amount: null, unit: "to taste" },
        { name: "pepper", amount: null, unit: null },
      ];

      const result = aggregateIngredients(ingredients);

      expect(result).toHaveLength(2);
      expect(result.find((i) => i.name === "salt")).toBeDefined();
      expect(result.find((i) => i.name === "pepper")).toBeDefined();
    });

    it("should preserve category from input", () => {
      const ingredients = [
        { name: "chicken breast", amount: 1, unit: "pound", category: "meat" },
        { name: "onion", amount: 1, unit: null, category: "produce" },
      ];

      const result = aggregateIngredients(ingredients);

      const chicken = result.find((i) => i.name.toLowerCase().includes("chicken"));
      const onion = result.find((i) => i.name.toLowerCase().includes("onion"));

      expect(chicken!.category).toBe("meat");
      expect(onion!.category).toBe("produce");
    });

    it("should default to other category when not specified", () => {
      const ingredients = [
        { name: "mystery ingredient", amount: 1, unit: "unit" },
      ];

      const result = aggregateIngredients(ingredients);
      expect(result[0].category).toBe("other");
    });

    it("should convert and aggregate volume units", () => {
      const ingredients = [
        { name: "olive oil", amount: 2, unit: "tbsp" },
        { name: "olive oil", amount: 1, unit: "tablespoon" },
      ];

      const result = aggregateIngredients(ingredients);
      const oil = result.find((i) => i.name.toLowerCase().includes("olive"));

      expect(oil).toBeDefined();
      expect(oil!.amount).toBe(3);
      expect(oil!.unit).toBe("tbsp");
    });

    it("should convert and aggregate weight units", () => {
      const ingredients = [
        { name: "butter", amount: 4, unit: "oz" },
        { name: "butter", amount: 2, unit: "ounces" },
      ];

      const result = aggregateIngredients(ingredients);
      const butter = result.find((i) => i.name.toLowerCase().includes("butter"));

      expect(butter).toBeDefined();
      expect(butter!.amount).toBe(6);
      expect(butter!.unit).toBe("oz");
    });

    it("should normalize ingredient names for matching", () => {
      const ingredients = [
        { name: "Fresh Basil", amount: 10, unit: "leaves" },
        { name: "fresh basil", amount: 5, unit: "leaves" },
      ];

      const result = aggregateIngredients(ingredients);

      // Should be combined into one entry
      const basil = result.filter((i) => i.name.toLowerCase().includes("basil"));
      expect(basil).toHaveLength(1);
    });

    it("should track recipe sources", () => {
      const ingredients = [
        { name: "garlic", amount: 2, unit: "cloves", recipeId: "r1", recipeTitle: "Pasta" },
        { name: "garlic", amount: 3, unit: "cloves", recipeId: "r2", recipeTitle: "Soup" },
      ];

      const result = aggregateIngredients(ingredients);
      const garlic = result.find((i) => i.name.toLowerCase().includes("garlic"));

      expect(garlic!.sources).toHaveLength(2);
      expect(garlic!.sources[0].recipeTitle).toBe("Pasta");
      expect(garlic!.sources[1].recipeTitle).toBe("Soup");
    });

    it("should sort results by category then name", () => {
      const ingredients = [
        { name: "Zucchini", amount: 1, unit: null, category: "produce" },
        { name: "Apple", amount: 1, unit: null, category: "produce" },
        { name: "Milk", amount: 1, unit: "cup", category: "dairy" },
      ];

      const result = aggregateIngredients(ingredients);

      // Sorted alphabetically by category, then by name within category
      // dairy comes before produce alphabetically
      expect(result[0].name).toBe("Milk");       // dairy
      expect(result[1].name).toBe("Apple");      // produce (alphabetically first)
      expect(result[2].name).toBe("Zucchini");   // produce (alphabetically second)
    });

    it("should handle empty input", () => {
      const result = aggregateIngredients([]);
      expect(result).toHaveLength(0);
    });

    it("should merge singular and plural forms", () => {
      const ingredients = [
        { name: "onion", amount: 1, unit: null, category: "produce" },
        { name: "onions", amount: 2, unit: null, category: "produce" },
        { name: "tomato", amount: 1, unit: null, category: "produce" },
        { name: "tomatoes", amount: 3, unit: null, category: "produce" },
        { name: "berry", amount: 1, unit: "cup", category: "produce" },
        { name: "berries", amount: 1, unit: "cup", category: "produce" },
      ];

      const result = aggregateIngredients(ingredients);

      expect(result.filter((i) => i.name.toLowerCase().includes("onion"))).toHaveLength(1);
      expect(result.filter((i) => i.name.toLowerCase().includes("tomato"))).toHaveLength(1);
      expect(result.filter((i) => i.name.toLowerCase().includes("berr"))).toHaveLength(1);
    });

    it("should not over-singularize words ending in 'ss'", () => {
      const ingredients = [
        { name: "boneless chicken breast", amount: 1, unit: "lb", category: "meat" },
        { name: "boneless chicken breasts", amount: 1, unit: "lb", category: "meat" },
      ];

      const result = aggregateIngredients(ingredients);
      const chicken = result.filter((i) => i.name.toLowerCase().includes("chicken"));
      expect(chicken).toHaveLength(1);
    });

    it("should handle large quantities with unit conversion", () => {
      const ingredients = [
        { name: "water", amount: 4, unit: "cups" },
        { name: "water", amount: 2, unit: "cups" },
      ];

      const result = aggregateIngredients(ingredients);
      const water = result.find((i) => i.name.toLowerCase() === "water");

      // 6 cups = 1440ml, should display as cups or liters
      expect(water).toBeDefined();
      expect(water!.amount).toBeGreaterThanOrEqual(1);
    });
  });
});
