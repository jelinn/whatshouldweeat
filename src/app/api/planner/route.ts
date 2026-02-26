import { NextRequest, NextResponse } from "next/server";
import { db, mealPlans, recipes } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";
import type { ApiResponse } from "@/types";

// Helper to get Monday of a given week
function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

// GET /api/planner - Get meal plan for a week
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get("week");

    // Default to current week
    const weekStart = weekParam || getMonday(new Date());

    // Get all meal plans for this week with recipe details
    const plans = await db.query.mealPlans.findMany({
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

    const response: ApiResponse<{
      weekStart: string;
      plans: typeof plans;
    }> = {
      success: true,
      data: {
        weekStart,
        plans,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching meal plan:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch meal plan" },
      { status: 500 }
    );
  }
}

// POST /api/planner - Add or update a meal plan entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { weekStart, dayOfWeek, mealType, recipeId, notes } = body;

    // Validate required fields
    if (weekStart === undefined || dayOfWeek === undefined || !mealType) {
      return NextResponse.json(
        { success: false, error: "weekStart, dayOfWeek, and mealType are required" },
        { status: 400 }
      );
    }

    // Check if entry already exists for this slot
    const existing = await db.query.mealPlans.findFirst({
      where: and(
        eq(mealPlans.weekStart, weekStart),
        eq(mealPlans.dayOfWeek, dayOfWeek),
        eq(mealPlans.mealType, mealType)
      ),
    });

    let plan;

    if (existing) {
      // Update existing entry - only update fields that are explicitly provided
      const updateData: Record<string, unknown> = {};
      if ('recipeId' in body) {
        updateData.recipeId = recipeId || null;
      }
      if ('notes' in body) {
        updateData.notes = notes || null;
      }

      const [updated] = await db
        .update(mealPlans)
        .set(updateData)
        .where(eq(mealPlans.id, existing.id))
        .returning();
      plan = updated;
    } else {
      // Create new entry
      const [created] = await db
        .insert(mealPlans)
        .values({
          weekStart,
          dayOfWeek,
          mealType,
          recipeId: recipeId || null,
          notes: notes || null,
        })
        .returning();
      plan = created;
    }

    // Fetch with recipe details
    const planWithRecipe = await db.query.mealPlans.findFirst({
      where: eq(mealPlans.id, plan.id),
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
      data: planWithRecipe,
    });
  } catch (error) {
    console.error("Error updating meal plan:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update meal plan" },
      { status: 500 }
    );
  }
}

// DELETE /api/planner - Clear a meal plan entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Plan ID is required" },
        { status: 400 }
      );
    }

    await db.delete(mealPlans).where(eq(mealPlans.id, id));

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete meal plan" },
      { status: 500 }
    );
  }
}
