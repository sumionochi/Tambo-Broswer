// app/api/search-sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

// GET /api/search-sessions?query=cats&source=google
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ results: [] });
    }

    const prismaUser = await ensureUserExists(supabaseUser);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const source = searchParams.get("source");

    if (!query) {
      return NextResponse.json(
        { error: "query parameter is required" },
        { status: 400 }
      );
    }

    // Find the most recent session matching this query
    const session = await prisma.searchSession.findFirst({
      where: {
        userId: prismaUser.id,
        query: query,
        ...(source && { source }),
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      return NextResponse.json({ results: [], sessionId: null });
    }

    return NextResponse.json({
      results: session.results as any[],
      sessionId: session.id,
      query: session.query,
      source: session.source,
      createdAt: session.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Load search session error:", error);
    return NextResponse.json({ results: [], sessionId: null });
  }
}
