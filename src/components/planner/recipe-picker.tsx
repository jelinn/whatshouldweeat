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
}

export function RecipePicker({ open, onOpenChange, onSelect }: RecipePickerProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select a Recipe</DialogTitle>
          <DialogDescription>
            Choose a recipe for this meal slot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <ScrollArea className="h-[400px]">
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
              <div className="space-y-2">
                {filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => handleSelect(recipe.id)}
                    className="w-full p-3 rounded-lg border hover:bg-accent transition-colors text-left flex items-center gap-3"
                  >
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-2xl">
                        🍽️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {recipe.title}
                        </span>
                        {recipe.isLoved && (
                          <span className="text-red-500 text-sm">♥</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {recipe.totalTimeMinutes && (
                          <span>{recipe.totalTimeMinutes} min</span>
                        )}
                        {recipe.cuisine && (
                          <Badge variant="outline" className="text-xs">
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
