import type {
  Recipe,
  Ingredient,
  Instruction,
  NewRecipe,
  NewIngredient,
  NewInstruction,
} from "@/lib/db/schema";

// Full recipe with ingredients and instructions
export interface RecipeWithDetails extends Recipe {
  ingredients: Ingredient[];
  instructions: Instruction[];
}

// Input for creating a new recipe
export interface CreateRecipeInput {
  title: string;
  description?: string;
  sourceUrl?: string;
  sourceName?: string;
  imageUrl?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: number;
  difficulty?: string;
  cuisine?: string;
  mealType?: string;
  tags?: string[];
  notes?: string;
  ingredients: {
    name: string;
    amount?: number;
    unit?: string;
    notes?: string;
    category?: string;
  }[];
  instructions: {
    stepNumber: number;
    instruction: string;
    timeMinutes?: number;
  }[];
}

// Input for updating a recipe
export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  isLoved?: boolean;
  rating?: number;
  lastCookedAt?: Date;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Search/filter params
export interface RecipeFilters {
  search?: string;
  cuisine?: string;
  mealType?: string;
  difficulty?: string;
  isLoved?: boolean;
  minRating?: number;
  tags?: string[];
}

// Re-export schema types
export type { Recipe, Ingredient, Instruction, NewRecipe, NewIngredient, NewInstruction };
