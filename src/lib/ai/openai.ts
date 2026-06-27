import OpenAI from "openai";
import type { ExtractedRecipe } from "@/lib/services/recipe-extractor";
import type {
  LLMProvider,
  ImageData,
  RecommendationContext,
  Recommendation,
  RecipeGenerationPrompt,
} from "./types";
import {
  RECIPE_EXTRACTION_PROMPT,
  HTML_EXTRACTION_PROMPT,
  IMAGE_EXTRACTION_PROMPT,
  RECIPE_GENERATION_SYSTEM_PROMPT,
  buildRecommendationPrompt,
  buildGenerationPrompt,
  normalizeRecipe,
  extractJson,
} from "./prompts";

export class OpenAIProvider implements LLMProvider {
  name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model?: string, baseUrl?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      ...(baseUrl && { baseURL: baseUrl }),
    });
    this.model = model || "gpt-4o";
  }

  private async chat(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    maxTokens = 4096
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    return content;
  }

  async extractRecipeFromText(text: string): Promise<ExtractedRecipe> {
    const content = await this.chat([
      {
        role: "user",
        content: `${RECIPE_EXTRACTION_PROMPT}\n\nText to extract from:\n\n${text}`,
      },
    ]);

    return normalizeRecipe(JSON.parse(extractJson(content)));
  }

  async extractRecipeFromHtml(html: string, url: string): Promise<ExtractedRecipe> {
    const truncatedHtml = html.slice(0, 50000);

    const content = await this.chat([
      {
        role: "user",
        content: `${HTML_EXTRACTION_PROMPT}\n\nURL: ${url}\n\nHTML Content:\n\n${truncatedHtml}`,
      },
    ]);

    const recipe = normalizeRecipe(JSON.parse(extractJson(content)));
    recipe.sourceUrl = url;
    return recipe;
  }

  async extractRecipeFromImages(images: ImageData[]): Promise<ExtractedRecipe> {
    const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = images.map(
      (img) => ({
        type: "image_url" as const,
        image_url: {
          url: `data:${img.mediaType};base64,${img.data}`,
        },
      })
    );

    const content = await this.chat([
      {
        role: "user",
        content: [
          ...imageContent,
          { type: "text" as const, text: IMAGE_EXTRACTION_PROMPT },
        ],
      },
    ]);

    const recipe = normalizeRecipe(JSON.parse(extractJson(content)));
    recipe.sourceName = "Cookbook Photo";
    return recipe;
  }

  async recommendRecipes(context: RecommendationContext): Promise<Recommendation[]> {
    const content = await this.chat(
      [{ role: "user", content: buildRecommendationPrompt(context) }],
      2048
    );

    return JSON.parse(extractJson(content, "array"));
  }

  async generateRecipe(prompt: RecipeGenerationPrompt): Promise<ExtractedRecipe> {
    const content = await this.chat([
      { role: "system", content: RECIPE_GENERATION_SYSTEM_PROMPT },
      { role: "user", content: buildGenerationPrompt(prompt) },
    ]);

    const recipe = normalizeRecipe(JSON.parse(extractJson(content)));
    recipe.sourceName = "AI Generated";
    return recipe;
  }
}
