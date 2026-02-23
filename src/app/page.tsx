import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          WhatShouldWeEat
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Your personal recipe storage and meal planning assistant. Save recipes, plan your meals, and generate smart grocery lists.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Button asChild size="lg">
            <Link href="/recipes/import">Import a Recipe</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/recipes">Browse Recipes</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/discover">AI Discover</Link>
          </Button>
        </div>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recipe Storage</CardTitle>
            <CardDescription>
              Save and organize all your favorite recipes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Import from food blog URLs</li>
              <li>Paste text from any source</li>
              <li>Rate and love your favorites</li>
              <li>Add personal notes</li>
            </ul>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/recipes">View Recipes →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Discovery</CardTitle>
            <CardDescription>
              Get smart recommendations and generate new recipes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Personalized recommendations</li>
              <li>Based on your favorites</li>
              <li>Generate original recipes</li>
              <li>Custom constraints</li>
            </ul>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/discover">Discover →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meal Planning</CardTitle>
            <CardDescription>
              Plan your weekly meals with ease
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Weekly calendar view</li>
              <li>Quick fill from favorites</li>
              <li>Copy from previous weeks</li>
              <li>Notes for dining out</li>
            </ul>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/planner">Plan Meals →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grocery Lists</CardTitle>
            <CardDescription>
              Auto-generate shopping lists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Aggregate ingredients</li>
              <li>Smart unit conversion</li>
              <li>Organize by aisle</li>
              <li>Persistent staples</li>
            </ul>
            <Button asChild variant="link" className="px-0 mt-2">
              <Link href="/grocery">View List →</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/recipes/import">
              <CardContent className="pt-6">
                <div className="text-3xl mb-2">📥</div>
                <h3 className="font-semibold">Import Recipe</h3>
                <p className="text-sm text-muted-foreground">
                  From URL or paste text
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/planner">
              <CardContent className="pt-6">
                <div className="text-3xl mb-2">📅</div>
                <h3 className="font-semibold">Plan This Week</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your meal plan
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/grocery">
              <CardContent className="pt-6">
                <div className="text-3xl mb-2">🛒</div>
                <h3 className="font-semibold">Grocery List</h3>
                <p className="text-sm text-muted-foreground">
                  Generate from meal plan
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
