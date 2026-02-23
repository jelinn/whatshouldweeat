import { NextRequest, NextResponse } from "next/server";
import { db, recipes } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { getLLMProvider, isLLMConfigured } from "@/lib/ai";
import type { RecommendationContext } from "@/lib/ai";

// POST /api/ai/recommend - Get AI-powered recipe recommendations
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
    const { quickMeals, maxPrepTime, cuisinePreferences } = body;

    // Get user's loved recipes
    const lovedRecipes = await db.query.recipes.findMany({
      where: eq(recipes.isLoved, true),
      columns: {
        id: true,
        title: true,
        cuisine: true,
        mealType: true,
        tags: true,
      },
      limit: 20,
    });

    // Get recently cooked recipes
    const recentlyCooked = await db.query.recipes.findMany({
      where: (recipes, { isNotNull }) => isNotNull(recipes.lastCookedAt),
      orderBy: [desc(recipes.lastCookedAt)],
      columns: {
        title: true,
        lastCookedAt: true,
      },
      limit: 10,
    });

    // Get highly rated recipes
    const highlyRated = await db.query.recipes.findMany({
      where: (recipes, { gte }) => gte(recipes.rating, 4),
      columns: {
        id: true,
        title: true,
        cuisine: true,
        mealType: true,
        tags: true,
      },
      limit: 10,
    });

    // Combine loved and highly rated for context
    const preferredRecipes = [
      ...lovedRecipes,
      ...highlyRated.filter(
        (r) => !lovedRecipes.some((l) => l.id === r.id)
      ),
    ];

    // Build recommendation context
    const context: RecommendationContext = {
      lovedRecipes: preferredRecipes.map((r) => ({
        id: r.id,
        title: r.title,
        cuisine: r.cuisine || undefined,
        mealType: r.mealType || undefined,
        tags: r.tags || undefined,
      })),
      recentlyCooked: recentlyCooked.map((r) => ({
        title: r.title,
        cookedAt: r.lastCookedAt!,
      })),
      preferences: {
        quickMeals,
        maxPrepTime,
        cuisinePreferences,
      },
    };

    // Get recommendations from LLM
    const provider = getLLMProvider();
    const recommendations = await provider.recommendRecipes(context);

    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        basedOn: {
          lovedCount: lovedRecipes.length,
          ratedCount: highlyRated.length,
          recentCount: recentlyCooked.length,
        },
      },
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get recommendations",
      },
      { status: 500 }
    );
  }
}
