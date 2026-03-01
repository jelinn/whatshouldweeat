"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MealSlot } from "@/components/planner/meal-slot";
import { RecipePicker } from "@/components/planner/recipe-picker";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  totalTimeMinutes?: number;
  cuisine?: string;
}

interface MealPlan {
  id: string;
  weekStart: string;
  dayOfWeek: number;
  mealType: string;
  recipeId: string | null;
  notes: string | null;
  recipe: Recipe | null;
}

// Get Sunday of a given week (week starts on Sunday)
function getSunday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  d.setDate(d.getDate() - day); // Go back to Sunday
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

export default function PlannerPage() {
  const router = useRouter();
  const [currentSunday, setCurrentMonday] = useState(() => getSunday(new Date()));
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    day: number;
    mealType: string;
  } | null>(null);

  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesSlot, setNotesSlot] = useState<{
    day: number;
    mealType: string;
    currentNotes: string;
  } | null>(null);
  const [notesText, setNotesText] = useState("");

  const weekStart = formatWeekStart(currentSunday);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/planner?week=${weekStart}`);
      const data = await res.json();

      if (data.success) {
        setPlans(data.data.plans);
      } else {
        toast.error("Failed to load meal plan");
      }
    } catch {
      toast.error("Failed to load meal plan");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const getPlan = (day: number, mealType: string): MealPlan | undefined => {
    return plans.find((p) => p.dayOfWeek === day && p.mealType === mealType);
  };

  const handleSlotClick = (day: number, mealType: string) => {
    setSelectedSlot({ day, mealType });
    setPickerOpen(true);
  };

  const handleRecipeSelect = async (recipeId: string | null) => {
    if (!selectedSlot) return;

    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          dayOfWeek: selectedSlot.day,
          mealType: selectedSlot.mealType,
          recipeId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Update local state
        setPlans((prev) => {
          const filtered = prev.filter(
            (p) =>
              !(p.dayOfWeek === selectedSlot.day && p.mealType === selectedSlot.mealType)
          );
          return [...filtered, data.data];
        });
        toast.success("Meal plan updated");
      } else {
        toast.error("Failed to update meal plan");
      }
    } catch {
      toast.error("Failed to update meal plan");
    }

    setPickerOpen(false);
    setSelectedSlot(null);
  };

  const handleCustomMeal = async (mealText: string) => {
    if (!selectedSlot) return;

    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          dayOfWeek: selectedSlot.day,
          mealType: selectedSlot.mealType,
          notes: mealText,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPlans((prev) => {
          const filtered = prev.filter(
            (p) =>
              !(p.dayOfWeek === selectedSlot.day && p.mealType === selectedSlot.mealType)
          );
          return [...filtered, data.data];
        });
        toast.success("Meal added");
      } else {
        toast.error("Failed to add meal");
      }
    } catch {
      toast.error("Failed to add meal");
    }

    setPickerOpen(false);
    setSelectedSlot(null);
  };

  const handleClearSlot = async (day: number, mealType: string) => {
    const plan = getPlan(day, mealType);
    if (!plan) return;

    try {
      const res = await fetch(`/api/planner?id=${plan.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
        toast.success("Meal cleared");
      }
    } catch {
      toast.error("Failed to clear meal");
    }
  };

  const handleNotesClick = (day: number, mealType: string) => {
    const plan = getPlan(day, mealType);
    setNotesSlot({ day, mealType, currentNotes: plan?.notes || "" });
    setNotesText(plan?.notes || "");
    setNotesDialogOpen(true);
  };

  const handleNotesSave = async () => {
    if (!notesSlot) return;

    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          dayOfWeek: notesSlot.day,
          mealType: notesSlot.mealType,
          notes: notesText || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPlans((prev) => {
          const filtered = prev.filter(
            (p) =>
              !(p.dayOfWeek === notesSlot.day && p.mealType === notesSlot.mealType)
          );
          return [...filtered, data.data];
        });
        toast.success("Notes saved");
      }
    } catch {
      toast.error("Failed to save notes");
    }

    setNotesDialogOpen(false);
    setNotesSlot(null);
  };

  const handleQuickFill = async () => {
    try {
      const res = await fetch("/api/planner/quick-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          mealTypes: ["dinner"],
          prioritizeLoved: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPlans(data.data.plans);
        toast.success(`Filled ${data.data.filled} dinner slots`);
      } else {
        toast.error(data.error || "Failed to quick fill");
      }
    } catch {
      toast.error("Failed to quick fill");
    }
  };

  const handleCopyPreviousWeek = async () => {
    const previousSunday = new Date(currentSunday);
    previousSunday.setDate(previousSunday.getDate() - 7);
    const previousWeekStart = formatWeekStart(previousSunday);

    try {
      const res = await fetch("/api/planner/copy-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWeek: previousWeekStart,
          targetWeek: weekStart,
          overwrite: false,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPlans(data.data.plans);
        toast.success(`Copied ${data.data.copied} meals from last week`);
      } else {
        toast.error(data.error || "Failed to copy from previous week");
      }
    } catch {
      toast.error("Failed to copy from previous week");
    }
  };

  const goToPreviousWeek = () => {
    const prev = new Date(currentSunday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentSunday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const goToCurrentWeek = () => {
    setCurrentMonday(getSunday(new Date()));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Meal Planner</h1>
          <p className="text-muted-foreground text-sm md:text-base">Plan your weekly meals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyPreviousWeek}>
            Copy Last Week
          </Button>
          <Button variant="outline" size="sm" onClick={handleQuickFill}>
            Quick Fill Dinners
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between gap-2">
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

      {/* Calendar Grid - Desktop (md+) */}
      {loading ? (
        <>
          {/* Desktop skeleton */}
          <div className="hidden md:grid grid-cols-8 gap-2">
            <div className="h-10" />
            {DAYS.map((day) => (
              <div key={day} className="h-10 bg-muted animate-pulse rounded" />
            ))}
            {MEAL_TYPES.map((meal) => (
              <Fragment key={meal}>
                <div className="h-24 bg-muted animate-pulse rounded" />
                {DAYS.map((_, i) => (
                  <div key={`${meal}-${i}`} className="h-24 bg-muted animate-pulse rounded" />
                ))}
              </Fragment>
            ))}
          </div>
          {/* Mobile skeleton */}
          <div className="md:hidden space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Desktop grid layout */}
          <div className="hidden md:grid grid-cols-8 gap-2">
            {/* Header Row */}
            <div className="font-medium text-muted-foreground" />
            {DAYS.map((day, index) => {
              const date = new Date(currentSunday);
              date.setDate(date.getDate() + index);
              const isToday =
                date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={day}
                  className={`text-center py-2 font-medium ${
                    isToday ? "bg-primary/10 rounded-t-lg" : ""
                  }`}
                >
                  <div>{day}</div>
                  <div className="text-sm text-muted-foreground">
                    {date.getDate()}
                  </div>
                </div>
              );
            })}

            {/* Meal Rows */}
            {MEAL_TYPES.map((mealType) => (
              <>
                <div
                  key={`label-${mealType}`}
                  className="font-medium text-muted-foreground capitalize flex items-center"
                >
                  {mealType}
                </div>
                {DAYS.map((_, dayIndex) => {
                  const plan = getPlan(dayIndex, mealType);
                  const date = new Date(currentSunday);
                  date.setDate(date.getDate() + dayIndex);
                  const isToday =
                    date.toDateString() === new Date().toDateString();

                  return (
                    <MealSlot
                      key={`${mealType}-${dayIndex}`}
                      plan={plan}
                      isToday={isToday}
                      onClick={() => handleSlotClick(dayIndex, mealType)}
                      onClear={() => handleClearSlot(dayIndex, mealType)}
                      onNotesClick={() => handleNotesClick(dayIndex, mealType)}
                      onViewRecipe={(id) => router.push(`/recipes/${id}`)}
                    />
                  );
                })}
              </>
            ))}
          </div>

          {/* Mobile day-by-day layout */}
          <div className="md:hidden space-y-3">
            {DAYS.map((day, dayIndex) => {
              const date = new Date(currentSunday);
              date.setDate(date.getDate() + dayIndex);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <Card
                  key={day}
                  className={`overflow-hidden ${isToday ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
                >
                  <CardHeader className={`py-2 px-4 ${isToday ? "bg-primary/10" : "bg-muted/30"}`}>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{day} {date.getMonth() + 1}/{date.getDate()}</span>
                      {isToday && (
                        <span className="text-xs font-normal text-primary">Today</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 space-y-1.5">
                    {MEAL_TYPES.map((mealType) => {
                      const plan = getPlan(dayIndex, mealType);
                      return (
                        <div key={mealType} className="flex items-start gap-2">
                          <span className="text-xs font-medium text-muted-foreground capitalize w-14 pt-2.5 shrink-0">
                            {mealType}
                          </span>
                          <div className="flex-1 min-w-0">
                            <MealSlot
                              plan={plan}
                              isToday={false}
                              compact
                              onClick={() => handleSlotClick(dayIndex, mealType)}
                              onClear={() => handleClearSlot(dayIndex, mealType)}
                              onNotesClick={() => handleNotesClick(dayIndex, mealType)}
                              onViewRecipe={(id) => router.push(`/recipes/${id}`)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Recipe Picker Dialog */}
      <RecipePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleRecipeSelect}
        onCustomMeal={handleCustomMeal}
      />

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meal Notes</DialogTitle>
            <DialogDescription>
              Add notes for this meal (e.g., &quot;leftovers&quot;, &quot;eating out&quot;)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Leftovers, eating out, etc."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNotesSave}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
