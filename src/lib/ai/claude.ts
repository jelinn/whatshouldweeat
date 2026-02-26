import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedRecipe } from "@/lib/services/recipe-extractor";
import type {
  LLMProvider,
  RecommendationContext,
  Recommendation,
  RecipeGenerationPrompt,
} from "./types";

const RECIPE_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract the recipe information from the provided text and return it as JSON.

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

const HTML_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract the recipe from this HTML page content.

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

export class ClaudeProvider implements LLMProvider {
  name = "claude";
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = model || "claude-sonnet-4-20250514";
  }

  async extractRecipeFromText(text: string): Promise<ExtractedRecipe> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${RECIPE_EXTRACTION_PROMPT}\n\nText to extract from:\n\n${text}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    try {
      const recipe = JSON.parse(content.text);
      return this.normalizeRecipe(recipe);
    } catch {
      throw new Error("Failed to parse recipe from Claude response");
    }
  }

  async extractRecipeFromHtml(html: string, url: string): Promise<ExtractedRecipe> {
    // Truncate HTML to avoid token limits (keep first ~50k chars)
    const truncatedHtml = html.slice(0, 50000);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${HTML_EXTRACTION_PROMPT}\n\nURL: ${url}\n\nHTML Content:\n\n${truncatedHtml}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    try {
      // Try to extract JSON from the response (in case there's any extra text)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const recipe = JSON.parse(jsonMatch[0]);
      const normalized = this.normalizeRecipe(recipe);
      normalized.sourceUrl = url;
      return normalized;
    } catch (e) {
      throw new Error(`Failed to parse recipe from Claude response: ${e}`);
    }
  }

  async recommendRecipes(context: RecommendationContext): Promise<Recommendation[]> {
    const lovedList = context.lovedRecipes
      .map((r) => `- ${r.title} (${r.cuisine || "unknown cuisine"}, ${r.mealType || "any meal"})`)
      .join("\n");

    const recentList = context.recentlyCooked
      .map((r) => `- ${r.title}`)
      .join("\n");

    const prompt = `Based on the user's favorite recipes and recent cooking history, suggest 3-5 new recipes they might enjoy.

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

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      return JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("Failed to parse recommendations from Claude response");
    }
  }

  async generateRecipe(prompt: RecipeGenerationPrompt): Promise<ExtractedRecipe> {
    const constraints = prompt.constraints?.join(", ") || "none specified";
    const baseOn = prompt.baseOnRecipes?.join(", ") || "your creativity";

    const systemPrompt = `You are a creative chef. Generate an original recipe based on the user's requirements.

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

    const userPrompt = `Create a recipe with these requirements:
- Style: ${prompt.style || "home cooking"}
- Cuisine: ${prompt.cuisine || "any"}
- Servings: ${prompt.servings || 4}
- Constraints: ${constraints}
- Inspired by: ${baseOn}

Be creative but practical. Include realistic prep/cook times.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const recipe = JSON.parse(jsonMatch[0]);
      const normalized = this.normalizeRecipe(recipe);
      normalized.sourceName = "AI Generated";
      return normalized;
    } catch {
      throw new Error("Failed to parse generated recipe from Claude response");
    }
  }

  private normalizeRecipe(raw: Record<string, unknown>): ExtractedRecipe {
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
}
