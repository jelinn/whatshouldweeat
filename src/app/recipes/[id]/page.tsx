"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { RecipeWithDetails } from "@/types";

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export default function RecipePage({ params }: RecipePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [servingMultiplier, setServingMultiplier] = useState(1);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      const data = await res.json();

      if (data.success) {
        setRecipe(data.data);
      } else {
        toast.error("Recipe not found");
        router.push("/recipes");
      }
    } catch {
      toast.error("Failed to load recipe");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLove = async () => {
    if (!recipe) return;

    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLoved: !recipe.isLoved }),
      });

      if (res.ok) {
        setRecipe({ ...recipe, isLoved: !recipe.isLoved });
        toast.success(
          recipe.isLoved ? "Removed from favorites" : "Added to favorites"
        );
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleRate = async (rating: number) => {
    if (!recipe) return;

    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });

      if (res.ok) {
        setRecipe({ ...recipe, rating });
        toast.success("Rating updated");
      }
    } catch {
      toast.error("Failed to update rating");
    }
  };

  const handleMarkCooked = async () => {
    if (!recipe) return;

    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastCookedAt: new Date() }),
      });

      if (res.ok) {
        setRecipe({ ...recipe, lastCookedAt: new Date() });
        toast.success("Marked as cooked today!");
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Recipe deleted");
        router.push("/recipes");
      } else {
        toast.error("Failed to delete recipe");
      }
    } catch {
      toast.error("Failed to delete recipe");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const formatTime = (minutes: number | null | undefined) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number | null | undefined) => {
    if (!amount) return "";
    const scaled = amount * servingMultiplier;
    // Format nicely (avoid long decimals)
    if (scaled === Math.floor(scaled)) {
      return scaled.toString();
    }
    return scaled.toFixed(2).replace(/\.?0+$/, "");
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl font-bold">{recipe.title}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-2xl"
              onClick={handleToggleLove}
            >
              {recipe.isLoved ? (
                <span className="text-red-500">♥</span>
              ) : (
                <span className="text-muted-foreground">♡</span>
              )}
            </Button>
          </div>
        </div>

        {recipe.description && (
          <p className="text-muted-foreground mb-4">{recipe.description}</p>
        )}

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {recipe.cuisine && <Badge variant="secondary">{recipe.cuisine}</Badge>}
          {recipe.mealType && (
            <Badge variant="outline">
              {recipe.mealType.charAt(0).toUpperCase() + recipe.mealType.slice(1)}
            </Badge>
          )}
          {recipe.difficulty && (
            <Badge
              variant="outline"
              className={
                recipe.difficulty === "easy"
                  ? "border-green-500 text-green-600"
                  : recipe.difficulty === "medium"
                  ? "border-yellow-500 text-yellow-600"
                  : "border-red-500 text-red-600"
              }
            >
              {recipe.difficulty.charAt(0).toUpperCase() +
                recipe.difficulty.slice(1)}
            </Badge>
          )}
          {recipe.tags?.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Time info */}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-4">
          {recipe.prepTimeMinutes && (
            <span>Prep: {formatTime(recipe.prepTimeMinutes)}</span>
          )}
          {recipe.cookTimeMinutes && (
            <span>Cook: {formatTime(recipe.cookTimeMinutes)}</span>
          )}
          {recipe.totalTimeMinutes && (
            <span>Total: {formatTime(recipe.totalTimeMinutes)}</span>
          )}
          {recipe.servings && <span>Serves: {recipe.servings}</span>}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-muted-foreground">Rating:</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                className={`text-xl ${
                  recipe.rating && star <= recipe.rating
                    ? "text-yellow-500"
                    : "text-muted-foreground"
                }`}
              >
                {recipe.rating && star <= recipe.rating ? "★" : "☆"}
              </button>
            ))}
          </div>
        </div>

        {/* Source and dates */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {recipe.sourceName && (
            <span>
              Source:{" "}
              {recipe.sourceUrl ? (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {recipe.sourceName}
                </a>
              ) : (
                recipe.sourceName
              )}
            </span>
          )}
          {recipe.lastCookedAt && (
            <span>Last cooked: {formatDate(recipe.lastCookedAt)}</span>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Serving adjustment */}
      {recipe.servings && (
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm font-medium">Adjust servings:</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setServingMultiplier((m) => Math.max(0.5, m - 0.5))
              }
            >
              -
            </Button>
            <span className="w-20 text-center">
              {Math.round(recipe.servings * servingMultiplier)} servings
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setServingMultiplier((m) => m + 0.5)}
            >
              +
            </Button>
            {servingMultiplier !== 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setServingMultiplier(1)}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Ingredients */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          {recipe.ingredients.length > 0 ? (
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>
                    {ing.amount && (
                      <span className="font-medium">
                        {formatAmount(ing.amount)}
                      </span>
                    )}{" "}
                    {ing.unit && <span>{ing.unit}</span>} {ing.name}
                    {ing.notes && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({ing.notes})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No ingredients listed</p>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          {recipe.instructions.length > 0 ? (
            <ol className="space-y-4">
              {recipe.instructions.map((inst, index) => (
                <li key={inst.id} className="flex gap-4">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p>{inst.instruction}</p>
                    {inst.timeMinutes && (
                      <span className="text-sm text-muted-foreground">
                        ({inst.timeMinutes} min)
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">No instructions listed</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {recipe.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{recipe.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/recipes">Back to Recipes</Link>
          </Button>
          <Button variant="outline" onClick={handleMarkCooked}>
            Mark as Cooked Today
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/recipes/${id}/edit`}>Edit</Link>
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Recipe</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete &ldquo;{recipe.title}&rdquo;? This
                  action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
