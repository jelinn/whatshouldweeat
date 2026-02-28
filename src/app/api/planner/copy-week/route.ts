import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { db, mealPlans } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getMealDate, isPastOrToday, recordCook } from "@/lib/services/cook-tracker";

// POST /api/planner/copy-week - Copy meal plan from one week to another
export async function POST(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { sourceWeek, targetWeek, overwrite = false } = body;

    if (!sourceWeek || !targetWeek) {
      return NextResponse.json(
        { success: false, error: "sourceWeek and targetWeek are required" },
        { status: 400 }
      );
    }

    // Get source week's plans
    const sourcePlans = await db.query.mealPlans.findMany({
      where: eq(mealPlans.weekStart, sourceWeek),
    });

    if (sourcePlans.length === 0) {
      return NextResponse.json(
        { success: false, error: "No meal plans found for source week" },
        { status: 400 }
      );
    }

    // Get existing target week plans
    const existingTargetPlans = await db.query.mealPlans.findMany({
      where: eq(mealPlans.weekStart, targetWeek),
    });

    const existingSlots = new Set(
      existingTargetPlans.map((p) => `${p.dayOfWeek}-${p.mealType}`)
    );

    let copiedCount = 0;

    for (const plan of sourcePlans) {
      const slotKey = `${plan.dayOfWeek}-${plan.mealType}`;

      if (existingSlots.has(slotKey)) {
        if (overwrite) {
          // Delete existing and create new
          const existing = existingTargetPlans.find(
            (p) => p.dayOfWeek === plan.dayOfWeek && p.mealType === plan.mealType
          );
          if (existing) {
            await db.delete(mealPlans).where(eq(mealPlans.id, existing.id));
          }
        } else {
          // Skip this slot
          continue;
        }
      }

      // Copy the plan
      const [copied] = await db.insert(mealPlans).values({
        weekStart: targetWeek,
        dayOfWeek: plan.dayOfWeek,
        mealType: plan.mealType,
        recipeId: plan.recipeId,
        notes: plan.notes,
      }).returning();

      if (copied.recipeId) {
        const mealDate = getMealDate(targetWeek, plan.dayOfWeek);
        if (isPastOrToday(mealDate)) {
          await recordCook(copied.recipeId, mealDate, copied.id);
        }
      }

      copiedCount++;
    }

    // Fetch updated target week plans
    const updatedPlans = await db.query.mealPlans.findMany({
      where: eq(mealPlans.weekStart, targetWeek),
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
        weekStart: targetWeek,
        plans: updatedPlans,
        copied: copiedCount,
      },
    });
  } catch (error) {
    console.error("Error copying meal plan:", error);
    return NextResponse.json(
      { success: false, error: "Failed to copy meal plan" },
      { status: 500 }
    );
  }
}
