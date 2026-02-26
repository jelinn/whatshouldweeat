"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CUISINES, MEAL_TYPES, DIFFICULTIES, INGREDIENT_CATEGORIES } from "@/lib/db/schema";
import type { CreateRecipeInput } from "@/types";

interface ExtractedRecipe {
  title: string;
  description?: string;
  imageUrl?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: number;
  ingredients: {
    name: string;
    amount?: number;
    unit?: string;
    notes?: string;
  }[];
  instructions: {
    stepNumber: number;
    instruction: string;
  }[];
  sourceName?: string;
  sourceUrl?: string;
}

type ImportSource = "json-ld" | "llm-html" | "llm-text";

export default function ImportRecipePage() {
  const router = useRouter();

  // Import state
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSource, setImportSource] = useState<ImportSource | null>(null);

  // Extracted recipe state (for editing before save)
  const [recipe, setRecipe] = useState<ExtractedRecipe | null>(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [mealType, setMealType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState<ExtractedRecipe["ingredients"]>([]);
  const [instructions, setInstructions] = useState<ExtractedRecipe["instructions"]>([]);

  // Saving state
  const [saving, setSaving] = useState(false);

  const handleImportUrl = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), useLLM: true }),
      });

      const data = await res.json();

      if (data.success) {
        setRecipe(data.data.recipe);
        setImportSource(data.data.source);
        populateEditableFields(data.data.recipe);

        if (data.data.warnings) {
          data.data.warnings.forEach((w: string) => toast.warning(w));
        }

        toast.success(
          data.data.source === "json-ld"
            ? "Recipe extracted from structured data"
            : "Recipe extracted using AI"
        );
      } else {
        toast.error(data.error || "Failed to import recipe");
      }
    } catch {
      toast.error("Failed to import recipe");
    } finally {
      setImporting(false);
    }
  };

  const handleImportText = async () => {
    if (!text.trim()) {
      toast.error("Please paste the recipe text");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setRecipe(data.data.recipe);
        setImportSource(data.data.source);
        populateEditableFields(data.data.recipe);
        toast.success("Recipe extracted from text");
      } else {
        toast.error(data.error || "Failed to extract recipe");
      }
    } catch {
      toast.error("Failed to extract recipe");
    } finally {
      setImporting(false);
    }
  };

  const populateEditableFields = (r: ExtractedRecipe) => {
    setTitle(r.title || "");
    setDescription(r.description || "");
    setIngredients(
      (r.ingredients || []).map((ing) => ({
        name: ing.name || "",
        amount: ing.amount,
        unit: ing.unit || "",
        notes: ing.notes || "",
      }))
    );
    setInstructions(
      (r.instructions || []).map((inst, idx) => ({
        stepNumber: inst.stepNumber || idx + 1,
        instruction: inst.instruction || "",
      }))
    );
  };

  const updateIngredient = (
    index: number,
    field: keyof ExtractedRecipe["ingredients"][0],
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
    setIngredients([...ingredients, { name: "", amount: undefined, unit: "", notes: "" }]);
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

      // Sanitize amounts - ensure they're valid numbers or undefined
      const sanitizeAmount = (val: number | undefined): number | undefined => {
        if (val === undefined || val === null) return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
      };

      const recipeData: CreateRecipeInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        sourceUrl: recipe?.sourceUrl,
        sourceName: recipe?.sourceName,
        imageUrl: recipe?.imageUrl,
        prepTimeMinutes: sanitizeAmount(recipe?.prepTimeMinutes),
        cookTimeMinutes: sanitizeAmount(recipe?.cookTimeMinutes),
        totalTimeMinutes: sanitizeAmount(recipe?.totalTimeMinutes),
        servings: sanitizeAmount(recipe?.servings),
        difficulty: difficulty || undefined,
        cuisine: cuisine || undefined,
        mealType: mealType || undefined,
        tags: tags.length > 0 ? tags : undefined,
        notes: notes.trim() || undefined,
        ingredients: ingredients
          .filter((ing) => ing.name && ing.name.trim())
          .map((ing, index) => ({
            name: ing.name.trim(),
            amount: sanitizeAmount(ing.amount),
            unit: ing.unit?.trim() || undefined,
            notes: ing.notes?.trim() || undefined,
          })),
        instructions: instructions
          .filter((inst) => inst.instruction && inst.instruction.trim())
          .map((inst, index) => ({
            stepNumber: index + 1,
            instruction: inst.instruction.trim(),
          })),
      };

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipeData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Recipe saved!");
        router.push(`/recipes/${data.data.id}`);
      } else {
        console.error("Recipe save failed:", data.error);
        toast.error(data.error || "Failed to save recipe");
      }
    } catch (error) {
      console.error("Recipe save error:", error);
      toast.error("Failed to save recipe. Check the console for details.");
    } finally {
      setSaving(false);
    }
  };

  const resetImport = () => {
    setRecipe(null);
    setImportSource(null);
    setUrl("");
    setText("");
    setTitle("");
    setDescription("");
    setCuisine("");
    setMealType("");
    setDifficulty("");
    setTagsInput("");
    setNotes("");
    setIngredients([]);
    setInstructions([]);
  };

  // Show import form if no recipe extracted yet
  if (!recipe) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Import Recipe</h1>
          <p className="text-muted-foreground">
            Import a recipe from a URL or paste the recipe text
          </p>
        </div>

        <Tabs defaultValue="url" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">From URL</TabsTrigger>
            <TabsTrigger value="text">Paste Text</TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <Card>
              <CardHeader>
                <CardTitle>Import from URL</CardTitle>
                <CardDescription>
                  Paste a link to a recipe from sites like Smitten Kitchen, Serious Eats, or any food blog
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="url">Recipe URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://smittenkitchen.com/..."
                    disabled={importing}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Works best with:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Food blogs with structured recipe data</li>
                    <li>Sites like Smitten Kitchen, Serious Eats, Budget Bytes</li>
                    <li>Any site using Recipe schema markup</li>
                  </ul>
                  <p className="mt-2">
                    If structured data isn&apos;t found, AI will attempt to extract the recipe.
                  </p>
                </div>
                <Button
                  onClick={handleImportUrl}
                  disabled={importing || !url.trim()}
                  className="w-full"
                >
                  {importing ? "Importing..." : "Import Recipe"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text">
            <Card>
              <CardHeader>
                <CardTitle>Paste Recipe Text</CardTitle>
                <CardDescription>
                  Copy and paste a recipe from any source, including paywalled sites like NYTimes Cooking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="text">Recipe Text</Label>
                  <Textarea
                    id="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste the recipe here including title, ingredients, and instructions..."
                    rows={12}
                    disabled={importing}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Include:</p>
                  <ul className="list-disc list-inside">
                    <li>Recipe title</li>
                    <li>All ingredients with amounts</li>
                    <li>All cooking instructions</li>
                  </ul>
                </div>
                <Button
                  onClick={handleImportText}
                  disabled={importing || !text.trim()}
                  className="w-full"
                >
                  {importing ? "Extracting..." : "Extract Recipe"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-4 text-center">
          <Button variant="link" asChild>
            <Link href="/recipes/new">Or add a recipe manually</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Show edit form after extraction
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Review Imported Recipe</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={importSource === "json-ld" ? "default" : "secondary"}>
                {importSource === "json-ld"
                  ? "Structured Data"
                  : importSource === "llm-html"
                  ? "AI Extracted"
                  : "AI from Text"}
              </Badge>
              {recipe.sourceName && (
                <span className="text-sm text-muted-foreground">
                  from {recipe.sourceName}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={resetImport}>
            Start Over
          </Button>
        </div>
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
            {recipe.imageUrl && (
              <div>
                <Label>Image</Label>
                <img
                  src={recipe.imageUrl}
                  alt={title}
                  className="mt-2 max-w-xs rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time and Servings */}
        <Card>
          <CardHeader>
            <CardTitle>Time & Servings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              {recipe.prepTimeMinutes && (
                <span>Prep: {recipe.prepTimeMinutes} min</span>
              )}
              {recipe.cookTimeMinutes && (
                <span>Cook: {recipe.cookTimeMinutes} min</span>
              )}
              {recipe.totalTimeMinutes && (
                <span>Total: {recipe.totalTimeMinutes} min</span>
              )}
              {recipe.servings && <span>Servings: {recipe.servings}</span>}
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
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline" onClick={resetImport} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Recipe"}
          </Button>
        </div>
      </div>
    </div>
  );
}
