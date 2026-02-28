"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "Recipes" },
  { href: "/discover", label: "Discover" },
  { href: "/planner", label: "Meal Planner" },
  { href: "/grocery", label: "Grocery List" },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Mobile hamburger button */}
        <Button
          variant="ghost"
          size="sm"
          className="mr-2 px-2 md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span className="sr-only">Menu</span>
        </Button>

        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="text-lg md:text-xl font-bold truncate">WhatShouldWeEat</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === item.href
                  ? "text-foreground"
                  : "text-foreground/60"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop add recipe dropdown */}
        <div className="ml-auto hidden md:flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                Add Recipe
                <span className="ml-1">&#9660;</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/recipes/import" className="cursor-pointer">
                  Import from URL
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/recipes/new" className="cursor-pointer">
                  Manual Entry
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile slide-out menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-left">WhatShouldWeEat</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col px-2 py-2">
            {navItems.map((item) => (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-3 text-base font-medium transition-colors",
                    pathname === item.href
                      ? "bg-accent text-foreground"
                      : "text-foreground/70 hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </SheetClose>
            ))}
            <div className="my-2 border-t" />
            <SheetClose asChild>
              <Link
                href="/recipes/import"
                className="rounded-md px-3 py-3 text-base font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground"
              >
                Import Recipe from URL
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                href="/recipes/new"
                className="rounded-md px-3 py-3 text-base font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground"
              >
                Add Recipe Manually
              </Link>
            </SheetClose>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
