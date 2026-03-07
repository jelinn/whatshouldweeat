"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CUISINES, MEAL_TYPES, DIFFICULTIES, INGREDIENT_CATEGORIES } from "@/lib/db/schema";
import { toast } from "sonner";
import { ImageUpload } from "@/components/recipes/image-upload";
import type { CreateRecipeInput } from "@/types";

interface IngredientInput {
  name: string;
  amount: string;
  unit: string;
  notes: string;
  category: string;
}

interface InstructionInput {
  instruction: string;
  timeMinutes: string;
}

export default function NewRecipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Basic info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  // Times and servings
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("");

  // Categorization
  const [difficulty, setDifficulty] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [mealType, setMealType] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  // Ingredients
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { name: "", amount: "", unit: "", notes: "", category: "" },
  ]);

  // Instructions
  const [instructions, setInstructions] = useState<InstructionInput[]>([
    { instruction: "", timeMinutes: "" },
  ]);

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { name: "", amount: "", unit: "", notes: "", category: "" },
    ]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (
    index: number,
    field: keyof IngredientInput,
    value: string
  ) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, { instruction: "", timeMinutes: "" }]);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const updateInstruction = (
    index: number,
    field: keyof InstructionInput,
    value: string
  ) => {
    const updated = [...instructions];
    updated[index][field] = value;
    setInstructions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Recipe title is required");
      return;
    }

    setLoading(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const recipeData: CreateRecipeInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        sourceName: sourceName.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        prepTimeMinutes: prepTime ? parseInt(prepTime) : undefined,
        cookTimeMinutes: cookTime ? parseInt(cookTime) : undefined,
        servings: servings ? parseInt(servings) : undefined,
        difficulty: difficulty || undefined,
        cuisine: cuisine || undefined,
        mealType: mealType || undefined,
        tags: tags.length > 0 ? tags : undefined,
        notes: notes.trim() || undefined,
        ingredients: ingredients
          .filter((ing) => ing.name.trim())
          .map((ing) => ({
            name: ing.name.trim(),
            amount: ing.amount ? parseFloat(ing.amount) : undefined,
            unit: ing.unit.trim() || undefined,
            notes: ing.notes.trim() || undefined,
            category: ing.category || undefined,
          })),
        instructions: instructions
          .filter((inst) => inst.instruction.trim())
          .map((inst, index) => ({
            stepNumber: index + 1,
            instruction: inst.instruction.trim(),
            timeMinutes: inst.timeMinutes
              ? parseInt(inst.timeMinutes)
              : undefined,
          })),
      };

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipeData),
      });

      const data = await res.json();

      if (data.success) {
        // Upload pending image if one was selected
        if (pendingImageFile) {
          const formData = new FormData();
          formData.append("image", pendingImageFile);
          await fetch(`/api/recipes/${data.data.id}/image`, {
            method: "POST",
            body: formData,
          });
        }
        toast.success("Recipe created successfully!");
        router.push(`/recipes/${data.data.id}`);
      } else {
        toast.error(data.error || "Failed to create recipe");
      }
    } catch {
      toast.error("Failed to create recipe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Add New Recipe</h1>
        <p className="text-muted-foreground">
          Fill in the details below to add a new recipe to your collection
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Recipe Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Grandma's Chocolate Chip Cookies"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of the recipe..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sourceUrl">Source URL</Label>
                <Input
                  id="sourceUrl"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="sourceName">Source Name</Label>
                <Input
                  id="sourceName"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g., Smitten Kitchen"
                />
              </div>
            </div>
            <div>
              <Label>Recipe Image</Label>
              <ImageUpload
                currentImageUrl={imageUrl || undefined}
                onImageChange={setImageUrl}
                onFileSelect={setPendingImageFile}
              />
            </div>
          </CardContent>
        </Card>

        {/* Times and Servings */}
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
                  min="0"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="15"
                />
              </div>
              <div>
                <Label htmlFor="cookTime">Cook Time (min)</Label>
                <Input
                  id="cookTime"
                  type="number"
                  min="0"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="4"
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
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cuisine</Label>
                <Select value={cuisine} onValueChange={setCuisine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
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
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
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
                placeholder="e.g., quick, comfort food, family favorite"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ingredients.map((ing, index) => (
              <div key={index} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    className="w-20"
                    value={ing.amount}
                    onChange={(e) =>
                      updateIngredient(index, "amount", e.target.value)
                    }
                    placeholder="2"
                  />
                  <Input
                    className="w-24"
                    value={ing.unit}
                    onChange={(e) =>
                      updateIngredient(index, "unit", e.target.value)
                    }
                    placeholder="cups"
                  />
                  <Input
                    className="flex-1"
                    value={ing.name}
                    onChange={(e) =>
                      updateIngredient(index, "name", e.target.value)
                    }
                    placeholder="all-purpose flour"
                  />
                  <Select
                    value={ing.category}
                    onValueChange={(v) => updateIngredient(index, "category", v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {INGREDIENT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIngredient(index)}
                    disabled={ingredients.length === 1}
                  >
                    ×
                  </Button>
                </div>
                <Input
                  className="ml-[108px]"
                  value={ing.notes}
                  onChange={(e) =>
                    updateIngredient(index, "notes", e.target.value)
                  }
                  placeholder="Notes (e.g., finely chopped, optional)"
                />
                {index < ingredients.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addIngredient}>
              + Add Ingredient
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {instructions.map((inst, index) => (
              <div key={index} className="flex gap-2">
                <span className="flex items-start pt-2 text-muted-foreground w-8">
                  {index + 1}.
                </span>
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={inst.instruction}
                    onChange={(e) =>
                      updateInstruction(index, "instruction", e.target.value)
                    }
                    placeholder="Describe this step..."
                    rows={2}
                  />
                  <Input
                    className="w-40"
                    type="number"
                    min="0"
                    value={inst.timeMinutes}
                    onChange={(e) =>
                      updateInstruction(index, "timeMinutes", e.target.value)
                    }
                    placeholder="Time (minutes)"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeInstruction(index)}
                  disabled={instructions.length === 1}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addInstruction}>
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
              placeholder="Add any personal notes, modifications, or tips..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Recipe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
