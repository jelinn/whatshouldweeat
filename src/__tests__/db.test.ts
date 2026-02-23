import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../lib/db/schema";
import { resolve } from "path";
import { existsSync, unlinkSync, mkdirSync } from "fs";

// Test database path
const TEST_DB_PATH = resolve(__dirname, "../../data/test-recipes.db");

// Ensure test data directory exists
const dataDir = resolve(__dirname, "../../data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

let testSqlite: ReturnType<typeof Database>;
let testDb: ReturnType<typeof drizzle>;

beforeAll(() => {
  // Remove existing test database
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }

  // Create new test database
  testSqlite = new Database(TEST_DB_PATH);
  testSqlite.pragma("journal_mode = WAL");
  testDb = drizzle(testSqlite, { schema });

  // Create tables
  testSqlite.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      source_url TEXT,
      source_name TEXT,
      image_url TEXT,
      prep_time_minutes INTEGER,
      cook_time_minutes INTEGER,
      total_time_minutes INTEGER,
      servings INTEGER,
      difficulty TEXT,
      cuisine TEXT,
      meal_type TEXT,
      tags TEXT,
      is_loved INTEGER DEFAULT 0,
      rating INTEGER,
      notes TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      last_cooked_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount REAL,
      unit TEXT,
      notes TEXT,
      category TEXT,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS instructions (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      instruction TEXT NOT NULL,
      time_minutes INTEGER
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      meal_type TEXT NOT NULL,
      recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
      notes TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS grocery_items (
      id TEXT PRIMARY KEY,
      ingredient_name TEXT NOT NULL,
      amount REAL,
      unit TEXT,
      category TEXT,
      is_checked INTEGER DEFAULT 0,
      is_staple INTEGER DEFAULT 0,
      source_recipe_id TEXT REFERENCES recipes(id),
      week_start TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS staples (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT,
      default_amount REAL,
      default_unit TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS ai_interactions (
      id TEXT PRIMARY KEY,
      interaction_type TEXT,
      prompt TEXT,
      response TEXT,
      feedback TEXT,
      created_at INTEGER
    );
  `);
});

afterEach(() => {
  // Clean up tables after each test
  testSqlite.exec(`
    DELETE FROM instructions;
    DELETE FROM ingredients;
    DELETE FROM meal_plans;
    DELETE FROM grocery_items;
    DELETE FROM staples;
    DELETE FROM ai_interactions;
    DELETE FROM recipes;
  `);
});

afterAll(() => {
  testSqlite.close();
  // Clean up test database
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }
  // Clean up WAL files
  const walPath = TEST_DB_PATH + "-wal";
  const shmPath = TEST_DB_PATH + "-shm";
  if (existsSync(walPath)) unlinkSync(walPath);
  if (existsSync(shmPath)) unlinkSync(shmPath);
});
import {
  recipes,
  ingredients,
  instructions,
  mealPlans,
  groceryItems,
  staples,
} from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

describe("Database Operations", () => {
  describe("Recipes", () => {
    it("should create a recipe", async () => {
      const recipeId = createId();
      const [created] = await testDb
        .insert(recipes)
        .values({
          id: recipeId,
          title: "Test Recipe",
          description: "A test recipe",
          servings: 4,
          prepTimeMinutes: 15,
          cookTimeMinutes: 30,
          totalTimeMinutes: 45,
          cuisine: "Italian",
          difficulty: "easy",
        })
        .returning();

      expect(created).toBeDefined();
      expect(created.id).toBe(recipeId);
      expect(created.title).toBe("Test Recipe");
      expect(created.servings).toBe(4);
    });

    it("should fetch a recipe with ingredients and instructions", async () => {
      const recipeId = createId();

      // Create recipe
      await testDb.insert(recipes).values({
        id: recipeId,
        title: "Pasta Carbonara",
        cuisine: "Italian",
      });

      // Add ingredients
      await testDb.insert(ingredients).values([
        { id: createId(), recipeId, name: "Spaghetti", amount: 400, unit: "g", sortOrder: 0 },
        { id: createId(), recipeId, name: "Eggs", amount: 4, unit: "large", sortOrder: 1 },
        { id: createId(), recipeId, name: "Parmesan", amount: 100, unit: "g", sortOrder: 2 },
      ]);

      // Add instructions
      await testDb.insert(instructions).values([
        { id: createId(), recipeId, stepNumber: 1, instruction: "Cook pasta" },
        { id: createId(), recipeId, stepNumber: 2, instruction: "Mix eggs and cheese" },
        { id: createId(), recipeId, stepNumber: 3, instruction: "Combine and serve" },
      ]);

      // Fetch with relations
      const recipe = await testDb.query.recipes.findFirst({
        where: eq(recipes.id, recipeId),
        with: {
          ingredients: true,
          instructions: true,
        },
      });

      expect(recipe).toBeDefined();
      expect(recipe!.title).toBe("Pasta Carbonara");
      expect(recipe!.ingredients).toHaveLength(3);
      expect(recipe!.instructions).toHaveLength(3);
    });

    it("should update a recipe", async () => {
      const recipeId = createId();

      await testDb.insert(recipes).values({
        id: recipeId,
        title: "Original Title",
      });

      await testDb
        .update(recipes)
        .set({ title: "Updated Title", isLoved: true })
        .where(eq(recipes.id, recipeId));

      const updated = await testDb.query.recipes.findFirst({
        where: eq(recipes.id, recipeId),
      });

      expect(updated!.title).toBe("Updated Title");
      expect(updated!.isLoved).toBe(true);
    });

    it("should delete a recipe and cascade to ingredients/instructions", async () => {
      const recipeId = createId();

      await testDb.insert(recipes).values({
        id: recipeId,
        title: "To Delete",
      });

      await testDb.insert(ingredients).values({
        id: createId(),
        recipeId,
        name: "Ingredient",
      });

      await testDb.insert(instructions).values({
        id: createId(),
        recipeId,
        stepNumber: 1,
        instruction: "Step 1",
      });

      // Delete recipe
      await testDb.delete(recipes).where(eq(recipes.id, recipeId));

      // Verify cascade delete
      const remainingIngredients = await testDb.query.ingredients.findMany({
        where: eq(ingredients.recipeId, recipeId),
      });
      const remainingInstructions = await testDb.query.instructions.findMany({
        where: eq(instructions.recipeId, recipeId),
      });

      expect(remainingIngredients).toHaveLength(0);
      expect(remainingInstructions).toHaveLength(0);
    });

    it("should filter recipes by cuisine", async () => {
      await testDb.insert(recipes).values([
        { id: createId(), title: "Tacos", cuisine: "Mexican" },
        { id: createId(), title: "Pasta", cuisine: "Italian" },
        { id: createId(), title: "Sushi", cuisine: "Japanese" },
      ]);

      const italianRecipes = await testDb.query.recipes.findMany({
        where: eq(recipes.cuisine, "Italian"),
      });

      expect(italianRecipes).toHaveLength(1);
      expect(italianRecipes[0].title).toBe("Pasta");
    });

    it("should filter loved recipes", async () => {
      await testDb.insert(recipes).values([
        { id: createId(), title: "Loved Recipe", isLoved: true },
        { id: createId(), title: "Regular Recipe", isLoved: false },
      ]);

      const lovedRecipes = await testDb.query.recipes.findMany({
        where: eq(recipes.isLoved, true),
      });

      expect(lovedRecipes).toHaveLength(1);
      expect(lovedRecipes[0].title).toBe("Loved Recipe");
    });
  });

  describe("Meal Plans", () => {
    it("should create a meal plan entry", async () => {
      const recipeId = createId();
      await testDb.insert(recipes).values({
        id: recipeId,
        title: "Dinner Recipe",
      });

      const planId = createId();
      const [created] = await testDb
        .insert(mealPlans)
        .values({
          id: planId,
          weekStart: "2024-01-15",
          dayOfWeek: 0,
          mealType: "dinner",
          recipeId,
        })
        .returning();

      expect(created.weekStart).toBe("2024-01-15");
      expect(created.dayOfWeek).toBe(0);
      expect(created.mealType).toBe("dinner");
    });

    it("should fetch meal plans for a week", async () => {
      const recipeId = createId();
      await testDb.insert(recipes).values({
        id: recipeId,
        title: "Weekly Meal",
      });

      await testDb.insert(mealPlans).values([
        { id: createId(), weekStart: "2024-01-15", dayOfWeek: 0, mealType: "dinner", recipeId },
        { id: createId(), weekStart: "2024-01-15", dayOfWeek: 1, mealType: "dinner", recipeId },
        { id: createId(), weekStart: "2024-01-22", dayOfWeek: 0, mealType: "dinner", recipeId },
      ]);

      const weekPlans = await testDb.query.mealPlans.findMany({
        where: eq(mealPlans.weekStart, "2024-01-15"),
      });

      expect(weekPlans).toHaveLength(2);
    });

    it("should allow notes without a recipe", async () => {
      const [created] = await testDb
        .insert(mealPlans)
        .values({
          id: createId(),
          weekStart: "2024-01-15",
          dayOfWeek: 5,
          mealType: "dinner",
          notes: "Eating out - Italian restaurant",
        })
        .returning();

      expect(created.recipeId).toBeNull();
      expect(created.notes).toBe("Eating out - Italian restaurant");
    });
  });

  describe("Grocery Items", () => {
    it("should create grocery items from recipe ingredients", async () => {
      const recipeId = createId();
      await testDb.insert(recipes).values({
        id: recipeId,
        title: "Shopping Recipe",
      });

      await testDb.insert(groceryItems).values([
        {
          id: createId(),
          ingredientName: "Chicken",
          amount: 500,
          unit: "g",
          category: "meat",
          sourceRecipeId: recipeId,
          weekStart: "2024-01-15",
        },
        {
          id: createId(),
          ingredientName: "Rice",
          amount: 2,
          unit: "cups",
          category: "pantry",
          sourceRecipeId: recipeId,
          weekStart: "2024-01-15",
        },
      ]);

      const items = await testDb.query.groceryItems.findMany({
        where: eq(groceryItems.weekStart, "2024-01-15"),
      });

      expect(items).toHaveLength(2);
    });

    it("should toggle item checked status", async () => {
      const itemId = createId();
      await testDb.insert(groceryItems).values({
        id: itemId,
        ingredientName: "Milk",
        isChecked: false,
      });

      await testDb
        .update(groceryItems)
        .set({ isChecked: true })
        .where(eq(groceryItems.id, itemId));

      const updated = await testDb.query.groceryItems.findFirst({
        where: eq(groceryItems.id, itemId),
      });

      expect(updated!.isChecked).toBe(true);
    });
  });

  describe("Staples", () => {
    it("should create a staple item", async () => {
      const [created] = await testDb
        .insert(staples)
        .values({
          id: createId(),
          name: "Milk",
          category: "dairy",
        })
        .returning();

      expect(created.name).toBe("Milk");
      expect(created.category).toBe("dairy");
    });

    it("should enforce unique staple names", async () => {
      await testDb.insert(staples).values({
        id: createId(),
        name: "Eggs",
        category: "dairy",
      });

      // Attempting to insert duplicate should fail
      await expect(
        testDb.insert(staples).values({
          id: createId(),
          name: "Eggs",
          category: "dairy",
        })
      ).rejects.toThrow();
    });

    it("should list staples ordered by category and name", async () => {
      await testDb.insert(staples).values([
        { id: createId(), name: "Bread", category: "bakery" },
        { id: createId(), name: "Milk", category: "dairy" },
        { id: createId(), name: "Butter", category: "dairy" },
      ]);

      const allStaples = await testDb.query.staples.findMany({
        orderBy: (staples, { asc }) => [asc(staples.category), asc(staples.name)],
      });

      expect(allStaples).toHaveLength(3);
      expect(allStaples[0].name).toBe("Bread"); // bakery comes first
      expect(allStaples[1].name).toBe("Butter"); // dairy, alphabetically
      expect(allStaples[2].name).toBe("Milk");
    });
  });
});
