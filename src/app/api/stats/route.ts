import { NextResponse } from "next/server";
import { db, recipes, cookHistory, mealPlans } from "@/lib/db";
import { count, eq, sql, desc, isNotNull } from "drizzle-orm";

export async function GET() {
  try {
    // Total recipes
    const [{ total: totalRecipes }] = await db
      .select({ total: count() })
      .from(recipes);

    // Favorites count
    const [{ total: totalFavorites }] = await db
      .select({ total: count() })
      .from(recipes)
      .where(eq(recipes.isLoved, true));

    // Recipes with ratings - average rating
    const [ratingResult] = await db
      .select({
        avg: sql<number>`avg(${recipes.rating})`,
        total: count(),
      })
      .from(recipes)
      .where(isNotNull(recipes.rating));

    // Recipes by cuisine
    const cuisineBreakdown = await db
      .select({
        cuisine: recipes.cuisine,
        count: count(),
      })
      .from(recipes)
      .where(isNotNull(recipes.cuisine))
      .groupBy(recipes.cuisine)
      .orderBy(desc(count()));

    // Recipes by meal type
    const mealTypeBreakdown = await db
      .select({
        mealType: recipes.mealType,
        count: count(),
      })
      .from(recipes)
      .where(isNotNull(recipes.mealType))
      .groupBy(recipes.mealType)
      .orderBy(desc(count()));

    // Recipes by difficulty
    const difficultyBreakdown = await db
      .select({
        difficulty: recipes.difficulty,
        count: count(),
      })
      .from(recipes)
      .where(isNotNull(recipes.difficulty))
      .groupBy(recipes.difficulty)
      .orderBy(desc(count()));

    // Total cook events
    const [{ total: totalCooks }] = await db
      .select({ total: count() })
      .from(cookHistory);

    // Most cooked recipes (top 10)
    const mostCooked = await db
      .select({
        recipeId: cookHistory.recipeId,
        title: recipes.title,
        count: count(),
      })
      .from(cookHistory)
      .innerJoin(recipes, eq(cookHistory.recipeId, recipes.id))
      .groupBy(cookHistory.recipeId)
      .orderBy(desc(count()))
      .limit(10);

    // Cooking frequency by month (last 12 months)
    const cooksByMonth = await db
      .select({
        month: sql<string>`substr(${cookHistory.cookedAt}, 1, 7)`,
        count: count(),
      })
      .from(cookHistory)
      .groupBy(sql`substr(${cookHistory.cookedAt}, 1, 7)`)
      .orderBy(sql`substr(${cookHistory.cookedAt}, 1, 7)`);

    // Recipes never cooked
    const [{ total: neverCooked }] = await db
      .select({ total: count() })
      .from(recipes)
      .where(sql`${recipes.id} NOT IN (SELECT DISTINCT ${cookHistory.recipeId} FROM ${cookHistory})`);

    // Recently added recipes (last 5)
    const recentRecipes = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        createdAt: recipes.createdAt,
        cuisine: recipes.cuisine,
      })
      .from(recipes)
      .orderBy(desc(recipes.createdAt))
      .limit(5);

    // Top rated recipes
    const topRated = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        rating: recipes.rating,
        cuisine: recipes.cuisine,
      })
      .from(recipes)
      .where(isNotNull(recipes.rating))
      .orderBy(desc(recipes.rating))
      .limit(5);

    // Recipes added by month
    const recipesByMonth = await db
      .select({
        month: sql<string>`substr(datetime(${recipes.createdAt} / 1000, 'unixepoch'), 1, 7)`,
        count: count(),
      })
      .from(recipes)
      .where(isNotNull(recipes.createdAt))
      .groupBy(sql`substr(datetime(${recipes.createdAt} / 1000, 'unixepoch'), 1, 7)`)
      .orderBy(sql`substr(datetime(${recipes.createdAt} / 1000, 'unixepoch'), 1, 7)`);

    // Meal plans count
    const [{ total: totalMealPlans }] = await db
      .select({ total: count() })
      .from(mealPlans)
      .where(isNotNull(mealPlans.recipeId));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRecipes,
          totalFavorites,
          totalCooks,
          totalMealPlans,
          neverCooked,
          averageRating: ratingResult.avg
            ? Math.round(ratingResult.avg * 10) / 10
            : null,
          ratedCount: ratingResult.total,
        },
        cuisineBreakdown,
        mealTypeBreakdown,
        difficultyBreakdown,
        mostCooked,
        cooksByMonth,
        recipesByMonth,
        recentRecipes,
        topRated,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
