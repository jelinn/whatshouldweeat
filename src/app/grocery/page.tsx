"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  const [currentSunday, setCurrentSunday] = useState(() => {
    const now = new Date();
    // From Wednesday on, show next week's grocery list
    if (now.getDay() >= 3) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return getSunday(nextWeek);
    }
    return getSunday(now);
  });
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

  // Edit item dialog
  const [editItem, setEditItem] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<{ name: string; category: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  const openEditDialog = (item: GroceryItem) => {
    setEditItem(item);
    setEditName(item.ingredientName);
    setEditAmount(item.amount?.toString() || "");
    setEditUnit(item.unit || "");
    setEditCategory(item.category || "other");
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/grocery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editItem.id,
          ingredientName: editName.trim(),
          amount: editAmount ? parseFloat(editAmount) : null,
          unit: editUnit.trim() || null,
          category: editCategory || "other",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === editItem.id ? data.data : i))
        );
        setEditItem(null);
        toast.success("Item updated");
      } else {
        toast.error(data.error || "Failed to update item");
      }
    } catch {
      toast.error("Failed to update item");
    } finally {
      setSavingEdit(false);
    }
  };

  const searchIngredients = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setSuggestions(data.data);
        setShowSuggestions(true);
        setActiveSuggestion(-1);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleAddItemNameChange = (value: string) => {
    setAddItemName(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchIngredients(value), 200);
  };

  const selectSuggestion = (suggestion: { name: string; category: string | null }) => {
    setAddItemName(suggestion.name);
    if (suggestion.category && !addItemCategory) {
      setAddItemCategory(suggestion.category);
    }
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleAddItemKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") handleAddItem();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestion >= 0) {
        selectSuggestion(suggestions[activeSuggestion]);
      } else {
        setShowSuggestions(false);
        handleAddItem();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        addInputRef.current &&
        !addInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const now = new Date();
    if (now.getDay() >= 3) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentSunday(getSunday(nextWeek));
    } else {
      setCurrentSunday(getSunday(now));
    }
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

  // Distribute categories into balanced columns for printing.
  // Greedy bin-packing: each category (kept whole) goes to the currently
  // lightest column. Deterministic, so print output doesn't depend on the
  // browser's flaky multi-column page fragmentation.
  const PRINT_COLUMN_COUNT = 3;
  const printColumns: Array<Array<[string, GroceryItem[]]>> = Array.from(
    { length: PRINT_COLUMN_COUNT },
    () => []
  );
  const printColumnWeights = new Array(PRINT_COLUMN_COUNT).fill(0);
  for (const [category, categoryItems] of Object.entries(groupedItems)) {
    let target = 0;
    for (let i = 1; i < PRINT_COLUMN_COUNT; i++) {
      if (printColumnWeights[i] < printColumnWeights[target]) target = i;
    }
    printColumns[target].push([category, categoryItems]);
    // +1.5 approximates the header's vertical footprint relative to a row.
    printColumnWeights[target] += categoryItems.length + 1.5;
  }

  // Scale the print font to the list size: short lists get a large, readable
  // font; long lists shrink only as far as needed to still fit one page. The
  // tallest column is the binding constraint (~660pt usable height after the
  // header band). Clamp to a readable 8–14pt range.
  const tallestColumnWeight = printColumnWeights.length
    ? Math.max(...printColumnWeights)
    : 0;
  // Grow the font to fill most of the page. The numerator/divisor are tuned so
  // a typical weekly list lands at the 30pt cap (filling the page), while long
  // lists scale down to stay on one page. Crossover to shrinking is ~85 items.
  const printItemPt =
    tallestColumnWeight > 0
      ? Math.round(
          Math.max(12, Math.min(30, 1300 / (tallestColumnWeight * 1.4))) * 10
        ) / 10
      : 18;
  const printHeaderPt = Math.round((printItemPt + 1) * 10) / 10;

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
          {(() => {
            const now = new Date();
            const defaultSunday = now.getDay() >= 3
              ? getSunday(new Date(now.getTime() + 7 * 86400000))
              : getSunday(now);
            return formatWeekStart(defaultSunday) !== weekStart;
          })() && (
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
            <div className="flex-1 relative">
              <Label htmlFor="add-item-name" className="text-xs text-muted-foreground">Item</Label>
              <Input
                ref={addInputRef}
                id="add-item-name"
                placeholder="e.g., Soy sauce"
                value={addItemName}
                onChange={(e) => handleAddItemNameChange(e.target.value)}
                onKeyDown={handleAddItemKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                disabled={addingItem}
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={`${s.name}-${i}`}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between items-center ${
                        i === activeSuggestion ? "bg-accent" : ""
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(s)}
                    >
                      <span>{s.name}</span>
                      {s.category && (
                        <span className="text-xs text-muted-foreground">{s.category}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
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
              .print-flex-columns {
                display: flex !important;
                gap: 14px !important;
                align-items: flex-start !important;
              }
              .print-flex-columns .print-col {
                flex: 1 1 0 !important;
                min-width: 0 !important;
              }
              .print-grocery-list .print-category {
                break-inside: avoid;
                margin-bottom: 6px !important;
              }
              .print-grocery-list li {
                font-size: var(--print-item-size, 12pt) !important;
                line-height: 1.3 !important;
                padding: 0 !important;
                margin: 0 !important;
                gap: 4px !important;
              }
              .print-grocery-list .print-category-header {
                font-size: var(--print-header-size, 13pt) !important;
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
                width: 0.8em !important;
                height: 0.8em !important;
                min-width: 0.8em !important;
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

          <div className="space-y-4 print:hidden">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category}>
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
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                                onClick={() => openEditDialog(item)}
                                title="Edit item"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-green-600 dark:hover:text-green-400"
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

          {/* Print-only layout: balanced flexbox columns, compact rows */}
          <div
            className="hidden print:block"
            style={
              {
                "--print-item-size": `${printItemPt}pt`,
                "--print-header-size": `${printHeaderPt}pt`,
              } as React.CSSProperties
            }
          >
            <div className="print-flex-columns">
              {printColumns.map((col, colIndex) => (
                <div key={colIndex} className="print-col">
                  {col.map(([category, categoryItems]) => (
                    <div key={category} className="print-category">
                      <div className="print-category-header">
                        {CATEGORY_LABELS[category] || category}
                      </div>
                      <ul>
                        {categoryItems.map((item) => (
                          <li key={item.id}>
                            <span className="print-checkbox" />
                            <span>
                              {item.amount && (
                                <span className="font-medium">
                                  {item.amount}
                                  {item.unit && ` ${item.unit}`}{" "}
                                </span>
                              )}
                              {item.ingredientName}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update this grocery item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="flex gap-2">
              <div className="w-24">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
              <div className="w-24">
                <Label className="text-xs text-muted-foreground">Unit</Label>
                <Input
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue />
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()}>
              {savingEdit ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
