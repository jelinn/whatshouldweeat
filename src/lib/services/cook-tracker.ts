import { db, cookHistory, recipes } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

/**
 * Compute the YYYY-MM-DD date for a given weekStart + dayOfWeek offset.
 * dayOfWeek: 0=Sunday … 6=Saturday. weekStart is the Monday (ISO week start).
 * We map: Mon=1, Tue=2, … Sat=6, Sun=0 → offsets 0–6 from Monday.
 */
export function getMealDate(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart + "T00:00:00");
  // dayOfWeek 0=Sun,1=Mon,...6=Sat → offset from Monday
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

export function isPastOrToday(dateStr: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return dateStr <= today;
}

/**
 * Record a cook event and update the recipe's lastCookedAt if this is the most recent cook.
 */
export async function recordCook(
  recipeId: string,
  dateStr: string,
  mealPlanId?: string
) {
  // Check for duplicate (same recipe + same date + same meal plan)
  const existing = await db.query.cookHistory.findFirst({
    where: and(
      eq(cookHistory.recipeId, recipeId),
      eq(cookHistory.cookedAt, dateStr),
      ...(mealPlanId ? [eq(cookHistory.mealPlanId, mealPlanId)] : [])
    ),
  });

  if (existing) return;

  await db.insert(cookHistory).values({
    recipeId,
    cookedAt: dateStr,
    source: "meal_plan",
    mealPlanId: mealPlanId ?? null,
  });

  // Update recipe.lastCookedAt if this date is the most recent
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
    columns: { lastCookedAt: true },
  });

  const cookedDate = new Date(dateStr + "T00:00:00");
  if (!recipe?.lastCookedAt || cookedDate > recipe.lastCookedAt) {
    await db
      .update(recipes)
      .set({ lastCookedAt: cookedDate })
      .where(eq(recipes.id, recipeId));
  }
}
