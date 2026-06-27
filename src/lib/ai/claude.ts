import Anthropic from "@anthropic-ai/sdk";
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

export class ClaudeProvider implements LLMProvider {
  name = "claude";
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = model || "claude-sonnet-4-6";
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

    return normalizeRecipe(JSON.parse(extractJson(content.text)));
  }

  async extractRecipeFromHtml(html: string, url: string): Promise<ExtractedRecipe> {
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

    const recipe = normalizeRecipe(JSON.parse(extractJson(content.text)));
    recipe.sourceUrl = url;
    return recipe;
  }

  async extractRecipeFromImages(images: ImageData[]): Promise<ExtractedRecipe> {
    const content: Anthropic.Messages.ContentBlockParam[] = [
      ...images.map(
        (img): Anthropic.Messages.ImageBlockParam => ({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType,
            data: img.data,
          },
        })
      ),
      { type: "text", text: IMAGE_EXTRACTION_PROMPT },
    ];

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    });

    const responseContent = response.content[0];
    if (responseContent.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const recipe = normalizeRecipe(JSON.parse(extractJson(responseContent.text)));
    recipe.sourceName = "Cookbook Photo";
    return recipe;
  }

  async recommendRecipes(context: RecommendationContext): Promise<Recommendation[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [{ role: "user", content: buildRecommendationPrompt(context) }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    return JSON.parse(extractJson(content.text, "array"));
  }

  async generateRecipe(prompt: RecipeGenerationPrompt): Promise<ExtractedRecipe> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: RECIPE_GENERATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildGenerationPrompt(prompt) }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const recipe = normalizeRecipe(JSON.parse(extractJson(content.text)));
    recipe.sourceName = "AI Generated";
    return recipe;
  }
}
