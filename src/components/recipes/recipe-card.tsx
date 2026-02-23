"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RecipeWithDetails } from "@/types";

interface RecipeCardProps {
  recipe: RecipeWithDetails;
  onToggleLove?: (id: string, loved: boolean) => void;
}

export function RecipeCard({ recipe, onToggleLove }: RecipeCardProps) {
  const formatTime = (minutes: number | null | undefined) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleLoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleLove?.(recipe.id, !recipe.isLoved);
  };

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">{recipe.title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 w-8 p-0"
              onClick={handleLoveClick}
            >
              <span className={recipe.isLoved ? "text-red-500" : "text-muted-foreground"}>
                {recipe.isLoved ? "♥" : "♡"}
              </span>
            </Button>
          </div>
          {recipe.description && (
            <CardDescription className="line-clamp-2">
              {recipe.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {recipe.cuisine && (
              <Badge variant="secondary" className="text-xs">
                {recipe.cuisine}
              </Badge>
            )}
            {recipe.mealType && (
              <Badge variant="outline" className="text-xs">
                {recipe.mealType}
              </Badge>
            )}
            {recipe.difficulty && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  recipe.difficulty === "easy"
                    ? "border-green-500 text-green-600"
                    : recipe.difficulty === "medium"
                    ? "border-yellow-500 text-yellow-600"
                    : "border-red-500 text-red-600"
                }`}
              >
                {recipe.difficulty}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {recipe.totalTimeMinutes && (
              <span>{formatTime(recipe.totalTimeMinutes)}</span>
            )}
            {recipe.servings && <span>{recipe.servings} servings</span>}
            {recipe.rating && (
              <span className="flex items-center">
                {"★".repeat(recipe.rating)}
                {"☆".repeat(5 - recipe.rating)}
              </span>
            )}
          </div>

          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {recipe.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{recipe.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {recipe.sourceName && recipe.sourceName !== "Manual Entry" && (
            <p className="text-xs text-muted-foreground mt-2">
              From: {recipe.sourceName}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
