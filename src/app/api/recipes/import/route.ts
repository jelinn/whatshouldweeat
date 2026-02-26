import { NextRequest, NextResponse } from "next/server";
import {
  fetchAndExtractRecipe,
  toCreateRecipeInput,
  type ExtractedRecipe,
} from "@/lib/services/recipe-extractor";
import { getLLMProvider, isLLMConfigured } from "@/lib/ai";
import type { ApiResponse } from "@/types";

interface ImportRequest {
  url?: string;
  text?: string;
  useLLM?: boolean;
}

interface ImportResponse {
  recipe: ExtractedRecipe;
  source: "json-ld" | "llm-html" | "llm-text";
  warnings?: string[];
}

// POST /api/recipes/import - Import a recipe from URL or text
export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();

    // Validate input
    if (!body.url && !body.text) {
      return NextResponse.json(
        { success: false, error: "Either URL or text is required" },
        { status: 400 }
      );
    }

    const warnings: string[] = [];

    // Handle text extraction (copy-paste)
    if (body.text) {
      if (!isLLMConfigured()) {
        return NextResponse.json(
          {
            success: false,
            error: "LLM is not configured. Please set ANTHROPIC_API_KEY in your environment.",
          },
          { status: 400 }
        );
      }

      try {
        const provider = getLLMProvider();
        const recipe = await provider.extractRecipeFromText(body.text);

        const response: ApiResponse<ImportResponse> = {
          success: true,
          data: {
            recipe,
            source: "llm-text",
          },
        };

        return NextResponse.json(response);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to extract recipe from text: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          { status: 500 }
        );
      }
    }

    // Handle URL extraction
    if (body.url) {
      // Validate URL
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid URL provided" },
          { status: 400 }
        );
      }

      // Try structured data extraction first (JSON-LD, then microdata)
      const { recipe: structuredRecipe, html, source: extractionSource, error } = await fetchAndExtractRecipe(body.url);

      if (structuredRecipe) {
        const response: ApiResponse<ImportResponse> = {
          success: true,
          data: {
            recipe: structuredRecipe,
            source: "json-ld",
          },
        };

        return NextResponse.json(response);
      }

      // No structured data - try LLM extraction if requested and configured
      if (body.useLLM !== false) {
        if (!isLLMConfigured()) {
          return NextResponse.json(
            {
              success: false,
              error: error || "No structured recipe data found, and LLM is not configured. Set ANTHROPIC_API_KEY to enable AI extraction.",
            },
            { status: 400 }
          );
        }

        if (!html) {
          return NextResponse.json(
            {
              success: false,
              error: error || "Failed to fetch page content",
            },
            { status: 400 }
          );
        }

        try {
          const provider = getLLMProvider();
          const recipe = await provider.extractRecipeFromHtml(html, body.url);

          warnings.push("Recipe extracted using AI. Please verify the details.");

          const response: ApiResponse<ImportResponse> = {
            success: true,
            data: {
              recipe,
              source: "llm-html",
              warnings: warnings.length > 0 ? warnings : undefined,
            },
          };

          return NextResponse.json(response);
        } catch (llmError) {
          return NextResponse.json(
            {
              success: false,
              error: `Failed to extract recipe with AI: ${llmError instanceof Error ? llmError.message : "Unknown error"}`,
            },
            { status: 500 }
          );
        }
      }

      // No LLM and no structured data
      return NextResponse.json(
        {
          success: false,
          error: error || "No structured recipe data found. Enable AI extraction or paste the recipe text.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error importing recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import recipe" },
      { status: 500 }
    );
  }
}
