// app/api/search/web/route.ts
import { NextResponse } from "next/server";
import { searchWeb } from "@/lib/apis/google-serp";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, filters } = body.searchRequest || body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    // Search
    const results = await searchWeb(query, filters);

    // Save search history + session if user is authenticated
    if (supabaseUser) {
      try {
        const prismaUser = await ensureUserExists(supabaseUser);

        // Save exact results for later retrieval (SearchHistoryDialog)
        await prisma.searchSession.create({
          data: {
            userId: prismaUser.id,
            query,
            source: "google",
            results: results as any,
          },
        });

        // Also save to SearchHistory for the history list
        await prisma.searchHistory.create({
          data: {
            userId: prismaUser.id,
            query,
            source: "google",
            filters: filters ? (filters as any) : null,
            resultsCount: results.length,
          },
        });

        console.log("✅ Saved search history + session:", query);
      } catch (historyError) {
        // Don't fail the search if history save fails
        console.error("Failed to save search history:", historyError);
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Web search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
