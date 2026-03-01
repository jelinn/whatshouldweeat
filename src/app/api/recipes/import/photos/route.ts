import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { getLLMProvider, isLLMConfigured } from "@/lib/ai";
import type { ImageData } from "@/lib/ai/types";
import type { ApiResponse } from "@/types";
import type { ExtractedRecipe } from "@/lib/services/recipe-extractor";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface PhotoImportResponse {
  recipe: ExtractedRecipe;
  source: "llm-photos";
}

// POST /api/recipes/import/photos - Import a recipe from cookbook photos
export async function POST(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  if (!isLLMConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "LLM is not configured. Please set ANTHROPIC_API_KEY in your environment.",
      },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("images") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one image is required" },
        { status: 400 }
      );
    }

    if (files.length > MAX_IMAGES) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_IMAGES} images allowed`,
        },
        { status: 400 }
      );
    }

    // Validate and convert files to base64
    const images: ImageData[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, GIF, WEBP`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `File "${file.name}" exceeds 10MB limit`,
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      images.push({
        data: buffer.toString("base64"),
        mediaType: file.type as ImageData["mediaType"],
      });
    }

    const provider = getLLMProvider();
    const recipe = await provider.extractRecipeFromImages(images);

    const response: ApiResponse<PhotoImportResponse> = {
      success: true,
      data: {
        recipe,
        source: "llm-photos",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error importing recipe from photos:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to extract recipe from photos: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
