import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// Cuisines enum for predefined categories
export const CUISINES = [
  "American",
  "Italian",
  "Mexican",
  "Asian",
  "Chinese",
  "Japanese",
  "Indian",
  "Thai",
  "Mediterranean",
  "French",
  "Greek",
  "Middle Eastern",
  "Korean",
  "Vietnamese",
  "Other",
] as const;

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
  "appetizer",
  "side",
] as const;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const INGREDIENT_CATEGORIES = [
  "produce",
  "dairy",
  "meat",
  "seafood",
  "pantry",
  "frozen",
  "bakery",
  "beverages",
  "condiments",
  "spices",
  "other",
] as const;

// Core recipe storage
export const recipes = sqliteTable("recipes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"), // "Smitten Kitchen", "Manual Entry", etc.
  imageUrl: text("image_url"),
  prepTimeMinutes: integer("prep_time_minutes"),
  cookTimeMinutes: integer("cook_time_minutes"),
  totalTimeMinutes: integer("total_time_minutes"),
  servings: integer("servings"),
  difficulty: text("difficulty"), // easy, medium, hard
  cuisine: text("cuisine"), // Italian, Mexican, Asian, etc.
  mealType: text("meal_type"), // breakfast, lunch, dinner, snack, dessert
  tags: text("tags", { mode: "json" }).$type<string[]>(), // JSON array of custom tags
  isLoved: integer("is_loved", { mode: "boolean" }).default(false),
  rating: integer("rating"), // 1-5 stars
  notes: text("notes"), // personal notes/modifications
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  lastCookedAt: integer("last_cooked_at", { mode: "timestamp" }),
});

// Recipe ingredients (normalized for grocery list generation)
export const ingredients = sqliteTable("ingredients", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: real("amount"),
  unit: text("unit"),
  notes: text("notes"), // "finely chopped", "optional", etc.
  category: text("category"), // produce, dairy, pantry, meat, etc.
  sortOrder: integer("sort_order"),
});

// Recipe instructions (step by step)
export const instructions = sqliteTable("instructions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  instruction: text("instruction").notNull(),
  timeMinutes: integer("time_minutes"), // optional timing for this step
});

// Weekly meal planner
export const mealPlans = sqliteTable("meal_plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  weekStart: text("week_start").notNull(), // Sunday of the week (YYYY-MM-DD)
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 6=Saturday
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  recipeId: text("recipe_id").references(() => recipes.id, {
    onDelete: "set null",
  }),
  notes: text("notes"), // "leftovers", "eating out", custom meal
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Grocery list items
export const groceryItems = sqliteTable("grocery_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  ingredientName: text("ingredient_name").notNull(),
  amount: real("amount"),
  unit: text("unit"),
  category: text("category"),
  isChecked: integer("is_checked", { mode: "boolean" }).default(false),
  isStaple: integer("is_staple", { mode: "boolean" }).default(false),
  sourceRecipeId: text("source_recipe_id").references(() => recipes.id),
  weekStart: text("week_start"), // which week's plan this belongs to
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Persistent staple items (always on grocery list)
export const staples = sqliteTable("staples", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  category: text("category"),
  defaultAmount: real("default_amount"),
  defaultUnit: text("default_unit"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Cook history tracking
export const cookHistory = sqliteTable("cook_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  cookedAt: text("cooked_at").notNull(), // YYYY-MM-DD
  source: text("source").notNull(), // "meal_plan" | "manual"
  mealPlanId: text("meal_plan_id").references(() => mealPlans.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// AI interaction history (for better recommendations)
export const aiInteractions = sqliteTable("ai_interactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  interactionType: text("interaction_type"), // recommend, generate, feedback
  prompt: text("prompt"),
  response: text("response"),
  feedback: text("feedback"), // user feedback on quality
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Auth tables (NextAuth.js / @auth/drizzle-adapter)
export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  password: text("password"),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

// Relations
export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(ingredients),
  instructions: many(instructions),
  cookHistory: many(cookHistory),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [ingredients.recipeId],
    references: [recipes.id],
  }),
}));

export const instructionsRelations = relations(instructions, ({ one }) => ({
  recipe: one(recipes, {
    fields: [instructions.recipeId],
    references: [recipes.id],
  }),
}));

export const mealPlansRelations = relations(mealPlans, ({ one }) => ({
  recipe: one(recipes, {
    fields: [mealPlans.recipeId],
    references: [recipes.id],
  }),
}));

export const cookHistoryRelations = relations(cookHistory, ({ one }) => ({
  recipe: one(recipes, {
    fields: [cookHistory.recipeId],
    references: [recipes.id],
  }),
  mealPlan: one(mealPlans, {
    fields: [cookHistory.mealPlanId],
    references: [mealPlans.id],
  }),
}));

// Types
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type Instruction = typeof instructions.$inferSelect;
export type NewInstruction = typeof instructions.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;
export type NewMealPlan = typeof mealPlans.$inferInsert;
export type GroceryItem = typeof groceryItems.$inferSelect;
export type NewGroceryItem = typeof groceryItems.$inferInsert;
export type Staple = typeof staples.$inferSelect;
export type NewStaple = typeof staples.$inferInsert;
export type CookHistory = typeof cookHistory.$inferSelect;
export type NewCookHistory = typeof cookHistory.$inferInsert;
