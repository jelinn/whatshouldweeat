// Unit conversion and ingredient aggregation utilities

// Standard unit conversions (to base units)
const UNIT_CONVERSIONS: Record<string, { base: string; factor: number }> = {
  // Volume - base: ml
  tsp: { base: "ml", factor: 5 },
  teaspoon: { base: "ml", factor: 5 },
  teaspoons: { base: "ml", factor: 5 },
  tbsp: { base: "ml", factor: 15 },
  tablespoon: { base: "ml", factor: 15 },
  tablespoons: { base: "ml", factor: 15 },
  cup: { base: "ml", factor: 240 },
  cups: { base: "ml", factor: 240 },
  ml: { base: "ml", factor: 1 },
  milliliter: { base: "ml", factor: 1 },
  milliliters: { base: "ml", factor: 1 },
  l: { base: "ml", factor: 1000 },
  liter: { base: "ml", factor: 1000 },
  liters: { base: "ml", factor: 1000 },
  "fl oz": { base: "ml", factor: 30 },
  "fluid ounce": { base: "ml", factor: 30 },
  "fluid ounces": { base: "ml", factor: 30 },
  pint: { base: "ml", factor: 473 },
  pints: { base: "ml", factor: 473 },
  quart: { base: "ml", factor: 946 },
  quarts: { base: "ml", factor: 946 },
  gallon: { base: "ml", factor: 3785 },
  gallons: { base: "ml", factor: 3785 },

  // Weight - base: g
  g: { base: "g", factor: 1 },
  gram: { base: "g", factor: 1 },
  grams: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  kilogram: { base: "g", factor: 1000 },
  kilograms: { base: "g", factor: 1000 },
  oz: { base: "g", factor: 28.35 },
  ounce: { base: "g", factor: 28.35 },
  ounces: { base: "g", factor: 28.35 },
  lb: { base: "g", factor: 453.6 },
  lbs: { base: "g", factor: 453.6 },
  pound: { base: "g", factor: 453.6 },
  pounds: { base: "g", factor: 453.6 },
};

// Preferred display units (convert from base to these for display)
const PREFERRED_UNITS: Record<string, { threshold: number; unit: string; factor: number }[]> = {
  ml: [
    { threshold: 1000, unit: "liters", factor: 1000 },
    { threshold: 240, unit: "cups", factor: 240 },
    { threshold: 15, unit: "tbsp", factor: 15 },
    { threshold: 5, unit: "tsp", factor: 5 },
    { threshold: 0, unit: "ml", factor: 1 },
  ],
  g: [
    { threshold: 1000, unit: "kg", factor: 1000 },
    { threshold: 453, unit: "lbs", factor: 453.6 },
    { threshold: 28, unit: "oz", factor: 28.35 },
    { threshold: 0, unit: "g", factor: 1 },
  ],
};

interface IngredientInput {
  name: string;
  amount?: number | null;
  unit?: string | null;
  category?: string | null;
  recipeId?: string;
  recipeTitle?: string;
}

interface AggregatedIngredient {
  name: string;
  amount?: number;
  unit?: string;
  category: string;
  sources: { recipeId: string; recipeTitle: string; amount?: number; unit?: string }[];
}

// Normalize ingredient name for comparison
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common descriptors
    .replace(/\b(fresh|dried|chopped|minced|diced|sliced|whole|large|medium|small|organic)\b/gi, "")
    // Remove extra spaces
    .replace(/\s+/g, " ")
    .trim();
}

// Convert amount to base unit
function toBaseUnit(amount: number, unit: string): { amount: number; base: string } | null {
  const normalizedUnit = unit.toLowerCase().trim();
  const conversion = UNIT_CONVERSIONS[normalizedUnit];

  if (conversion) {
    return {
      amount: amount * conversion.factor,
      base: conversion.base,
    };
  }

  return null;
}

// Convert from base unit to preferred display unit
function fromBaseUnit(amount: number, base: string): { amount: number; unit: string } {
  const preferences = PREFERRED_UNITS[base];

  if (!preferences) {
    return { amount, unit: base };
  }

  for (const pref of preferences) {
    if (amount >= pref.threshold) {
      return {
        amount: Math.round((amount / pref.factor) * 100) / 100,
        unit: pref.unit,
      };
    }
  }

  return { amount, unit: base };
}

// Aggregate ingredients from multiple recipes
export function aggregateIngredients(
  ingredients: IngredientInput[]
): AggregatedIngredient[] {
  const grouped = new Map<string, AggregatedIngredient>();

  for (const ing of ingredients) {
    const normalizedName = normalizeIngredientName(ing.name);
    const key = normalizedName;

    if (!grouped.has(key)) {
      grouped.set(key, {
        name: ing.name, // Keep original name formatting
        amount: undefined,
        unit: undefined,
        category: ing.category || "other",
        sources: [],
      });
    }

    const aggregated = grouped.get(key)!;

    // Add source
    if (ing.recipeId && ing.recipeTitle) {
      aggregated.sources.push({
        recipeId: ing.recipeId,
        recipeTitle: ing.recipeTitle,
        amount: ing.amount ?? undefined,
        unit: ing.unit ?? undefined,
      });
    }

    // Try to combine amounts
    if (ing.amount && ing.unit) {
      const baseConverted = toBaseUnit(ing.amount, ing.unit);

      if (baseConverted) {
        // Can convert to base unit
        if (aggregated.amount === undefined) {
          aggregated.amount = baseConverted.amount;
          aggregated.unit = baseConverted.base;
        } else if (aggregated.unit === baseConverted.base) {
          // Same base unit, add amounts
          aggregated.amount += baseConverted.amount;
        }
        // Different base units, keep separate (handled by sources)
      } else {
        // Can't convert - use original or keep what we have
        if (aggregated.amount === undefined) {
          aggregated.amount = ing.amount;
          aggregated.unit = ing.unit;
        } else if (aggregated.unit === ing.unit) {
          // Same unit, add
          aggregated.amount += ing.amount;
        }
        // Different units that can't convert, sources track originals
      }
    } else if (ing.amount && !aggregated.amount) {
      // No unit but has amount
      aggregated.amount = ing.amount;
    }
  }

  // Convert aggregated amounts back to display units
  const result = Array.from(grouped.values()).map((item) => {
    if (item.amount && item.unit && PREFERRED_UNITS[item.unit]) {
      const display = fromBaseUnit(item.amount, item.unit);
      return {
        ...item,
        amount: display.amount,
        unit: display.unit,
      };
    }
    return item;
  });

  // Sort by category then name
  return result.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
}

// Category display order and labels
export const CATEGORY_ORDER = [
  "produce",
  "dairy",
  "meat",
  "seafood",
  "bakery",
  "frozen",
  "pantry",
  "condiments",
  "spices",
  "beverages",
  "other",
];

export const CATEGORY_LABELS: Record<string, string> = {
  produce: "Produce",
  dairy: "Dairy & Eggs",
  meat: "Meat & Poultry",
  seafood: "Seafood",
  bakery: "Bakery",
  frozen: "Frozen",
  pantry: "Pantry",
  condiments: "Condiments & Sauces",
  spices: "Spices & Seasonings",
  beverages: "Beverages",
  other: "Other",
};

export type { IngredientInput, AggregatedIngredient };
