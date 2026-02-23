import { NextRequest, NextResponse } from "next/server";
import { db, staples } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET /api/staples - Get all staples
export async function GET() {
  try {
    const allStaples = await db.query.staples.findMany({
      orderBy: (staples, { asc }) => [asc(staples.category), asc(staples.name)],
    });

    return NextResponse.json({
      success: true,
      data: allStaples,
    });
  } catch (error) {
    console.error("Error fetching staples:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch staples" },
      { status: 500 }
    );
  }
}

// POST /api/staples - Add a new staple
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, defaultAmount, defaultUnit } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Check if staple already exists
    const existing = await db.query.staples.findFirst({
      where: eq(staples.name, name),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Staple already exists" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(staples)
      .values({
        name,
        category: category || "other",
        defaultAmount,
        defaultUnit,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error("Error creating staple:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create staple" },
      { status: 500 }
    );
  }
}

// DELETE /api/staples - Delete a staple
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Staple ID is required" },
        { status: 400 }
      );
    }

    await db.delete(staples).where(eq(staples.id, id));

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Error deleting staple:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete staple" },
      { status: 500 }
    );
  }
}
