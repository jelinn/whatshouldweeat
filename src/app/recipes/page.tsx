"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecipeCard } from "@/components/recipes/recipe-card";
import type { RecipeWithDetails } from "@/types";
import { CUISINES, MEAL_TYPES, DIFFICULTIES } from "@/lib/db/schema";
import { toast } from "sonner";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState<string>("");
  const [mealType, setMealType] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [lovedOnly, setLovedOnly] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("");

  // Fetch all unique tags on initial load (not from filtered results)
  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        const res = await fetch("/api/recipes?pageSize=1000");
        const data = await res.json();
        if (data.success) {
          const tags = new Set<string>();
          data.data.items.forEach((r: RecipeWithDetails) => {
            r.tags?.forEach((t) => tags.add(t));
          });
          setAllTags(Array.from(tags).sort());
        }
      } catch {
        // Ignore errors, tags will just be empty
      }
    };
    fetchAllTags();
  }, []); // Only run once on mount

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (cuisine && cuisine !== "all") params.set("cuisine", cuisine);
      if (mealType && mealType !== "all") params.set("mealType", mealType);
      if (difficulty && difficulty !== "all") params.set("difficulty", difficulty);
      if (lovedOnly) params.set("isLoved", "true");
      if (selectedTag && selectedTag !== "all") params.set("tag", selectedTag);

      const res = await fetch(`/api/recipes?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setRecipes(data.data.items);
      } else {
        toast.error("Failed to load recipes");
      }
    } catch {
      toast.error("Failed to load recipes");
    } finally {
      setLoading(false);
    }
  }, [search, cuisine, mealType, difficulty, lovedOnly, selectedTag]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleToggleLove = async (id: string, loved: boolean) => {
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLoved: loved }),
      });

      if (res.ok) {
        setRecipes((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isLoved: loved } : r))
        );
        toast.success(loved ? "Added to favorites" : "Removed from favorites");
      }
    } catch {
      toast.error("Failed to update recipe");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCuisine("");
    setMealType("");
    setDifficulty("");
    setLovedOnly(false);
    setSelectedTag("");
  };

  const hasFilters = search || cuisine || mealType || difficulty || lovedOnly || selectedTag;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recipes</h1>
          <p className="text-muted-foreground">
            Browse and manage your recipe collection
          </p>
        </div>
        <Button asChild>
          <Link href="/recipes/new">Add Recipe</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={cuisine} onValueChange={setCuisine}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Cuisine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cuisines</SelectItem>
            {CUISINES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mealType} onValueChange={setMealType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Meal Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {MEAL_TYPES.map((m) => (
              <SelectItem key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {allTags.length > 0 && (
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant={lovedOnly ? "default" : "outline"}
          onClick={() => setLovedOnly(!lovedOnly)}
        >
          {lovedOnly ? "♥ Favorites" : "♡ Favorites"}
        </Button>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {hasFilters
              ? "No recipes match your filters"
              : "No recipes yet. Add your first one!"}
          </p>
          {hasFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : (
            <Button asChild>
              <Link href="/recipes/new">Add Recipe</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggleLove={handleToggleLove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
