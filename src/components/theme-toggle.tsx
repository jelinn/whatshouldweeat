"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  variant?: "icon" | "menu-item";
}

export function ThemeToggle({ variant = "icon" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  const next = isDark ? "light" : "dark";

  if (variant === "menu-item") {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        className="flex items-center gap-2 rounded-md px-3 py-3 text-left text-base font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground"
      >
        {!mounted ? (
          <Sun className="h-4 w-4" />
        ) : isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
        <span>{mounted && isDark ? "Light mode" : "Dark mode"}</span>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(next)}
      aria-label={mounted ? `Switch to ${next} mode` : "Toggle theme"}
    >
      {!mounted ? (
        <Sun className="h-4 w-4" />
      ) : isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
