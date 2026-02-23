"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CUISINES, MEAL_TYPES, DIFFICULTIES } from "@/lib/db/schema";

interface Recommendation {
  title: string;
  description: string;
  reasoning: string;
  estimatedTime?: number;
  cuisine?: string;
  dismissed?: boolean;
}

interface GeneratedRecipe {
  title: string;
  description?: string;
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
}

export default function DiscoverPage() {
  const router = useRouter();

  // Recommendations state
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [quickMeals, setQuickMeals] = useState(false);
  const [maxPrepTime, setMaxPrepTime] = useState("");

  // Generation state
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null);
  const [loadingGen, setLoadingGen] = useState(false);
  const [genCuisine, setGenCuisine] = useState("");
  const [genStyle, setGenStyle] = useState("");
  const [genConstraints, setGenConstraints] = useState("");
  const [genServings, setGenServings] = useState("4");

  // Saving state
  const [saving, setSaving] = useState(false);
  const [generatingFromRec, setGeneratingFromRec] = useState<number | null>(null);

  const handleGetRecommendations = async () => {
    setLoadingRecs(true);
    setRecommendations([]);

    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quickMeals,
          maxPrepTime: maxPrepTime ? parseInt(maxPrepTime) : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setRecommendations(data.data.recommendations);
        toast.success(
          `Got ${data.data.recommendations.length} recommendations based on ${data.data.basedOn.lovedCount} loved recipes`
        );
      } else {
        toast.error(data.error || "Failed to get recommendations");
      }
    } catch {
      toast.error("Failed to get recommendations");
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleGenerateRecipe = async () => {
    setLoadingGen(true);
    setGeneratedRecipe(null);

    try {
      const constraints = genConstraints
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuisine: genCuisine || undefined,
          style: genStyle || undefined,
          constraints: constraints.length > 0 ? constraints : undefined,
          servings: parseInt(genServings) || 4,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedRecipe(data.data.recipe);
        toast.success("Recipe generated!");
      } else {
        toast.error(data.error || "Failed to generate recipe");
      }
    } catch {
      toast.error("Failed to generate recipe");
    } finally {
      setLoadingGen(false);
    }
  };

  const handleDismissRecommendation = (index: number) => {
    setRecommendations((prev) =>
      prev.map((rec, i) => (i === index ? { ...rec, dismissed: true } : rec))
    );
    toast.success("Recommendation dismissed");
  };

  const handleGenerateFromRecommendation = async (rec: Recommendation, index: number) => {
    setGeneratingFromRec(index);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuisine: rec.cuisine || undefined,
          style: rec.title,
          constraints: [rec.description],
          servings: 4,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Save the generated recipe directly
        const recipe = data.data.recipe;
        const saveRes = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: recipe.title,
            description: recipe.description,
            sourceName: "AI Generated",
            prepTimeMinutes: recipe.prepTimeMinutes,
            cookTimeMinutes: recipe.cookTimeMinutes,
            totalTimeMinutes: recipe.totalTimeMinutes,
            servings: recipe.servings,
            cuisine: rec.cuisine || undefined,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            tags: ["ai-recommended"],
          }),
        });

        const saveData = await saveRes.json();

        if (saveData.success) {
          toast.success("Recipe saved to your collection!");
          // Mark as dismissed after saving
          setRecommendations((prev) =>
            prev.map((r, i) => (i === index ? { ...r, dismissed: true } : r))
          );
          router.push(`/recipes/${saveData.data.id}`);
        } else {
          toast.error(saveData.error || "Failed to save recipe");
        }
      } else {
        toast.error(data.error || "Failed to generate recipe");
      }
    } catch {
      toast.error("Failed to generate recipe");
    } finally {
      setGeneratingFromRec(null);
    }
  };

  const handleSaveGeneratedRecipe = async () => {
    if (!generatedRecipe) return;

    setSaving(true);

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generatedRecipe.title,
          description: generatedRecipe.description,
          sourceName: "AI Generated",
          prepTimeMinutes: generatedRecipe.prepTimeMinutes,
          cookTimeMinutes: generatedRecipe.cookTimeMinutes,
          totalTimeMinutes: generatedRecipe.totalTimeMinutes,
          servings: generatedRecipe.servings,
          cuisine: genCuisine || undefined,
          ingredients: generatedRecipe.ingredients,
          instructions: generatedRecipe.instructions,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Recipe saved to your collection!");
        router.push(`/recipes/${data.data.id}`);
      } else {
        toast.error(data.error || "Failed to save recipe");
      }
    } catch {
      toast.error("Failed to save recipe");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discover</h1>
        <p className="text-muted-foreground">
          Get AI-powered recipe recommendations and generate new recipes
        </p>
      </div>

      <Tabs defaultValue="recommend" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="recommend">Get Recommendations</TabsTrigger>
          <TabsTrigger value="generate">Generate Recipe</TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommend" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recipe Recommendations</CardTitle>
              <CardDescription>
                Get personalized suggestions based on your loved recipes and cooking history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="quickMeals"
                    checked={quickMeals}
                    onCheckedChange={(checked) => setQuickMeals(!!checked)}
                  />
                  <Label htmlFor="quickMeals">Quick meals only</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="maxPrepTime">Max prep time:</Label>
                  <Input
                    id="maxPrepTime"
                    type="number"
                    value={maxPrepTime}
                    onChange={(e) => setMaxPrepTime(e.target.value)}
                    placeholder="minutes"
                    className="w-24"
                  />
                </div>
              </div>
              <Button onClick={handleGetRecommendations} disabled={loadingRecs}>
                {loadingRecs ? "Getting recommendations..." : "Get Recommendations"}
              </Button>
            </CardContent>
          </Card>

          {/* Recommendations Results */}
          {loadingRecs ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="h-6 bg-muted animate-pulse rounded" />
                      <div className="h-16 bg-muted animate-pulse rounded" />
                      <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recommendations.filter((r) => !r.dismissed).length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {recommendations
                .map((rec, index) => ({ rec, index }))
                .filter(({ rec }) => !rec.dismissed)
                .map(({ rec, index }) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{rec.title}</CardTitle>
                        {rec.cuisine && (
                          <Badge variant="secondary">{rec.cuisine}</Badge>
                        )}
                      </div>
                      <CardDescription>{rec.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground italic">
                            &ldquo;{rec.reasoning}&rdquo;
                          </p>
                          {rec.estimatedTime && (
                            <p className="text-sm">
                              Estimated time: {rec.estimatedTime} minutes
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleGenerateFromRecommendation(rec, index)}
                            disabled={generatingFromRec === index}
                          >
                            {generatingFromRec === index
                              ? "Creating..."
                              : "Add to Recipes"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismissRecommendation(index)}
                            disabled={generatingFromRec === index}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : recommendations.length > 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>All recommendations dismissed.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleGetRecommendations}
                >
                  Get New Recommendations
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate a New Recipe</CardTitle>
              <CardDescription>
                Let AI create an original recipe based on your preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Cuisine Style</Label>
                  <Select value={genCuisine} onValueChange={setGenCuisine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any cuisine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any cuisine</SelectItem>
                      {CUISINES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Servings</Label>
                  <Input
                    type="number"
                    value={genServings}
                    onChange={(e) => setGenServings(e.target.value)}
                    min="1"
                    max="20"
                  />
                </div>
              </div>
              <div>
                <Label>Style / Mood</Label>
                <Input
                  value={genStyle}
                  onChange={(e) => setGenStyle(e.target.value)}
                  placeholder="e.g., comfort food, elegant dinner, healthy lunch"
                />
              </div>
              <div>
                <Label>Constraints (comma-separated)</Label>
                <Input
                  value={genConstraints}
                  onChange={(e) => setGenConstraints(e.target.value)}
                  placeholder="e.g., vegetarian, quick, use chicken, no dairy"
                />
              </div>
              <Button onClick={handleGenerateRecipe} disabled={loadingGen}>
                {loadingGen ? "Generating..." : "Generate Recipe"}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Recipe */}
          {loadingGen ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="h-8 bg-muted animate-pulse rounded w-1/2" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <Separator />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-4 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                  <Separator />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : generatedRecipe ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{generatedRecipe.title}</CardTitle>
                    {generatedRecipe.description && (
                      <CardDescription className="mt-2">
                        {generatedRecipe.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge>AI Generated</Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground mt-4">
                  {generatedRecipe.prepTimeMinutes && (
                    <span>Prep: {generatedRecipe.prepTimeMinutes} min</span>
                  )}
                  {generatedRecipe.cookTimeMinutes && (
                    <span>Cook: {generatedRecipe.cookTimeMinutes} min</span>
                  )}
                  {generatedRecipe.servings && (
                    <span>Serves: {generatedRecipe.servings}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Ingredients */}
                <div>
                  <h3 className="font-semibold mb-3">Ingredients</h3>
                  <ul className="space-y-1">
                    {generatedRecipe.ingredients.map((ing, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>
                          {ing.amount && (
                            <span className="font-medium">{ing.amount}</span>
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
                </div>

                <Separator />

                {/* Instructions */}
                <div>
                  <h3 className="font-semibold mb-3">Instructions</h3>
                  <ol className="space-y-3">
                    {generatedRecipe.instructions.map((inst, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                          {index + 1}
                        </span>
                        <p>{inst.instruction}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-4">
                  <Button onClick={handleSaveGeneratedRecipe} disabled={saving}>
                    {saving ? "Saving..." : "Save to My Recipes"}
                  </Button>
                  <Button variant="outline" onClick={handleGenerateRecipe}>
                    Generate Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
