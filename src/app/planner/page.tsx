"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meal Planner</h1>
          <p className="text-muted-foreground">Plan your weekly meals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyPreviousWeek}>
            Copy Last Week
          </Button>
          <Button variant="outline" onClick={handleQuickFill}>
            Quick Fill Dinners
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
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

      {/* Calendar Grid */}
      {loading ? (
        <div className="grid grid-cols-8 gap-2">
          {/* Header skeleton */}
          <div className="h-10" />
          {DAYS.map((day) => (
            <div key={day} className="h-10 bg-muted animate-pulse rounded" />
          ))}
          {/* Body skeleton */}
          {MEAL_TYPES.map((meal) => (
            <Fragment key={meal}>
              <div className="h-24 bg-muted animate-pulse rounded" />
              {DAYS.map((_, i) => (
                <div key={`${meal}-${i}`} className="h-24 bg-muted animate-pulse rounded" />
              ))}
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-8 gap-2">
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
                  />
                );
              })}
            </>
          ))}
        </div>
      )}

      {/* Recipe Picker Dialog */}
      <RecipePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleRecipeSelect}
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
