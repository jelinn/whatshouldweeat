"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from "@/lib/utils/ingredient-aggregator";
import { INGREDIENT_CATEGORIES } from "@/lib/db/schema";

interface GroceryItem {
  id: string;
  ingredientName: string;
  amount: number | null;
  unit: string | null;
  category: string | null;
  isChecked: boolean;
  isStaple: boolean;
  sourceRecipeId: string | null;
  weekStart: string | null;
}

interface Staple {
  id: string;
  name: string;
  category: string | null;
  defaultAmount: number | null;
  defaultUnit: string | null;
}

interface MealPlan {
  id: string;
  dayOfWeek: number;
  mealType: string;
  recipeId: string | null;
  notes: string | null;
  recipe: { id: string; title: string } | null;
}

// Get Sunday of a given week (week starts on Sunday)
function getSunday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekStart(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateRange(sunday: Date): string {
  const saturday = new Date(sunday);
  saturday.setDate(saturday.getDate() + 6);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${sunday.toLocaleDateString("en-US", options)} - ${saturday.toLocaleDateString("en-US", options)}`;
}

export default function GroceryPage() {
  const [currentSunday, setCurrentSunday] = useState(() => getSunday(new Date()));
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [staples, setStaples] = useState<Staple[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Staples dialog
  const [staplesDialogOpen, setStaplesDialogOpen] = useState(false);
  const [newStapleName, setNewStapleName] = useState("");
  const [newStapleCategory, setNewStapleCategory] = useState("");

  // Add item form
  const [addItemName, setAddItemName] = useState("");
  const [addItemAmount, setAddItemAmount] = useState("");
  const [addItemUnit, setAddItemUnit] = useState("");
  const [addItemCategory, setAddItemCategory] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  // Meal plans for print summary
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);

  // Shopping mode
  const [shoppingMode, setShoppingMode] = useState(false);

  const weekStart = formatWeekStart(currentSunday);

  const fetchGroceryList = useCallback(async () => {
    setLoading(true);
    try {
      const [groceryRes, plannerRes] = await Promise.all([
        fetch(`/api/grocery?week=${weekStart}`),
        fetch(`/api/planner?week=${weekStart}`),
      ]);
      const groceryData = await groceryRes.json();
      const plannerData = await plannerRes.json();

      if (groceryData.success) {
        setItems(groceryData.data.items);
        setStaples(groceryData.data.staples);
      } else {
        toast.error("Failed to load grocery list");
      }

      if (plannerData.success) {
        setMealPlans(plannerData.data.plans);
      }
    } catch {
      toast.error("Failed to load grocery list");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchGroceryList();
  }, [fetchGroceryList]);

  const handleGenerateList = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, includeStaples: true }),
      });

      const data = await res.json();

      if (data.success) {
        setItems(data.data.items);
        toast.success(`Generated grocery list with ${data.data.generated} items`);
      } else {
        toast.error(data.error || "Failed to generate grocery list");
      }
    } catch {
      toast.error("Failed to generate grocery list");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleItem = async (item: GroceryItem) => {
    try {
      const res = await fetch("/api/grocery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isChecked: !item.isChecked }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, isChecked: !i.isChecked } : i
          )
        );
      }
    } catch {
      toast.error("Failed to update item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/grocery?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        toast.success("Item removed");
      }
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const handleAddStaple = async () => {
    if (!newStapleName.trim()) {
      toast.error("Staple name is required");
      return;
    }

    try {
      const res = await fetch("/api/staples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStapleName.trim(),
          category: newStapleCategory || "other",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStaples((prev) => [...prev, data.data]);
        setNewStapleName("");
        setNewStapleCategory("");
        toast.success("Staple added");
      } else {
        toast.error(data.error || "Failed to add staple");
      }
    } catch {
      toast.error("Failed to add staple");
    }
  };

  const handleDeleteStaple = async (id: string) => {
    try {
      const res = await fetch(`/api/staples?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setStaples((prev) => prev.filter((s) => s.id !== id));
        toast.success("Staple removed");
      }
    } catch {
      toast.error("Failed to remove staple");
    }
  };

  const handleClearChecked = async () => {
    const checkedItems = items.filter((i) => i.isChecked);

    for (const item of checkedItems) {
      await handleDeleteItem(item.id);
    }

    toast.success(`Cleared ${checkedItems.length} checked items`);
  };

  const handleAddItem = async () => {
    if (!addItemName.trim()) {
      toast.error("Item name is required");
      return;
    }

    setAddingItem(true);
    try {
      const res = await fetch("/api/grocery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientName: addItemName.trim(),
          amount: addItemAmount ? parseFloat(addItemAmount) : null,
          unit: addItemUnit.trim() || null,
          category: addItemCategory || "other",
          weekStart,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setItems((prev) => [...prev, data.data]);
        setAddItemName("");
        setAddItemAmount("");
        setAddItemUnit("");
        setAddItemCategory("");
        toast.success(`Added "${addItemName.trim()}" to list`);
      } else {
        toast.error(data.error || "Failed to add item");
      }
    } catch {
      toast.error("Failed to add item");
    } finally {
      setAddingItem(false);
    }
  };

  const handleMarkAlreadyHave = async (item: GroceryItem) => {
    // Remove the item from the grocery list since user already has it
    try {
      const res = await fetch(`/api/grocery?id=${item.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        toast.success(`"${item.ingredientName}" removed - you already have it`);
      }
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const goToPreviousWeek = () => {
    const prev = new Date(currentSunday);
    prev.setDate(prev.getDate() - 7);
    setCurrentSunday(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentSunday);
    next.setDate(next.getDate() + 7);
    setCurrentSunday(next);
  };

  const goToCurrentWeek = () => {
    setCurrentSunday(getSunday(new Date()));
  };

  // Group items by category
  const groupedItems = CATEGORY_ORDER.reduce((acc, category) => {
    const categoryItems = items.filter(
      (item) => (item.category || "other") === category
    );
    if (categoryItems.length > 0) {
      acc[category] = categoryItems;
    }
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  const checkedCount = items.filter((i) => i.isChecked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Grocery List</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Shopping list for your meal plan
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              Print List
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setStaplesDialogOpen(true)}>
            Manage Staples
          </Button>
          <Button size="sm" onClick={handleGenerateList} disabled={generating}>
            {generating ? "Generating..." : "Generate from Meal Plan"}
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between gap-2 no-print">
        <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
          <span className="hidden sm:inline">&larr; Previous</span>
          <span className="sm:hidden">&larr;</span>
        </Button>
        <div className="flex items-center gap-2 md:gap-4">
          <h2 className="text-base md:text-xl font-semibold text-center">{formatDateRange(currentSunday)}</h2>
          {formatWeekStart(getSunday(new Date())) !== weekStart && (
            <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
              Today
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={goToNextWeek}>
          <span className="hidden sm:inline">Next &rarr;</span>
          <span className="sm:hidden">&rarr;</span>
        </Button>
      </div>

      {/* Shopping Mode Toggle */}
      {items.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between no-print shopping-mode-controls">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={shoppingMode ? "default" : "outline"}
              onClick={() => setShoppingMode(!shoppingMode)}
            >
              {shoppingMode ? "Exit Shopping" : "Start Shopping"}
            </Button>
            {shoppingMode && (
              <span className="text-sm text-muted-foreground">
                {checkedCount}/{totalCount} ({progress}%)
              </span>
            )}
          </div>
          {checkedCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearChecked}>
              Clear {checkedCount} Checked
            </Button>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {shoppingMode && items.length > 0 && (
        <div className="w-full bg-muted rounded-full h-2 no-print">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Add Item Form */}
      <Card className="no-print">
        <CardContent className="py-3 px-3 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="add-item-name" className="text-xs text-muted-foreground">Item</Label>
              <Input
                id="add-item-name"
                placeholder="e.g., Soy sauce"
                value={addItemName}
                onChange={(e) => setAddItemName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddItem(); }}
                disabled={addingItem}
              />
            </div>
            <div className="flex gap-2">
              <div className="w-20">
                <Label htmlFor="add-item-amount" className="text-xs text-muted-foreground">Amt</Label>
                <Input
                  id="add-item-amount"
                  type="number"
                  step="0.25"
                  placeholder="1"
                  value={addItemAmount}
                  onChange={(e) => setAddItemAmount(e.target.value)}
                  disabled={addingItem}
                />
              </div>
              <div className="w-20">
                <Label htmlFor="add-item-unit" className="text-xs text-muted-foreground">Unit</Label>
                <Input
                  id="add-item-unit"
                  placeholder="bottle"
                  value={addItemUnit}
                  onChange={(e) => setAddItemUnit(e.target.value)}
                  disabled={addingItem}
                />
              </div>
              <div className="w-28">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={addItemCategory} onValueChange={setAddItemCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Other" />
                  </SelectTrigger>
                  <SelectContent>
                    {INGREDIENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  onClick={handleAddItem}
                  disabled={addingItem || !addItemName.trim()}
                  className="h-9"
                >
                  {addingItem ? "..." : "Add"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grocery List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <div
                      key={j}
                      className="h-8 bg-muted animate-pulse rounded"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No grocery list for this week yet.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Create a meal plan first, then generate your grocery list.
            </p>
            <Button onClick={handleGenerateList} disabled={generating}>
              {generating ? "Generating..." : "Generate from Meal Plan"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="print-grocery-list">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { margin: 0.25in; size: letter; }
              .grocery-print-columns {
                column-count: 3 !important;
                column-gap: 12px !important;
              }
              .print-grocery-list .print-category {
                break-inside: avoid;
              }
              .print-grocery-list li {
                font-size: 7.5pt !important;
                line-height: 1.3 !important;
                padding: 0 !important;
                margin: 0 !important;
                gap: 3px !important;
              }
              .print-grocery-list .print-category-header {
                font-size: 8pt !important;
                font-weight: bold;
                border-bottom: 0.5pt solid #333;
                margin-top: 4px;
                margin-bottom: 1px;
                padding-bottom: 0;
              }
              .print-grocery-list .print-title {
                font-size: 10pt !important;
                font-weight: bold;
                margin-bottom: 0 !important;
              }
              .print-grocery-list .print-subtitle {
                font-size: 7.5pt !important;
                color: #666;
                margin-bottom: 2px !important;
              }
              .print-grocery-list .print-checkbox {
                width: 7px !important;
                height: 7px !important;
                min-width: 7px !important;
                border: 0.5pt solid #333 !important;
              }
              .print-grocery-list [class*="card"],
              .print-grocery-list [class*="Card"] {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                background: none !important;
              }
              .print-meal-summary {
                font-size: 7pt;
                line-height: 1.25;
                margin-bottom: 4px;
                border-bottom: 0.5pt solid #999;
                padding-bottom: 3px;
              }
              .print-meal-summary span.day-label {
                font-weight: bold;
              }
            }
          `}} />
          {/* Print-only header */}
          <div className="hidden print:block">
            <div className="print-title">Grocery List</div>
            <div className="print-subtitle">{formatDateRange(currentSunday)}</div>
            {mealPlans.length > 0 && (() => {
              const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              const assignedDays = DAYS.map((day, i) => {
                const dayMeals = mealPlans
                  .filter((p) => p.dayOfWeek === i && (p.recipe || p.notes))
                  .map((p) => p.recipe?.title || p.notes)
                  .filter(Boolean);
                return dayMeals.length > 0 ? { day, meals: dayMeals } : null;
              }).filter(Boolean);
              if (assignedDays.length === 0) return null;
              return (
                <div className="print-meal-summary">
                  {assignedDays.map((d) => (
                    <div key={d!.day}>
                      <span className="day-label">{d!.day}:</span> {d!.meals.join(", ")}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="space-y-4 print:space-y-0 grocery-print-columns">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="print-category">
                <Card>
                  <CardHeader className="py-3 px-3 sm:px-6 print:p-0">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 print:hidden">
                      {CATEGORY_LABELS[category] || category}
                      <Badge variant="secondary">{categoryItems.length}</Badge>
                    </CardTitle>
                    <div className="hidden print:block print-category-header">
                      {CATEGORY_LABELS[category] || category}
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-2 sm:px-6 print:p-0">
                    <ul className="space-y-1 print:space-y-0">
                      {categoryItems.map((item) => (
                        <li
                          key={item.id}
                          className={`flex items-center gap-2 sm:gap-3 py-2 px-2 rounded-lg transition-colors print:p-0 print:rounded-none ${
                            item.isChecked
                              ? "bg-muted/50 text-muted-foreground"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          {/* Screen checkbox */}
                          <span className="print:hidden shrink-0">
                            <Checkbox
                              checked={item.isChecked}
                              onCheckedChange={() => handleToggleItem(item)}
                            />
                          </span>
                          {/* Print checkbox */}
                          <span className="hidden print:inline-block print-checkbox" />
                          <span
                            className={`flex-1 min-w-0 text-sm sm:text-base print:no-underline ${
                              item.isChecked ? "line-through print:no-underline" : ""
                            }`}
                          >
                            {item.amount && (
                              <span className="font-medium">
                                {item.amount}
                                {item.unit && ` ${item.unit}`}{" "}
                              </span>
                            )}
                            {item.ingredientName}
                            {item.isStaple && (
                              <Badge variant="outline" className="ml-2 text-xs print:hidden">
                                staple
                              </Badge>
                            )}
                          </span>
                          {!shoppingMode && (
                            <div className="flex gap-1 no-print shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-green-600 hover:bg-green-50"
                                onClick={() => handleMarkAlreadyHave(item)}
                                title="Mark as already have"
                              >
                                Have
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                &times;
                              </Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staples Management Dialog */}
      <Dialog open={staplesDialogOpen} onOpenChange={setStaplesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Staples</DialogTitle>
            <DialogDescription>
              Staples are items that appear on every grocery list automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new staple */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="New staple (e.g., Milk)"
                value={newStapleName}
                onChange={(e) => setNewStapleName(e.target.value)}
                className="flex-1"
              />
              <div className="flex gap-2">
                <Select value={newStapleCategory} onValueChange={setNewStapleCategory}>
                  <SelectTrigger className="w-full sm:w-32">
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
                <Button onClick={handleAddStaple}>Add</Button>
              </div>
            </div>

            <Separator />

            {/* List of staples */}
            {staples.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No staples yet. Add items you buy every week.
              </p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {staples.map((staple) => (
                  <li
                    key={staple.id}
                    className="flex items-center justify-between py-1"
                  >
                    <span>
                      {staple.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({staple.category || "other"})
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteStaple(staple.id)}
                    >
                      &times;
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStaplesDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
