import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { db, mealPlans, recipes } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { getMealDate, isPastOrToday, recordCook } from "@/lib/services/cook-tracker";

// POST /api/planner/quick-fill - Fill empty dinner slots with random recipes
export async function POST(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { weekStart, mealTypes = ["dinner"], prioritizeLoved = true } = body;

    if (!weekStart) {
      return NextResponse.json(
        { success: false, error: "weekStart is required" },
        { status: 400 }
      );
    }

    // Get existing plans for this week
    const existingPlans = await db.query.mealPlans.findMany({
      where: eq(mealPlans.weekStart, weekStart),
    });

    // Find which slots are empty
    const filledSlots = new Set(
      existingPlans
        .filter((p) => p.recipeId)
        .map((p) => `${p.dayOfWeek}-${p.mealType}`)
    );

    // Get recipes to fill with (prioritize loved ones)
    const allRecipes = await db.query.recipes.findMany({
      orderBy: prioritizeLoved
        ? [desc(recipes.isLoved), desc(recipes.rating), sql`RANDOM()`]
        : [sql`RANDOM()`],
    });

    if (allRecipes.length === 0) {
      return NextResponse.json(
        { success: false, error: "No recipes available to fill with" },
        { status: 400 }
      );
    }

    const createdPlans = [];
    let recipeIndex = 0;

    // Fill empty slots for each day and meal type
    for (let day = 0; day < 7; day++) {
      for (const mealType of mealTypes) {
        const slotKey = `${day}-${mealType}`;

        if (!filledSlots.has(slotKey)) {
          // Check if there's already an entry (might have notes but no recipe)
          const existing = existingPlans.find(
            (p) => p.dayOfWeek === day && p.mealType === mealType
          );

          const recipe = allRecipes[recipeIndex % allRecipes.length];
          recipeIndex++;

          if (existing) {
            // Update existing entry
            const [updated] = await db
              .update(mealPlans)
              .set({ recipeId: recipe.id })
              .where(eq(mealPlans.id, existing.id))
              .returning();
            createdPlans.push(updated);

            const mealDate = getMealDate(weekStart, day);
            if (isPastOrToday(mealDate)) {
              await recordCook(recipe.id, mealDate, updated.id);
            }
          } else {
            // Create new entry
            const [created] = await db
              .insert(mealPlans)
              .values({
                weekStart,
                dayOfWeek: day,
                mealType,
                recipeId: recipe.id,
              })
              .returning();
            createdPlans.push(created);

            const mealDate = getMealDate(weekStart, day);
            if (isPastOrToday(mealDate)) {
              await recordCook(recipe.id, mealDate, created.id);
            }
          }
        }
      }
    }

    // Fetch updated plan with recipe details
    const updatedPlans = await db.query.mealPlans.findMany({
      where: eq(mealPlans.weekStart, weekStart),
      with: {
        recipe: {
          columns: {
            id: true,
            title: true,
            imageUrl: true,
            totalTimeMinutes: true,
            cuisine: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        weekStart,
        plans: updatedPlans,
        filled: createdPlans.length,
      },
    });
  } catch (error) {
    console.error("Error quick filling meal plan:", error);
    return NextResponse.json(
      { success: false, error: "Failed to quick fill meal plan" },
      { status: 500 }
    );
  }
}
