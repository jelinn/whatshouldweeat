import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { db, groceryItems, mealPlans, ingredients, recipes, staples } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  aggregateIngredients,
  type IngredientInput,
} from "@/lib/utils/ingredient-aggregator";
import type { ApiResponse } from "@/types";

// GET /api/grocery - Get grocery list for a week
export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("week");

    if (!weekStart) {
      return NextResponse.json(
        { success: false, error: "week parameter is required" },
        { status: 400 }
      );
    }

    // Get existing grocery items for this week
    const items = await db.query.groceryItems.findMany({
      where: eq(groceryItems.weekStart, weekStart),
    });

    // Get all staples
    const allStaples = await db.query.staples.findMany();

    return NextResponse.json({
      success: true,
      data: {
        weekStart,
        items,
        staples: allStaples,
      },
    });
  } catch (error) {
    console.error("Error fetching grocery list:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch grocery list" },
      { status: 500 }
    );
  }
}

// POST /api/grocery - Generate grocery list from meal plan
export async function POST(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { weekStart, includeStaples = true } = body;

    if (!weekStart) {
      return NextResponse.json(
        { success: false, error: "weekStart is required" },
        { status: 400 }
      );
    }

    // Get meal plans for this week with recipe details
    const plans = await db.query.mealPlans.findMany({
      where: eq(mealPlans.weekStart, weekStart),
      with: {
        recipe: {
          with: {
            ingredients: true,
          },
        },
      },
    });

    // Collect all ingredients
    const allIngredients: IngredientInput[] = [];

    for (const plan of plans) {
      if (plan.recipe && plan.recipe.ingredients) {
        for (const ing of plan.recipe.ingredients) {
          allIngredients.push({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            category: ing.category,
            recipeId: plan.recipe.id,
            recipeTitle: plan.recipe.title,
          });
        }
      }
    }

    // Aggregate ingredients
    const aggregated = aggregateIngredients(allIngredients);

    // Clear existing grocery items for this week (except manually added)
    await db.delete(groceryItems).where(
      and(
        eq(groceryItems.weekStart, weekStart),
        eq(groceryItems.isStaple, false)
      )
    );

    // Insert aggregated items
    const newItems = [];
    for (const item of aggregated) {
      const [created] = await db
        .insert(groceryItems)
        .values({
          ingredientName: item.name,
          amount: item.amount,
          unit: item.unit,
          category: item.category,
          isChecked: false,
          isStaple: false,
          sourceRecipeId: item.sources[0]?.recipeId || null,
          weekStart,
        })
        .returning();
      newItems.push(created);
    }

    // Add staples if requested
    if (includeStaples) {
      const allStaples = await db.query.staples.findMany();

      for (const staple of allStaples) {
        // Check if this staple already exists in the list
        const existing = newItems.find(
          (item) =>
            item.ingredientName.toLowerCase() === staple.name.toLowerCase()
        );

        if (!existing) {
          const [created] = await db
            .insert(groceryItems)
            .values({
              ingredientName: staple.name,
              amount: staple.defaultAmount,
              unit: staple.defaultUnit,
              category: staple.category,
              isChecked: false,
              isStaple: true,
              weekStart,
            })
            .returning();
          newItems.push(created);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        weekStart,
        items: newItems,
        generated: aggregated.length,
      },
    });
  } catch (error) {
    console.error("Error generating grocery list:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate grocery list" },
      { status: 500 }
    );
  }
}

// PATCH /api/grocery - Update a grocery item (check/uncheck)
export async function PATCH(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { id, isChecked } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Item ID is required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(groceryItems)
      .set({ isChecked })
      .where(eq(groceryItems.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating grocery item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update grocery item" },
      { status: 500 }
    );
  }
}

// DELETE /api/grocery - Delete a grocery item
export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Item ID is required" },
        { status: 400 }
      );
    }

    await db.delete(groceryItems).where(eq(groceryItems.id, id));

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Error deleting grocery item:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete grocery item" },
      { status: 500 }
    );
  }
}
