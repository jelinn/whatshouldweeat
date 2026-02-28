import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { db, recipes, ingredients, instructions } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { UpdateRecipeInput, RecipeWithDetails, ApiResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/recipes/[id] - Get a single recipe
export async function GET(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;

    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: {
        ingredients: {
          orderBy: (ingredients, { asc }) => [asc(ingredients.sortOrder)],
        },
        instructions: {
          orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
        },
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    const response: ApiResponse<RecipeWithDetails> = {
      success: true,
      data: recipe as RecipeWithDetails,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

// PATCH /api/recipes/[id] - Update a recipe
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body: UpdateRecipeInput = await request.json();

    // Check if recipe exists
    const existingRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
    });

    if (!existingRecipe) {
      return NextResponse.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.sourceUrl !== undefined) updateData.sourceUrl = body.sourceUrl;
    if (body.sourceName !== undefined) updateData.sourceName = body.sourceName;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.prepTimeMinutes !== undefined) updateData.prepTimeMinutes = body.prepTimeMinutes;
    if (body.cookTimeMinutes !== undefined) updateData.cookTimeMinutes = body.cookTimeMinutes;
    if (body.totalTimeMinutes !== undefined) updateData.totalTimeMinutes = body.totalTimeMinutes;
    if (body.servings !== undefined) updateData.servings = body.servings;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
    if (body.cuisine !== undefined) updateData.cuisine = body.cuisine;
    if (body.mealType !== undefined) updateData.mealType = body.mealType;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.isLoved !== undefined) updateData.isLoved = body.isLoved;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.lastCookedAt !== undefined) updateData.lastCookedAt = body.lastCookedAt;

    // Update the recipe
    await db.update(recipes).set(updateData).where(eq(recipes.id, id));

    // Update ingredients if provided
    if (body.ingredients !== undefined) {
      // Delete existing ingredients
      await db.delete(ingredients).where(eq(ingredients.recipeId, id));

      // Insert new ingredients
      if (body.ingredients.length > 0) {
        await db.insert(ingredients).values(
          body.ingredients.map((ing, index) => ({
            recipeId: id,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            notes: ing.notes,
            category: ing.category,
            sortOrder: index,
          }))
        );
      }
    }

    // Update instructions if provided
    if (body.instructions !== undefined) {
      // Delete existing instructions
      await db.delete(instructions).where(eq(instructions.recipeId, id));

      // Insert new instructions
      if (body.instructions.length > 0) {
        await db.insert(instructions).values(
          body.instructions.map((inst) => ({
            recipeId: id,
            stepNumber: inst.stepNumber,
            instruction: inst.instruction,
            timeMinutes: inst.timeMinutes,
          }))
        );
      }
    }

    // Fetch the updated recipe
    const updatedRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
      with: {
        ingredients: {
          orderBy: (ingredients, { asc }) => [asc(ingredients.sortOrder)],
        },
        instructions: {
          orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
        },
      },
    });

    const response: ApiResponse<RecipeWithDetails> = {
      success: true,
      data: updatedRecipe as RecipeWithDetails,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

// DELETE /api/recipes/[id] - Delete a recipe
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;

    // Check if recipe exists
    const existingRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, id),
    });

    if (!existingRecipe) {
      return NextResponse.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Delete the recipe (ingredients and instructions cascade delete)
    await db.delete(recipes).where(eq(recipes.id, id));

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
