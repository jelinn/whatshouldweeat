import type { ExtractedRecipe } from "@/lib/services/recipe-extractor";

// Context for recipe recommendations
export interface RecommendationContext {
  lovedRecipes: {
    id: string;
    title: string;
    cuisine?: string;
    mealType?: string;
    tags?: string[];
  }[];
  recentlyCooked: {
    title: string;
    cookedAt: Date;
  }[];
  preferences?: {
    quickMeals?: boolean;
    maxPrepTime?: number;
    cuisinePreferences?: string[];
  };
}

// Recommendation result
export interface Recommendation {
  title: string;
  description: string;
  reasoning: string;
  estimatedTime?: number;
  cuisine?: string;
}

// Prompt for generating a new recipe
export interface RecipeGenerationPrompt {
  baseOnRecipes?: string[]; // Titles of recipes to base on
  constraints?: string[]; // "vegetarian", "quick", "use chicken"
  style?: string; // "comfort food", "elegant dinner"
  cuisine?: string;
  servings?: number;
}

// LLM Provider interface
export interface LLMProvider {
  name: string;

  // Extract recipe from raw text (for copy-paste)
  extractRecipeFromText(text: string): Promise<ExtractedRecipe>;

  // Extract recipe from HTML when structured data is missing
  extractRecipeFromHtml(html: string, url: string): Promise<ExtractedRecipe>;

  // Generate recipe recommendations
  recommendRecipes(context: RecommendationContext): Promise<Recommendation[]>;

  // Generate a new recipe
  generateRecipe(prompt: RecipeGenerationPrompt): Promise<ExtractedRecipe>;
}

// Provider configuration
export interface LLMConfig {
  provider: "claude" | "openai" | "ollama";
  apiKey?: string;
  model?: string;
  baseUrl?: string; // For Ollama
}
