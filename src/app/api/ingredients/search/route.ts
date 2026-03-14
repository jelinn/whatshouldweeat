import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { db, ingredients } from "@/lib/db";
import { sql } from "drizzle-orm";

// GET /api/ingredients/search?q=che - Search distinct ingredient names
export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results = await db
      .selectDistinct({ name: ingredients.name, category: ingredients.category })
      .from(ingredients)
      .where(sql`lower(${ingredients.name}) LIKE lower(${`%${query}%`})`)
      .limit(10);

    // Deduplicate by lowercase name, preferring entries with a category
    const seen = new Map<string, { name: string; category: string | null }>();
    for (const r of results) {
      const key = r.name.toLowerCase();
      const existing = seen.get(key);
      if (!existing || (!existing.category && r.category)) {
        seen.set(key, r);
      }
    }

    return NextResponse.json({
      success: true,
      data: Array.from(seen.values()),
    });
  } catch (error) {
    console.error("Error searching ingredients:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search ingredients" },
      { status: 500 }
    );
  }
}
