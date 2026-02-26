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

  // Shopping mode
  const [shoppingMode, setShoppingMode] = useState(false);

  const weekStart = formatWeekStart(currentSunday);

  const fetchGroceryList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/grocery?week=${weekStart}`);
      const data = await res.json();

      if (data.success) {
        setItems(data.data.items);
        setStaples(data.data.staples);
      } else {
        toast.error("Failed to load grocery list");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold">Grocery List</h1>
          <p className="text-muted-foreground">
            Shopping list for your meal plan
          </p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <Button variant="outline" onClick={() => window.print()}>
              Print List
            </Button>
          )}
          <Button variant="outline" onClick={() => setStaplesDialogOpen(true)}>
            Manage Staples
          </Button>
          <Button onClick={handleGenerateList} disabled={generating}>
            {generating ? "Generating..." : "Generate from Meal Plan"}
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between no-print">
        <Button variant="outline" onClick={goToPreviousWeek}>
          ← Previous Week
        </Button>
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">{formatDateRange(currentSunday)}</h2>
          {formatWeekStart(getSunday(new Date())) !== weekStart && (
            <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
              Today
            </Button>
          )}
        </div>
        <Button variant="outline" onClick={goToNextWeek}>
          Next Week →
        </Button>
      </div>

      {/* Shopping Mode Toggle */}
      {items.length > 0 && (
        <div className="flex items-center justify-between no-print shopping-mode-controls">
          <div className="flex items-center gap-4">
            <Button
              variant={shoppingMode ? "default" : "outline"}
              onClick={() => setShoppingMode(!shoppingMode)}
            >
              {shoppingMode ? "Exit Shopping Mode" : "Start Shopping"}
            </Button>
            {shoppingMode && (
              <div className="text-sm text-muted-foreground">
                {checkedCount} of {totalCount} items ({progress}%)
              </div>
            )}
          </div>
          {checkedCount > 0 && (
            <Button variant="outline" onClick={handleClearChecked}>
              Clear {checkedCount} Checked Items
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
          {/* Print-only header */}
          <div className="hidden print:block">
            <div className="print-title">Grocery List</div>
            <div className="print-subtitle">{formatDateRange(currentSunday)}</div>
          </div>

          <div className="space-y-4 print:space-y-0 print:print-columns">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="print-category">
                <Card>
                  <CardHeader className="py-3 print:p-0">
                    <CardTitle className="text-lg flex items-center gap-2 print:hidden">
                      {CATEGORY_LABELS[category] || category}
                      <Badge variant="secondary">{categoryItems.length}</Badge>
                    </CardTitle>
                    <div className="hidden print:block print-category-header">
                      {CATEGORY_LABELS[category] || category}
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 print:p-0">
                    <ul className="space-y-1 print:space-y-0">
                      {categoryItems.map((item) => (
                        <li
                          key={item.id}
                          className={`flex items-center gap-3 py-2 px-2 rounded-lg transition-colors print:p-0 print:rounded-none ${
                            item.isChecked
                              ? "bg-muted/50 text-muted-foreground"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          {/* Screen checkbox */}
                          <span className="print:hidden">
                            <Checkbox
                              checked={item.isChecked}
                              onCheckedChange={() => handleToggleItem(item)}
                            />
                          </span>
                          {/* Print checkbox */}
                          <span className="hidden print:inline-block print-checkbox" />
                          <span
                            className={`flex-1 print:no-underline ${
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
                            <div className="flex gap-1 no-print">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-green-600 hover:bg-green-50"
                                onClick={() => handleMarkAlreadyHave(item)}
                                title="Mark as already have"
                              >
                                Have
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                ×
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
            <div className="flex gap-2">
              <Input
                placeholder="New staple (e.g., Milk)"
                value={newStapleName}
                onChange={(e) => setNewStapleName(e.target.value)}
              />
              <Select value={newStapleCategory} onValueChange={setNewStapleCategory}>
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
              <Button onClick={handleAddStaple}>Add</Button>
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
                      ×
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
