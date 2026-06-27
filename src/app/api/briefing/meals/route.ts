import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-key-guard";
import { db, mealPlans } from "@/lib/db";
import { inArray } from "drizzle-orm";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MEAL_ORDER: Record<string, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
  dessert: 4,
  appetizer: 5,
  side: 6,
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSunday(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// GET /api/briefing/meals?days=N
// Returns meals from today through today+N-1 (default 1, clamp 1..14).
// Auth: x-api-key header matching BRIEFING_API_KEY env var.
export async function GET(request: NextRequest) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const daysRaw = parseInt(searchParams.get("days") ?? "1", 10);
    const days = Math.min(Math.max(isNaN(daysRaw) ? 1 : daysRaw, 1), 14);

    const today = startOfDay(new Date());
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days - 1);

    const weekStarts = new Set<string>();
    const cursor = getSunday(today);
    while (cursor <= endDate) {
      weekStarts.add(formatDate(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }

    const plans = await db.query.mealPlans.findMany({
      where: inArray(mealPlans.weekStart, Array.from(weekStarts)),
      with: {
        recipe: {
          columns: {
            id: true,
            title: true,
            imageUrl: true,
            prepTimeMinutes: true,
            cookTimeMinutes: true,
            totalTimeMinutes: true,
            cuisine: true,
            mealType: true,
          },
        },
      },
    });

    const fromStr = formatDate(today);
    const toStr = formatDate(endDate);

    const meals = plans
      .map((p) => {
        const ws = new Date(p.weekStart + "T00:00:00");
        ws.setDate(ws.getDate() + p.dayOfWeek);
        return {
          date: formatDate(ws),
          dayOfWeek: DAY_NAMES[p.dayOfWeek] ?? null,
          mealType: p.mealType,
          recipe: p.recipe,
          notes: p.notes,
        };
      })
      .filter((m) => m.date >= fromStr && m.date <= toStr)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (MEAL_ORDER[a.mealType] ?? 99) - (MEAL_ORDER[b.mealType] ?? 99);
      });

    return NextResponse.json({
      success: true,
      data: { from: fromStr, to: toStr, meals },
    });
  } catch (error) {
    console.error("Error fetching briefing meals:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch meals" },
      { status: 500 }
    );
  }
}
