"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StatsData {
  overview: {
    totalRecipes: number;
    totalFavorites: number;
    totalCooks: number;
    totalMealPlans: number;
    neverCooked: number;
    averageRating: number | null;
    ratedCount: number;
  };
  cuisineBreakdown: { cuisine: string; count: number }[];
  mealTypeBreakdown: { mealType: string; count: number }[];
  difficultyBreakdown: { difficulty: string; count: number }[];
  mostCooked: { recipeId: string; title: string; count: number }[];
  cooksByMonth: { month: string; count: number }[];
  recipesByMonth: { month: string; count: number }[];
  recentRecipes: {
    id: string;
    title: string;
    createdAt: string;
    cuisine: string | null;
  }[];
  topRated: {
    id: string;
    title: string;
    rating: number;
    cuisine: string | null;
  }[];
}

function StatNumber({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function BarChart({
  data,
  labelKey,
  valueKey,
  color = "bg-primary",
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet</p>;
  }
  const max = Math.max(...data.map((d) => d[valueKey] as number));
  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const value = item[valueKey] as number;
        const label = item[labelKey] as string;
        const pct = max > 0 ? (value / max) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm w-28 truncate text-right">
              {label || "Uncategorized"}
            </span>
            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-medium w-8 text-right">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyChart({
  data,
  label,
}: {
  data: { month: string; count: number }[];
  label: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet</p>;
  }
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1 h-32">
        {data.map((item) => {
          const pct = max > 0 ? (item.count / max) * 100 : 0;
          return (
            <div
              key={item.month}
              className="flex-1 flex flex-col items-center justify-end h-full"
            >
              <span className="text-xs font-medium mb-1">{item.count}</span>
              <div
                className="w-full bg-primary rounded-t min-h-[2px]"
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {data.map((item) => (
          <div key={item.month} className="flex-1 text-center">
            <span className="text-[10px] text-muted-foreground">
              {formatMonth(item.month)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-1">{label}</p>
    </div>
  );
}

function formatMonth(ym: string) {
  const [year, month] = ym.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[parseInt(month) - 1]} '${year.slice(2)}`;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        } else {
          toast.error("Failed to load stats");
        }
      })
      .catch(() => toast.error("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Cook Stats</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { overview } = stats;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cook Stats</h1>
        <p className="text-muted-foreground">
          Your cooking activity and recipe collection at a glance
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <StatNumber value={overview.totalRecipes} label="Total Recipes" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <StatNumber value={overview.totalFavorites} label="Favorites" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <StatNumber value={overview.totalCooks} label="Times Cooked" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <StatNumber
              value={overview.averageRating ?? "-"}
              label={`Avg Rating (${overview.ratedCount} rated)`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Second row of overview */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <StatNumber
              value={overview.totalMealPlans}
              label="Meals Planned"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <StatNumber
              value={overview.neverCooked}
              label="Never Cooked"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <StatNumber
              value={
                overview.totalRecipes > 0
                  ? Math.round(
                      ((overview.totalRecipes - overview.neverCooked) /
                        overview.totalRecipes) *
                        100
                    ) + "%"
                  : "-"
              }
              label="Recipes Tried"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Cooking activity by month */}
        <Card>
          <CardHeader>
            <CardTitle>Cooking Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart
              data={stats.cooksByMonth.slice(-12)}
              label="Cooks per month"
            />
          </CardContent>
        </Card>

        {/* Recipes added by month */}
        <Card>
          <CardHeader>
            <CardTitle>Recipes Added</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart
              data={stats.recipesByMonth.slice(-12)}
              label="Recipes added per month"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Cuisine breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>By Cuisine</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.cuisineBreakdown}
              labelKey="cuisine"
              valueKey="count"
            />
          </CardContent>
        </Card>

        {/* Meal type breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>By Meal Type</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.mealTypeBreakdown}
              labelKey="mealType"
              valueKey="count"
              color="bg-blue-500"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Difficulty breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>By Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={stats.difficultyBreakdown}
              labelKey="difficulty"
              valueKey="count"
              color="bg-amber-500"
            />
          </CardContent>
        </Card>

        {/* Most cooked */}
        <Card>
          <CardHeader>
            <CardTitle>Most Cooked</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.mostCooked.length > 0 ? (
              <div className="space-y-3">
                {stats.mostCooked.map((item, i) => (
                  <div key={item.recipeId} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {i + 1}
                    </span>
                    <Link
                      href={`/recipes/${item.recipeId}`}
                      className="flex-1 text-sm hover:underline truncate"
                    >
                      {item.title}
                    </Link>
                    <Badge variant="secondary">{item.count}x</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No cook history yet. Mark recipes as cooked to see stats here!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Top rated */}
        <Card>
          <CardHeader>
            <CardTitle>Top Rated</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topRated.length > 0 ? (
              <div className="space-y-3">
                {stats.topRated.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Link
                      href={`/recipes/${item.id}`}
                      className="flex-1 text-sm hover:underline truncate"
                    >
                      {item.title}
                    </Link>
                    <span className="text-yellow-500 text-sm">
                      {"★".repeat(item.rating)}
                      {"☆".repeat(5 - item.rating)}
                    </span>
                    {item.cuisine && (
                      <Badge variant="outline" className="text-xs">
                        {item.cuisine}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Rate some recipes to see your favorites here!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recently added */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Added</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentRecipes.length > 0 ? (
              <div className="space-y-3">
                {stats.recentRecipes.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Link
                      href={`/recipes/${item.id}`}
                      className="flex-1 text-sm hover:underline truncate"
                    >
                      {item.title}
                    </Link>
                    {item.cuisine && (
                      <Badge variant="outline" className="text-xs">
                        {item.cuisine}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recipes yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
