import type { ExtractedRecipe } from "@/lib/services/recipe-extractor";
import type { RecommendationContext, RecipeGenerationPrompt } from "./types";

export const RECIPE_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract the recipe information from the provided text and return it as JSON.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "title": "Recipe Title",
  "description": "Brief description of the dish",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "totalTimeMinutes": 45,
  "servings": 4,
  "ingredients": [
    {"name": "ingredient name", "amount": 2, "unit": "cups", "notes": "optional notes"}
  ],
  "instructions": [
    {"stepNumber": 1, "instruction": "Step description"}
  ]
}

Rules:
- Extract ALL ingredients mentioned
- Extract ALL steps in order
- For amounts, use decimal numbers (1.5 not "1 1/2")
- If a value is unknown, omit the field
- Keep ingredient names clean (no amounts in the name)
- Instructions should be clear, individual steps`;

export const HTML_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract the recipe from this HTML page content.

Focus on:
1. The main recipe title (not site name)
2. Recipe description/intro
3. All ingredients with amounts and units
4. All cooking instructions in order
5. Prep time, cook time, servings if mentioned

Return ONLY valid JSON with this exact structure:
{
  "title": "Recipe Title",
  "description": "Brief description",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "servings": 4,
  "ingredients": [
    {"name": "ingredient", "amount": 2, "unit": "cups", "notes": "optional"}
  ],
  "instructions": [
    {"stepNumber": 1, "instruction": "Step text"}
  ]
}

Ignore:
- Ads and promotional content
- Comments and reviews
- Navigation and footer content
- Related recipes`;

export const IMAGE_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract the recipe from these cookbook page photos.

If multiple images are provided, they are consecutive pages of the same recipe. Combine information from all pages.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "title": "Recipe Title",
  "description": "Brief description of the dish",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "totalTimeMinutes": 45,
  "servings": 4,
  "ingredients": [
    {"name": "ingredient name", "amount": 2, "unit": "cups", "notes": "optional notes"}
  ],
  "instructions": [
    {"stepNumber": 1, "instruction": "Step description"}
  ]
}

Rules:
- Extract ALL ingredients mentioned across all pages
- Extract ALL steps in order across all pages
- For amounts, use decimal numbers (1.5 not "1 1/2")
- If a value is unknown, omit the field
- Keep ingredient names clean (no amounts in the name)
- Instructions should be clear, individual steps`;

export const RECIPE_GENERATION_SYSTEM_PROMPT = `You are a creative chef. Generate an original recipe based on the user's requirements.

Return ONLY valid JSON with this structure:
{
  "title": "Recipe Title",
  "description": "Enticing description",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "totalTimeMinutes": 45,
  "servings": 4,
  "ingredients": [
    {"name": "ingredient", "amount": 2, "unit": "cups", "notes": "optional"}
  ],
  "instructions": [
    {"stepNumber": 1, "instruction": "Detailed step"}
  ]
}`;

export function buildRecommendationPrompt(context: RecommendationContext): string {
  const lovedList = context.lovedRecipes
    .map((r) => `- ${r.title} (${r.cuisine || "unknown cuisine"}, ${r.mealType || "any meal"})`)
    .join("\n");

  const recentList = context.recentlyCooked
    .map((r) => `- ${r.title}`)
    .join("\n");

  return `Based on the user's favorite recipes and recent cooking history, suggest 3-5 new recipes they might enjoy.

Loved Recipes:
${lovedList || "None yet"}

Recently Cooked:
${recentList || "None recently"}

${context.preferences?.quickMeals ? "User prefers quick meals under 30 minutes." : ""}
${context.preferences?.maxPrepTime ? `Max prep time: ${context.preferences.maxPrepTime} minutes` : ""}

Return ONLY valid JSON array:
[
  {
    "title": "Recipe Name",
    "description": "Brief description of the dish",
    "reasoning": "Why this recipe fits the user's preferences",
    "estimatedTime": 45,
    "cuisine": "Italian"
  }
]`;
}

export function buildGenerationPrompt(prompt: RecipeGenerationPrompt): string {
  const constraints = prompt.constraints?.join(", ") || "none specified";
  const baseOn = prompt.baseOnRecipes?.join(", ") || "your creativity";

  return `Create a recipe with these requirements:
- Style: ${prompt.style || "home cooking"}
- Cuisine: ${prompt.cuisine || "any"}
- Servings: ${prompt.servings || 4}
- Constraints: ${constraints}
- Inspired by: ${baseOn}

Be creative but practical. Include realistic prep/cook times.`;
}

export function normalizeRecipe(raw: Record<string, unknown>): ExtractedRecipe {
  const safeNumber = (val: unknown): number | undefined => {
    if (val === undefined || val === null) return undefined;
    const num = typeof val === "string" ? parseFloat(val) : Number(val);
    return isNaN(num) ? undefined : num;
  };

  return {
    title: (raw.title as string) || "Untitled Recipe",
    description: raw.description as string | undefined,
    prepTimeMinutes: safeNumber(raw.prepTimeMinutes),
    cookTimeMinutes: safeNumber(raw.cookTimeMinutes),
    totalTimeMinutes: safeNumber(raw.totalTimeMinutes),
    servings: safeNumber(raw.servings),
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.map((ing: Record<string, unknown>) => ({
          name: String(ing.name || ""),
          amount: safeNumber(ing.amount),
          unit: ing.unit ? String(ing.unit) : undefined,
          notes: ing.notes ? String(ing.notes) : undefined,
        }))
      : [],
    instructions: Array.isArray(raw.instructions)
      ? raw.instructions.map((inst: Record<string, unknown>, idx: number) => ({
          stepNumber: safeNumber(inst.stepNumber) || idx + 1,
          instruction: String(inst.instruction || ""),
        }))
      : [],
  };
}

export function extractJson(text: string, type: "object" | "array" = "object"): string {
  const pattern = type === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = text.match(pattern);
  if (!match) {
    throw new Error(`No JSON ${type} found in response`);
  }
  return match[0];
}
