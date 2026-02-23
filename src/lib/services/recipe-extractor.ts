import * as cheerio from "cheerio";
import type { CreateRecipeInput } from "@/types";

interface ExtractedRecipe {
  title: string;
  description?: string;
  imageUrl?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: number;
  ingredients: {
    name: string;
    amount?: number;
    unit?: string;
    notes?: string;
  }[];
  instructions: {
    stepNumber: number;
    instruction: string;
  }[];
  sourceName?: string;
  sourceUrl?: string;
}

// Parse ISO 8601 duration (PT30M, PT1H30M, etc.) to minutes
function parseDuration(duration: string | undefined): number | undefined {
  if (!duration) return undefined;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return undefined;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 60 + minutes + Math.ceil(seconds / 60);
}

// Parse yield/servings from various formats
function parseServings(yield_: string | number | undefined): number | undefined {
  if (!yield_) return undefined;
  if (typeof yield_ === "number") return yield_;

  // Extract first number from string like "4 servings" or "Makes 12"
  const match = yield_.toString().match(/(\d+)/);
  return match ? parseInt(match[1]) : undefined;
}

// Parse ingredient string into structured format
export function parseIngredient(text: string): {
  name: string;
  amount?: number;
  unit?: string;
  notes?: string;
} {
  // Common units pattern
  const units =
    /^(cups?|tbsp?|tsp?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|pieces?|slices?|cloves?|heads?|bunche?s?|cans?|packages?|pinche?s?|dashes?|sticks?)/i;

  // Clean the text
  let cleaned = text.trim();

  // Extract notes in parentheses
  let notes: string | undefined;
  const parenMatch = cleaned.match(/\(([^)]+)\)/);
  if (parenMatch) {
    notes = parenMatch[1];
    cleaned = cleaned.replace(/\s*\([^)]+\)\s*/g, " ").trim();
  }

  // Extract notes after comma
  const commaIndex = cleaned.indexOf(",");
  if (commaIndex > 0) {
    const afterComma = cleaned.slice(commaIndex + 1).trim();
    if (afterComma && !notes) {
      notes = afterComma;
    }
    cleaned = cleaned.slice(0, commaIndex).trim();
  }

  // Try to extract amount and unit
  // Patterns: "2 cups flour", "1/2 tsp salt", "2-3 tablespoons oil"
  const amountMatch = cleaned.match(
    /^([\d./\-–]+(?:\s*[-–]\s*[\d./]+)?)\s*/
  );

  let amount: number | undefined;
  let unit: string | undefined;
  let name = cleaned;

  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/[-–]/g, "-");

    // Handle fractions like 1/2
    if (amountStr.includes("/")) {
      const [num, denom] = amountStr.split("/").map(Number);
      amount = num / denom;
    } else if (amountStr.includes("-")) {
      // Range like 2-3, take average
      const [min, max] = amountStr.split("-").map(Number);
      amount = (min + max) / 2;
    } else {
      amount = parseFloat(amountStr);
    }

    // Remove amount from string
    name = cleaned.slice(amountMatch[0].length).trim();

    // Try to extract unit
    const unitMatch = name.match(units);
    if (unitMatch) {
      unit = unitMatch[1].toLowerCase();
      name = name.slice(unitMatch[0].length).trim();
    }
  }

  return {
    name: name || text,
    amount: amount && !isNaN(amount) ? amount : undefined,
    unit,
    notes,
  };
}

// Extract recipe from JSON-LD structured data
function extractFromJsonLd(jsonLd: unknown): ExtractedRecipe | null {
  if (!jsonLd || typeof jsonLd !== "object") return null;

  const data = jsonLd as Record<string, unknown>;

  // Handle @graph arrays
  if (Array.isArray(data["@graph"])) {
    for (const item of data["@graph"]) {
      const result = extractFromJsonLd(item);
      if (result) return result;
    }
    return null;
  }

  // Check if this is a Recipe type
  const type = data["@type"];
  const isRecipe =
    type === "Recipe" ||
    (Array.isArray(type) && type.includes("Recipe"));

  if (!isRecipe) return null;

  // Extract ingredients
  const rawIngredients = data.recipeIngredient as string[] | undefined;
  const ingredients = rawIngredients
    ? rawIngredients.map((ing) => parseIngredient(ing))
    : [];

  // Extract instructions
  const rawInstructions = data.recipeInstructions;
  let instructions: { stepNumber: number; instruction: string }[] = [];

  if (Array.isArray(rawInstructions)) {
    instructions = rawInstructions.map((inst, index) => {
      if (typeof inst === "string") {
        return { stepNumber: index + 1, instruction: inst };
      }
      if (typeof inst === "object" && inst !== null) {
        const instObj = inst as Record<string, unknown>;
        return {
          stepNumber: index + 1,
          instruction: (instObj.text as string) || (instObj.name as string) || "",
        };
      }
      return { stepNumber: index + 1, instruction: "" };
    }).filter((i) => i.instruction);
  } else if (typeof rawInstructions === "string") {
    // Single string of instructions - split by newlines or periods
    instructions = rawInstructions
      .split(/\n|(?<=\.)\s+/)
      .filter((s) => s.trim())
      .map((inst, index) => ({
        stepNumber: index + 1,
        instruction: inst.trim(),
      }));
  }

  // Extract image
  let imageUrl: string | undefined;
  const image = data.image;
  if (typeof image === "string") {
    imageUrl = image;
  } else if (Array.isArray(image)) {
    imageUrl = typeof image[0] === "string" ? image[0] : (image[0] as Record<string, unknown>)?.url as string;
  } else if (typeof image === "object" && image !== null) {
    imageUrl = (image as Record<string, unknown>).url as string;
  }

  return {
    title: (data.name as string) || "Untitled Recipe",
    description: (data.description as string) || undefined,
    imageUrl,
    prepTimeMinutes: parseDuration(data.prepTime as string),
    cookTimeMinutes: parseDuration(data.cookTime as string),
    totalTimeMinutes: parseDuration(data.totalTime as string),
    servings: parseServings(data.recipeYield as string | number),
    ingredients,
    instructions,
  };
}

// Fetch and parse a recipe URL
export async function fetchAndExtractRecipe(
  url: string
): Promise<{ recipe: ExtractedRecipe | null; html: string; error?: string }> {
  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return {
        recipe: null,
        html: "",
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to find JSON-LD scripts
    const jsonLdScripts = $('script[type="application/ld+json"]');

    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const scriptContent = $(jsonLdScripts[i]).html();
        if (!scriptContent) continue;

        const jsonLd = JSON.parse(scriptContent);

        // Handle arrays of objects
        if (Array.isArray(jsonLd)) {
          for (const item of jsonLd) {
            const recipe = extractFromJsonLd(item);
            if (recipe) {
              // Add source info
              recipe.sourceUrl = url;
              recipe.sourceName = extractSiteName($, url);
              return { recipe, html };
            }
          }
        } else {
          const recipe = extractFromJsonLd(jsonLd);
          if (recipe) {
            recipe.sourceUrl = url;
            recipe.sourceName = extractSiteName($, url);
            return { recipe, html };
          }
        }
      } catch {
        // JSON parse error, continue to next script
        continue;
      }
    }

    // No structured data found
    return {
      recipe: null,
      html,
      error: "No structured recipe data found. Try the LLM extraction or paste the recipe text.",
    };
  } catch (error) {
    return {
      recipe: null,
      html: "",
      error: error instanceof Error ? error.message : "Failed to fetch recipe",
    };
  }
}

// Extract site name from page
function extractSiteName($: cheerio.CheerioAPI, url: string): string {
  // Try og:site_name
  const ogSiteName = $('meta[property="og:site_name"]').attr("content");
  if (ogSiteName) return ogSiteName;

  // Try to extract from URL
  try {
    const hostname = new URL(url).hostname;
    // Remove www. and extract domain name
    const domain = hostname.replace(/^www\./, "").split(".")[0];
    // Capitalize first letter
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return "Unknown Source";
  }
}

// Convert extracted recipe to CreateRecipeInput format
export function toCreateRecipeInput(
  extracted: ExtractedRecipe
): CreateRecipeInput {
  return {
    title: extracted.title,
    description: extracted.description,
    sourceUrl: extracted.sourceUrl,
    sourceName: extracted.sourceName,
    imageUrl: extracted.imageUrl,
    prepTimeMinutes: extracted.prepTimeMinutes,
    cookTimeMinutes: extracted.cookTimeMinutes,
    totalTimeMinutes:
      extracted.totalTimeMinutes ||
      (extracted.prepTimeMinutes || 0) + (extracted.cookTimeMinutes || 0) ||
      undefined,
    servings: extracted.servings,
    ingredients: extracted.ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      notes: ing.notes,
    })),
    instructions: extracted.instructions,
  };
}

export type { ExtractedRecipe };
