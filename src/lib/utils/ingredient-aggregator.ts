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
    { threshold: 453, unit: "lbs", factor: 453.6 },
    { threshold: 28, unit: "oz", factor: 28.35 },
    { threshold: 0, unit: "g", factor: 1 },
  ],
};

// Auto-categorize ingredients by name when no category is provided
const CATEGORY_PATTERNS: [RegExp, string][] = [
  // Produce
  [/\b(lettuce|spinach|kale|arugula|greens|tomato|onion|garlic|pepper|jalape[nñ]o|potato|carrot|celery|broccoli|cauliflower|cucumber|zucchini|squash|mushroom|avocado|corn|bean sprout|ginger|scallion|shallot|leek|cilantro|parsley|basil|mint|dill|rosemary|thyme|chive|lemon|lime|orange|apple|banana|berr|raspberr|blueberr|strawberr|grape|mango|peach|pear|melon|cabbage|radish|beet|turnip|eggplant|artichoke|asparagus|pea[^n]|snap pea|green bean)\b/i, "produce"],
  // Dairy
  [/\b(milk|cream|butter|cheese|yogurt|sour cream|cream cheese|egg|cheddar|mozzarella|parmesan|ricotta|provolone|gouda|brie|feta|goat cheese|half-and-half|whipping cream|buttermilk)\b/i, "dairy"],
  // Meat
  [/\b(beef|chicken|pork|turkey|lamb|sausage|bacon|ham|steak|roast|ground meat|ground beef|ground turkey|ground pork|ground lamb|chuck|sirloin|tenderloin|brisket|ribs|thigh|breast|drumstick|wing|chop|loin|prosciutto|pancetta|salami|pepperoni|meatball)\b/i, "meat"],
  // Seafood
  [/\b(salmon|tuna|shrimp|prawn|cod|tilapia|halibut|trout|crab|lobster|scallop|mussel|clam|oyster|anchov|sardine|squid|octopus|fish|seafood)\b/i, "seafood"],
  // Bakery
  [/\b(bread|roll|bun|tortilla|pita|naan|bagel|croissant|baguette|ciabatta|sourdough|flatbread|wrap|english muffin|hamburger bun|hot dog bun|crouton)\b/i, "bakery"],
  // Frozen
  [/\b(frozen|ice cream)\b/i, "frozen"],
  // Spices
  [/\b(salt|pepper|cumin|paprika|oregano|cinnamon|nutmeg|cayenne|chili powder|curry|turmeric|coriander|cardamom|clove|allspice|bay lea|fennel seed|mustard seed|red pepper flake|italian seasoning|garlic powder|onion powder|smoked paprika|za'atar|sumac|saffron|vanilla)\b/i, "spices"],
  // Condiments
  [/\b(ketchup|mustard|mayo|mayonnaise|hot sauce|soy sauce|worcestershire|vinegar|sriracha|salsa|barbecue|teriyaki|tahini|hoisin|fish sauce|oyster sauce|sambal|harissa|chile crisp|gochujang|miso|ranch|dressing|relish|aioli|pesto|marinara|tomato paste|tomato sauce)\b/i, "condiments"],
  // Pantry
  [/\b(flour|sugar|rice|pasta|noodle|oil|olive oil|vegetable oil|canola|coconut oil|sesame oil|broth|stock|canned|beans|lentil|chickpea|oat|cereal|granola|nut|almond|walnut|pecan|cashew|peanut|pistachio|seed|honey|maple syrup|molasses|cocoa|chocolate|baking powder|baking soda|yeast|cornstarch|breadcrumb|panko|spaghetti|penne|macaroni|fettuccine|ramen|couscous|quinoa|barley|bulgur|polenta|grits|tortilla chip|cracker|chip)\b/i, "pantry"],
  // Beverages
  [/\b(water|juice|wine|beer|coffee|tea|soda|sparkling|broth|stock|coconut milk|almond milk|oat milk)\b/i, "beverages"],
];

function autoCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(lower)) return category;
  }
  return "other";
}

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
    // Remove parenthetical notes like "(about 2 cups)" or "(see Note)"
    .replace(/\([^)]*\)/g, "")
    // Remove common descriptors that don't change the core ingredient
    .replace(/\b(fresh|dried|chopped|minced|diced|sliced|grated|shredded|crushed|ground|whole|large|medium|small|thin|thick|fine|finely|coarsely|roughly|organic|lean|extra-lean|boneless|skinless|bone-in|skin-on|unsalted|salted|cold|warm|room temperature|softened|melted|frozen|thawed|ripe|unripe|raw|cooked|canned|packed|plain|unsweetened|low-sodium|no-salt-added|good|best|quality|about|approximately)\b/g, "")
    // Remove extra hyphens and spaces
    .replace(/[-]+/g, " ")
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
        category: ing.category || autoCategory(ing.name),
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
        if (aggregated.amount === undefined || !aggregated.unit) {
          // First entry with a convertible unit (or prior entry had no unit)
          aggregated.amount = baseConverted.amount;
          aggregated.unit = baseConverted.base;
        } else if (aggregated.unit === baseConverted.base) {
          // Same base unit, add amounts
          aggregated.amount += baseConverted.amount;
        }
        // Different base units (e.g., weight vs volume), keep separate (tracked by sources)
      } else {
        // Can't convert - use original unit or try to match
        const normalizedUnit = ing.unit.toLowerCase().trim();
        if (aggregated.amount === undefined || !aggregated.unit) {
          aggregated.amount = ing.amount;
          aggregated.unit = ing.unit;
        } else if (aggregated.unit?.toLowerCase().trim() === normalizedUnit) {
          // Same unit string, add
          aggregated.amount += ing.amount;
        }
        // Different non-convertible units, sources track originals
      }
    } else if (ing.amount) {
      // Has amount but no unit (e.g., "3 eggs")
      if (aggregated.amount === undefined || aggregated.unit) {
        // Only set count if we don't already have a unit-based amount
        if (aggregated.amount === undefined) {
          aggregated.amount = ing.amount;
        }
      } else {
        // Both are unit-less counts, add them
        aggregated.amount += ing.amount;
      }
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
