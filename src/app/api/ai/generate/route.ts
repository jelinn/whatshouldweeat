import { NextRequest, NextResponse } from "next/server";
import { db, recipes } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getLLMProvider, isLLMConfigured } from "@/lib/ai";
import type { RecipeGenerationPrompt } from "@/lib/ai";

// POST /api/ai/generate - Generate a new recipe using AI
export async function POST(request: NextRequest) {
  try {
    // Check if LLM is configured
    if (!isLLMConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "AI is not configured. Please set ANTHROPIC_API_KEY in your environment.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      basedOnRecipeIds,
      constraints,
      style,
      cuisine,
      servings,
    } = body;

    // Get recipe titles if IDs provided
    let baseOnRecipes: string[] | undefined;
    if (basedOnRecipeIds && basedOnRecipeIds.length > 0) {
      const baseRecipes = await db.query.recipes.findMany({
        where: (recipes, { inArray }) => inArray(recipes.id, basedOnRecipeIds),
        columns: { title: true },
      });
      baseOnRecipes = baseRecipes.map((r) => r.title);
    }

    // If no specific recipes, use loved ones
    if (!baseOnRecipes || baseOnRecipes.length === 0) {
      const lovedRecipes = await db.query.recipes.findMany({
        where: eq(recipes.isLoved, true),
        columns: { title: true },
        limit: 5,
      });
      if (lovedRecipes.length > 0) {
        baseOnRecipes = lovedRecipes.map((r) => r.title);
      }
    }

    // Build generation prompt
    const prompt: RecipeGenerationPrompt = {
      baseOnRecipes,
      constraints: constraints || [],
      style,
      cuisine,
      servings: servings || 4,
    };

    // Generate recipe
    const provider = getLLMProvider();
    const generatedRecipe = await provider.generateRecipe(prompt);

    return NextResponse.json({
      success: true,
      data: {
        recipe: generatedRecipe,
        prompt: {
          basedOn: baseOnRecipes,
          constraints,
          style,
          cuisine,
        },
      },
    });
  } catch (error) {
    console.error("Error generating recipe:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate recipe",
      },
      { status: 500 }
    );
  }
}
