"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  totalTimeMinutes?: number;
  cuisine?: string;
}

interface MealPlan {
  id: string;
  recipeId: string | null;
  notes: string | null;
  recipe: Recipe | null;
}

interface MealSlotProps {
  plan?: MealPlan;
  isToday?: boolean;
  onClick: () => void;
  onClear: () => void;
  onNotesClick: () => void;
}

export function MealSlot({
  plan,
  isToday,
  onClick,
  onClear,
  onNotesClick,
}: MealSlotProps) {
  const hasRecipe = plan?.recipe;
  const hasNotes = plan?.notes;
  const isEmpty = !hasRecipe && !hasNotes;

  return (
    <Card
      className={`min-h-24 p-2 cursor-pointer transition-all hover:shadow-md ${
        isToday ? "border-primary/50 bg-primary/5" : ""
      } ${isEmpty ? "border-dashed" : ""}`}
      onClick={onClick}
    >
      {hasRecipe ? (
        <div className="h-full flex flex-col">
          <div className="flex-1">
            <p className="text-sm font-medium line-clamp-2">
              {plan.recipe!.title}
            </p>
            {plan.recipe!.totalTimeMinutes && (
              <p className="text-xs text-muted-foreground mt-1">
                {plan.recipe!.totalTimeMinutes} min
              </p>
            )}
          </div>
          <div className="flex justify-between items-center mt-2">
            {hasNotes && (
              <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                📝 {plan.notes}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                  ⋯
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  Change Recipe
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onNotesClick();
                  }}
                >
                  {hasNotes ? "Edit Notes" : "Add Notes"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="text-destructive"
                >
                  Clear
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : hasNotes ? (
        <div className="h-full flex flex-col">
          <p className="text-sm font-medium line-clamp-3">
            {plan!.notes}
          </p>
          <div className="mt-auto flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  ⋯
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  Add Recipe
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onNotesClick();
                  }}
                >
                  Edit Notes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="text-destructive"
                >
                  Clear
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <span className="text-sm text-muted-foreground">+ Add meal</span>
        </div>
      )}
    </Card>
  );
}
