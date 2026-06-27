"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
// Mirrors the planner grid, which only has these three meal slots.
const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

// Sunday (local midnight) of the week containing `date`. Matches planner page.
function getSunday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekStart(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatRange(sunday: Date): string {
  const sat = new Date(sunday);
  sat.setDate(sat.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${sunday.toLocaleDateString("en-US", opts)} – ${sat.toLocaleDateString(
    "en-US",
    opts
  )}`;
}

interface AddToPlanDialogProps {
  recipeId: string;
  recipeTitle: string;
}

export function AddToPlanDialog({ recipeId, recipeTitle }: AddToPlanDialogProps) {
  const today = new Date();
  const thisSunday = getSunday(today);
  const nextSunday = new Date(thisSunday);
  nextSunday.setDate(nextSunday.getDate() + 7);

  const [open, setOpen] = useState(false);
  // Default to next week mid-week onward, matching the planner's default view.
  const [week, setWeek] = useState<"this" | "next">(
    today.getDay() >= 3 ? "next" : "this"
  );
  const [day, setDay] = useState<string>(String(today.getDay()));
  const [meal, setMeal] = useState<string>("dinner");
  const [saving, setSaving] = useState(false);

  // The trigger lives inside a <Link>; stop the click from navigating.
  const openDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const handleAdd = async () => {
    setSaving(true);
    const sunday = week === "this" ? thisSunday : nextSunday;
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: formatWeekStart(sunday),
          dayOfWeek: parseInt(day, 10),
          mealType: meal,
          recipeId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Added to ${DAYS[parseInt(day, 10)]} ${meal}`);
        setOpen(false);
      } else {
        toast.error(data.error || "Failed to add to meal plan");
      }
    } catch {
      toast.error("Failed to add to meal plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 h-8 w-8 p-0"
        onClick={openDialog}
        title="Add to meal plan"
        aria-label="Add to meal plan"
      >
        <CalendarPlus className="h-4 w-4 text-muted-foreground" />
      </Button>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Add to meal plan</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {recipeTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Week</Label>
            <Select value={week} onValueChange={(v) => setWeek(v as "this" | "next")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this">
                  This week ({formatRange(thisSunday)})
                </SelectItem>
                <SelectItem value="next">
                  Next week ({formatRange(nextSunday)})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Meal</Label>
              <Select value={meal} onValueChange={setMeal}>
                <SelectTrigger>
                  <SelectValue />
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? "Adding…" : "Add to plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
