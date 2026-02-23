import { NextRequest, NextResponse } from "next/server";
import { db, recipes, ingredients, instructions } from "@/lib/db";
import { eq, desc, like, and, or, gte } from "drizzle-orm";
import type {
  CreateRecipeInput,
  RecipeWithDetails,
  ApiResponse,
  RecipeFilters,
} from "@/types";

// GET /api/recipes - List all recipes with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search");
    const cuisine = searchParams.get("cuisine");
    const mealType = searchParams.get("mealType");
    const difficulty = searchParams.get("difficulty");
    const isLoved = searchParams.get("isLoved");
    const tag = searchParams.get("tag");
    const minRating = searchParams.get("minRating");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    // Build where conditions
    const conditions = [];

    if (search) {
      // Search in title, description, and tags
      conditions.push(
        or(
          like(recipes.title, `%${search}%`),
          like(recipes.description, `%${search}%`),
          like(recipes.tags, `%${search}%`)
        )
      );
    }

    if (cuisine) {
      conditions.push(eq(recipes.cuisine, cuisine));
    }

    if (mealType) {
      conditions.push(eq(recipes.mealType, mealType));
    }

    if (difficulty) {
      conditions.push(eq(recipes.difficulty, difficulty));
    }

    if (isLoved === "true") {
      conditions.push(eq(recipes.isLoved, true));
    }

    if (tag) {
      // Tags are stored as JSON array, search within it (case-insensitive)
      // Use lowercase comparison for case-insensitive matching
      conditions.push(like(recipes.tags, `%${tag.toLowerCase()}%`));
    }

    if (minRating) {
      conditions.push(gte(recipes.rating, parseInt(minRating)));
    }

    // Query recipes
    const allRecipes = await db.query.recipes.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(recipes.createdAt)],
      with: {
        ingredients: true,
        instructions: {
          orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
        },
      },
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    // Get total count for pagination
    const allForCount = await db.query.recipes.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      columns: { id: true },
    });

    const total = allForCount.length;

    const response: ApiResponse<{
      items: RecipeWithDetails[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }> = {
      success: true,
      data: {
        items: allRecipes as RecipeWithDetails[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

// POST /api/recipes - Create a new recipe
export async function POST(request: NextRequest) {
  try {
    const body: CreateRecipeInput = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    // Calculate total time if not provided
    const totalTime =
      body.totalTimeMinutes ||
      (body.prepTimeMinutes || 0) + (body.cookTimeMinutes || 0) || undefined;

    // Insert the recipe
    const [newRecipe] = await db
      .insert(recipes)
      .values({
        title: body.title,
        description: body.description,
        sourceUrl: body.sourceUrl,
        sourceName: body.sourceName || "Manual Entry",
        imageUrl: body.imageUrl,
        prepTimeMinutes: body.prepTimeMinutes,
        cookTimeMinutes: body.cookTimeMinutes,
        totalTimeMinutes: totalTime,
        servings: body.servings,
        difficulty: body.difficulty,
        cuisine: body.cuisine,
        mealType: body.mealType,
        tags: body.tags,
        notes: body.notes,
      })
      .returning();

    // Insert ingredients
    if (body.ingredients && body.ingredients.length > 0) {
      await db.insert(ingredients).values(
        body.ingredients.map((ing, index) => ({
          recipeId: newRecipe.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          notes: ing.notes,
          category: ing.category,
          sortOrder: index,
        }))
      );
    }

    // Insert instructions
    if (body.instructions && body.instructions.length > 0) {
      await db.insert(instructions).values(
        body.instructions.map((inst) => ({
          recipeId: newRecipe.id,
          stepNumber: inst.stepNumber,
          instruction: inst.instruction,
          timeMinutes: inst.timeMinutes,
        }))
      );
    }

    // Fetch the complete recipe with relations
    const completeRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, newRecipe.id),
      with: {
        ingredients: true,
        instructions: {
          orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
        },
      },
    });

    const response: ApiResponse<RecipeWithDetails> = {
      success: true,
      data: completeRecipe as RecipeWithDetails,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
