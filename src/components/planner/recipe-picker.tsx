"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Recipe {
  id: string;
  title: string;
  imageUrl?: string | null;
  totalTimeMinutes?: number | null;
  cuisine?: string | null;
  isLoved?: boolean;
}

interface RecipePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (recipeId: string | null) => void;
  onCustomMeal?: (mealText: string) => void;
}

export function RecipePicker({ open, onOpenChange, onSelect, onCustomMeal }: RecipePickerProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [customMeal, setCustomMeal] = useState("");

  useEffect(() => {
    if (open) {
      fetchRecipes();
    }
  }, [open]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recipes?pageSize=100");
      const data = await res.json();

      if (data.success) {
        setRecipes(data.data.items);
      }
    } catch {
      console.error("Failed to fetch recipes");
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (recipeId: string) => {
    onSelect(recipeId);
    setSearch("");
    setCustomMeal("");
  };

  const handleCustomMeal = () => {
    if (!customMeal.trim() || !onCustomMeal) return;
    onCustomMeal(customMeal.trim());
    setCustomMeal("");
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add a Meal</DialogTitle>
          <DialogDescription>
            Choose a recipe or enter a quick meal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick/Custom Meal Entry */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Meal</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Bacon and pancakes, Leftovers, Eating out..."
                value={customMeal}
                onChange={(e) => setCustomMeal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCustomMeal();
                  }
                }}
              />
              <Button
                onClick={handleCustomMeal}
                disabled={!customMeal.trim()}
                variant="secondary"
              >
                Add
              </Button>
            </div>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              or choose a recipe
            </span>
          </div>

          {/* Recipe Search */}
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <ScrollArea className="h-[350px]">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {recipes.length === 0
                  ? "No recipes yet. Add some recipes first!"
                  : "No recipes match your search"}
              </div>
            ) : (
              <div className="space-y-2 pr-3">
                {filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => handleSelect(recipe.id)}
                    className="w-full p-3 rounded-lg border hover:bg-accent transition-colors text-left flex items-center gap-3 overflow-hidden"
                  >
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="w-12 h-12 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-2xl shrink-0">
                        🍽️
                      </div>
                    )}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {recipe.title}
                        </span>
                        {recipe.isLoved && (
                          <span className="text-red-500 text-sm shrink-0">♥</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {recipe.totalTimeMinutes && (
                          <span className="shrink-0">{recipe.totalTimeMinutes} min</span>
                        )}
                        {recipe.cuisine && (
                          <Badge variant="outline" className="text-xs truncate">
                            {recipe.cuisine}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSearch("");
                setCustomMeal("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
