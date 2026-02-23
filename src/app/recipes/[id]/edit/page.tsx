"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CUISINES, MEAL_TYPES, DIFFICULTIES } from "@/lib/db/schema";
import type { RecipeWithDetails } from "@/types";

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [mealType, setMealType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState<
    { id?: string; name: string; amount?: number; unit?: string; notes?: string }[]
  >([]);
  const [instructions, setInstructions] = useState<
    { id?: string; stepNumber: number; instruction: string }[]
  >([]);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      const data = await res.json();

      if (data.success) {
        const recipe: RecipeWithDetails = data.data;
        setTitle(recipe.title);
        setDescription(recipe.description || "");
        setCuisine(recipe.cuisine || "");
        setMealType(recipe.mealType || "");
        setDifficulty(recipe.difficulty || "");
        setTagsInput(recipe.tags?.join(", ") || "");
        setNotes(recipe.notes || "");
        setPrepTime(recipe.prepTimeMinutes?.toString() || "");
        setCookTime(recipe.cookTimeMinutes?.toString() || "");
        setServings(recipe.servings?.toString() || "");
        setIngredients(
          recipe.ingredients.map((ing) => ({
            id: ing.id,
            name: ing.name,
            amount: ing.amount ?? undefined,
            unit: ing.unit ?? undefined,
            notes: ing.notes ?? undefined,
          }))
        );
        setInstructions(
          recipe.instructions.map((inst) => ({
            id: inst.id,
            stepNumber: inst.stepNumber,
            instruction: inst.instruction,
          }))
        );
      } else {
        toast.error("Recipe not found");
        router.push("/recipes");
      }
    } catch {
      toast.error("Failed to load recipe");
      router.push("/recipes");
    } finally {
      setLoading(false);
    }
  };

  const updateIngredient = (
    index: number,
    field: string,
    value: string | number | undefined
  ) => {
    const updated = [...ingredients];
    (updated[index] as Record<string, unknown>)[field] = value;
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { name: "", amount: undefined, unit: "", notes: "" },
    ]);
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index].instruction = value;
    setInstructions(updated);
  };

  const removeInstruction = (index: number) => {
    const updated = instructions
      .filter((_, i) => i !== index)
      .map((inst, i) => ({ ...inst, stepNumber: i + 1 }));
    setInstructions(updated);
  };

  const addInstruction = () => {
    setInstructions([
      ...instructions,
      { stepNumber: instructions.length + 1, instruction: "" },
    ]);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Recipe title is required");
      return;
    }

    setSaving(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const totalTime =
        (prepTime ? parseInt(prepTime) : 0) + (cookTime ? parseInt(cookTime) : 0);

      const res = await fetch(`/api/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          cuisine: cuisine || null,
          mealType: mealType || null,
          difficulty: difficulty || null,
          tags: tags.length > 0 ? tags : null,
          notes: notes.trim() || null,
          prepTimeMinutes: prepTime ? parseInt(prepTime) : null,
          cookTimeMinutes: cookTime ? parseInt(cookTime) : null,
          totalTimeMinutes: totalTime > 0 ? totalTime : null,
          servings: servings ? parseInt(servings) : null,
          ingredients: ingredients
            .filter((ing) => ing.name.trim())
            .map((ing, index) => ({
              name: ing.name.trim(),
              amount: ing.amount,
              unit: ing.unit?.trim() || null,
              notes: ing.notes?.trim() || null,
              sortOrder: index,
            })),
          instructions: instructions
            .filter((inst) => inst.instruction.trim())
            .map((inst, index) => ({
              stepNumber: index + 1,
              instruction: inst.instruction.trim(),
            })),
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Recipe updated!");
        router.push(`/recipes/${id}`);
      } else {
        toast.error(data.error || "Failed to update recipe");
      }
    } catch {
      toast.error("Failed to update recipe");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Recipe</h1>
        <p className="text-muted-foreground">
          Update recipe details, ingredients, and instructions
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Time & Servings */}
        <Card>
          <CardHeader>
            <CardTitle>Time & Servings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="prepTime">Prep Time (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cookTime">Cook Time (min)</Label>
                <Input
                  id="cookTime"
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categorization */}
        <Card>
          <CardHeader>
            <CardTitle>Categorization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cuisine</Label>
                <Select value={cuisine || "none"} onValueChange={(v) => setCuisine(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {CUISINES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Meal Type</Label>
                <Select value={mealType || "none"} onValueChange={(v) => setMealType(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {MEAL_TYPES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={difficulty || "none"} onValueChange={(v) => setDifficulty(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="quick, comfort food, weeknight"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>Ingredients ({ingredients.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ingredients.map((ing, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Input
                  className="w-20"
                  value={ing.amount || ""}
                  onChange={(e) =>
                    updateIngredient(
                      index,
                      "amount",
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  placeholder="Amt"
                  type="number"
                  step="0.25"
                />
                <Input
                  className="w-24"
                  value={ing.unit || ""}
                  onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                  placeholder="Unit"
                />
                <Input
                  className="flex-1"
                  value={ing.name}
                  onChange={(e) => updateIngredient(index, "name", e.target.value)}
                  placeholder="Ingredient"
                />
                <Input
                  className="w-32"
                  value={ing.notes || ""}
                  onChange={(e) => updateIngredient(index, "notes", e.target.value)}
                  placeholder="Notes"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIngredient(index)}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addIngredient}>
              + Add Ingredient
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions ({instructions.length} steps)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {instructions.map((inst, index) => (
              <div key={index} className="flex gap-2">
                <span className="flex items-start pt-2 text-muted-foreground w-8">
                  {index + 1}.
                </span>
                <Textarea
                  className="flex-1"
                  value={inst.instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  rows={2}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeInstruction(index)}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addInstruction}>
              + Add Step
            </Button>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any personal notes or modifications..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" asChild>
            <Link href={`/recipes/${id}`}>Cancel</Link>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
