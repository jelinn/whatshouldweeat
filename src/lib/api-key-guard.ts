import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export function requireApiKey(request: NextRequest) {
  const expected = process.env.BRIEFING_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { success: false, error: "Briefing API key not configured" },
      { status: 503 }
    );
  }

  const provided = request.headers.get("x-api-key");
  if (!provided) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null;
}
