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

// Parse ISO 8601 duration (PT30M, PT1H30M, P0DT0H45M0S, etc.) to minutes
function parseDuration(duration: string | undefined): number | undefined {
  if (!duration) return undefined;

  // Handle full ISO 8601: P[nD]T[nH][nM][nS]
  const match = duration.match(/P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return undefined;

  const days = parseInt(match[1] || "0");
  const hours = parseInt(match[2] || "0");
  const minutes = parseInt(match[3] || "0");
  const seconds = parseInt(match[4] || "0");

  const total = days * 24 * 60 + hours * 60 + minutes + Math.ceil(seconds / 60);
  return total > 0 ? total : undefined;
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
  // Common units pattern - single-letter units (g, l) require a word boundary after them
  // to avoid eating the start of words like "garlic" or "large"
  const units =
    /^(cups?|tbsp?|tsp?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|kg|kilograms?|ml|milliliters?|liters?|pieces?|slices?|cloves?|heads?|bunche?s?|cans?|packages?|pinche?s?|dashes?|sticks?)(?:\s|$)/i;
  // Single-letter units only match when followed by space/end (e.g., "300 g flour" but not "3 garlic")
  const singleLetterUnits = /^(g|l)(?:\s|$)/i;

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
  // Patterns: "2 cups flour", "1/2 tsp salt", "2-3 tablespoons oil", "2 1/2 cups flour"
  const amountMatch = cleaned.match(
    /^([\d]+\s+[\d]+\/[\d]+|[\d./\-–]+(?:\s*[-–]\s*[\d./]+)?)\s*/
  );

  let amount: number | undefined;
  let unit: string | undefined;
  let name = cleaned;

  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/[-–]/g, "-");

    // Handle mixed fractions like "2 1/2"
    const mixedMatch = amountStr.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      amount = parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
    } else if (amountStr.includes("/")) {
      // Simple fractions like "1/2"
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

    // Try to extract unit - check multi-char units first, then single-letter
    const unitMatch = name.match(units) || name.match(singleLetterUnits);
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

// Extract recipe from microdata (itemprop attributes, used by Jetpack Recipe, etc.)
function extractFromMicrodata($: cheerio.CheerioAPI): ExtractedRecipe | null {
  // Find the Recipe schema container
  const recipeEl = $('[itemtype*="schema.org/Recipe"]');
  if (recipeEl.length === 0) return null;

  // Title
  const title = recipeEl.find('[itemprop="name"]').first().text().trim();
  if (!title) return null;

  // Description
  const description = recipeEl.find('[itemprop="description"]').first().text().trim() || undefined;

  // Servings
  const servingsText = recipeEl.find('[itemprop="recipeYield"]').first().text().trim();
  const servings = parseServings(servingsText);

  // Times - check datetime attributes first, then text content
  const prepTimeEl = recipeEl.find('[itemprop="prepTime"]').first();
  const cookTimeEl = recipeEl.find('[itemprop="cookTime"]').first();
  const totalTimeEl = recipeEl.find('[itemprop="totalTime"]').first();

  const prepTimeMinutes = parseDuration(prepTimeEl.attr('datetime')) || parseDuration(prepTimeEl.text());
  const cookTimeMinutes = parseDuration(cookTimeEl.attr('datetime')) || parseDuration(cookTimeEl.text());
  const totalTimeMinutes = parseDuration(totalTimeEl.attr('datetime')) || parseDuration(totalTimeEl.text());

  // Image
  let imageUrl: string | undefined;
  const imgEl = recipeEl.find('[itemprop="image"]').first();
  if (imgEl.length > 0) {
    imageUrl = imgEl.attr('src') || imgEl.attr('content') || undefined;
  }

  // Ingredients
  const ingredientEls = recipeEl.find('[itemprop="recipeIngredient"], [itemprop="ingredients"]');
  const ingredients = ingredientEls
    .map((_, el) => {
      const text = $(el).text().trim();
      return text ? parseIngredient(text) : null;
    })
    .get()
    .filter(Boolean) as ReturnType<typeof parseIngredient>[];

  // Instructions - try itemprop first, then common class-based containers
  let instructions: { stepNumber: number; instruction: string }[] = [];

  const instructionEls = recipeEl.find('[itemprop="recipeInstructions"]');
  if (instructionEls.length > 0) {
    // Check if it's a container with step children or individual elements
    if (instructionEls.length === 1) {
      const container = instructionEls.first();
      const stepEls = container.find('[itemprop="step"], [itemprop="itemListElement"], li, p');
      if (stepEls.length > 0) {
        instructions = stepEls
          .map((i, el) => {
            const text = $(el).find('[itemprop="text"]').text().trim() || $(el).text().trim();
            return text ? { stepNumber: i + 1, instruction: text } : null;
          })
          .get()
          .filter(Boolean) as { stepNumber: number; instruction: string }[];
      } else {
        // Single block of text - split by paragraphs or sentences
        const text = container.text().trim();
        if (text) {
          instructions = text
            .split(/\n\n|\n/)
            .map((s) => s.trim())
            .filter((s) => s.length > 10)
            .map((s, i) => ({ stepNumber: i + 1, instruction: s }));
        }
      }
    } else {
      // Multiple elements with itemprop="recipeInstructions"
      instructions = instructionEls
        .map((i, el) => {
          const text = $(el).text().trim();
          return text ? { stepNumber: i + 1, instruction: text } : null;
        })
        .get()
        .filter(Boolean) as { stepNumber: number; instruction: string }[];
    }
  }

  // Fallback: look for common recipe directions containers (Jetpack, WPRM, etc.)
  if (instructions.length === 0) {
    const directionsContainer = recipeEl.find(
      '.jetpack-recipe-directions, .wprm-recipe-instructions, .recipe-directions, .instructions'
    ).first();

    if (directionsContainer.length > 0) {
      const paragraphs = directionsContainer.find('p, li');
      if (paragraphs.length > 0) {
        instructions = paragraphs
          .map((i, el) => {
            const text = $(el).text().trim();
            return text && text.length > 5 ? { stepNumber: i + 1, instruction: text } : null;
          })
          .get()
          .filter(Boolean) as { stepNumber: number; instruction: string }[];
      }
    }
  }

  // Only return if we found meaningful content
  if (ingredients.length === 0 && instructions.length === 0) return null;

  return {
    title,
    description,
    imageUrl,
    prepTimeMinutes,
    cookTimeMinutes,
    totalTimeMinutes,
    servings,
    ingredients,
    instructions,
  };
}

// Fetch and parse a recipe URL
export async function fetchAndExtractRecipe(
  url: string
): Promise<{ recipe: ExtractedRecipe | null; html: string; source?: "json-ld" | "microdata"; error?: string }> {
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
              return { recipe, html, source: "json-ld" as const };
            }
          }
        } else {
          const recipe = extractFromJsonLd(jsonLd);
          if (recipe) {
            recipe.sourceUrl = url;
            recipe.sourceName = extractSiteName($, url);
            return { recipe, html, source: "json-ld" as const };
          }
        }
      } catch {
        // JSON parse error, continue to next script
        continue;
      }
    }

    // Try microdata extraction (itemprop attributes)
    const microdataRecipe = extractFromMicrodata($);
    if (microdataRecipe) {
      microdataRecipe.sourceUrl = url;
      microdataRecipe.sourceName = extractSiteName($, url);
      return { recipe: microdataRecipe, html, source: "microdata" as const };
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
