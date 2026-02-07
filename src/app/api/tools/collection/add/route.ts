// app/api/tools/collection/add/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";
import { searchWeb } from "@/lib/apis/google-serp";
import { searchPexels } from "@/lib/apis/pexels";
import { searchRepositories } from "@/lib/apis/github";

interface CollectionItem {
  id: string;
  type: "article" | "repo" | "image" | "pin";
  url: string;
  title: string;
  thumbnail?: string;
}

function generateItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** Map tool searchType → DB source field */
function mapSearchTypeToSource(searchType: string): string {
  switch (searchType) {
    case "web":
      return "google";
    case "pexels":
      return "pexels";
    case "github":
      return "github";
    default:
      return searchType;
  }
}

/** Extract collection items from raw search results by index */
function extractItemsFromResults(
  searchResults: any[],
  indices: number[],
  searchType: string
): CollectionItem[] {
  return indices
    .filter((index: number) => index >= 0 && index < searchResults.length)
    .map((index: number) => {
      const result = searchResults[index];

      if (searchType === "web") {
        return {
          id: generateItemId(),
          type: "article" as const,
          url: result.url || result.link || "",
          title: result.title || "Untitled",
          thumbnail: result.thumbnail || result.imageUrl,
        };
      } else if (searchType === "pexels") {
        return {
          id: generateItemId(),
          type: "image" as const,
          url: result.url || result.src?.original || "",
          title: result.title || result.alt || "Image",
          thumbnail: result.imageUrl || result.src?.medium || result.src?.small,
        };
      } else if (searchType === "github") {
        return {
          id: generateItemId(),
          type: "repo" as const,
          url: result.url || result.html_url || "",
          title: result.fullName || result.full_name || result.name || "Repo",
          thumbnail: result.owner?.avatar_url,
        };
      }
      return null;
    })
    .filter(
      (item): item is NonNullable<typeof item> => item !== null
    ) as CollectionItem[];
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prismaUser = await ensureUserExists(supabaseUser);
    const body = await request.json();
    const { collectionName } = body;

    if (!collectionName) {
      return NextResponse.json(
        {
          success: false,
          itemsAdded: 0,
          collectionId: "",
          message: "collectionName is required",
        },
        { status: 400 }
      );
    }

    let itemsToAdd: CollectionItem[] = [];

    // ─── Path A: Direct items from UI (QuickActionDialog, Collections component) ───
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      console.log("📦 Direct bookmark request:", {
        collectionName,
        itemCount: body.items.length,
      });

      itemsToAdd = body.items.map(
        (item: {
          type?: string;
          url?: string;
          title?: string;
          thumbnail?: string;
        }) => ({
          id: generateItemId(),
          type: item.type || "article",
          url: item.url || "",
          title: item.title || "Untitled",
          thumbnail: item.thumbnail,
        })
      );
    }
    // ─── Path B: Search + indices from Tambo tools ───
    //
    // KEY FIX: Look up cached SearchSession first instead of re-searching.
    //
    // The search components (SearchResults, PexelsGrid, RepoExplorer) save
    // their results to SearchSession when the user searches. Re-running the
    // search gives DIFFERENT results (different ranking, API timing, etc.),
    // so bookmarks would point to the wrong items.
    //
    // Flow: User sees results → says "bookmark first 3" → AI calls this tool
    // → we look up the SAME results from the session → pick correct items.
    //
    else if (
      body.searchQuery &&
      body.searchType &&
      Array.isArray(body.indices)
    ) {
      const { searchQuery, searchType, indices } = body;
      const dbSource = mapSearchTypeToSource(searchType);

      console.log("📦 Search-based bookmark request:", {
        collectionName,
        searchQuery,
        searchType,
        dbSource,
        indices,
      });

      let searchResults: any[] = [];

      // Step 1: Try to find the cached session (most recent match)
      try {
        const session = await prisma.searchSession.findFirst({
          where: {
            userId: prismaUser.id,
            query: searchQuery,
            source: dbSource,
          },
          orderBy: { createdAt: "desc" },
        });

        if (session && Array.isArray(session.results)) {
          searchResults = session.results as any[];
          console.log(
            `✅ Found cached session (${session.id}) with ${searchResults.length} results`
          );
        }
      } catch (sessionError) {
        console.warn(
          "⚠️ Session lookup failed, will fall back to re-search:",
          sessionError
        );
      }

      // Step 2: Fallback — re-search ONLY if no cached session found
      if (searchResults.length === 0) {
        console.log("⚠️ No cached session found, falling back to re-search");

        if (searchType === "web") {
          searchResults = await searchWeb(searchQuery);
        } else if (searchType === "pexels") {
          searchResults = await searchPexels(searchQuery);
        } else if (searchType === "github") {
          searchResults = await searchRepositories(searchQuery, { limit: 20 });
        }

        console.log(`🔄 Re-searched and got ${searchResults.length} results`);
      }

      // Step 3: Extract items at specified indices from the results
      itemsToAdd = extractItemsFromResults(searchResults, indices, searchType);
    }
    // ─── Neither path matched ───
    else {
      return NextResponse.json(
        {
          success: false,
          itemsAdded: 0,
          collectionId: "",
          message:
            "Provide either 'items' array (direct) or 'searchQuery' + 'searchType' + 'indices' (search-based)",
        },
        { status: 400 }
      );
    }

    if (itemsToAdd.length === 0) {
      return NextResponse.json(
        {
          success: false,
          itemsAdded: 0,
          collectionId: "",
          message: "No valid items to add",
        },
        { status: 400 }
      );
    }

    // Find or create collection
    let collection = await prisma.collection.findFirst({
      where: { userId: prismaUser.id, name: collectionName },
    });

    if (!collection) {
      collection = await prisma.collection.create({
        data: { userId: prismaUser.id, name: collectionName, items: [] },
      });
    }

    // Append items
    const existingItems = (collection.items as any[]) || [];

    await prisma.collection.update({
      where: { id: collection.id },
      data: { items: [...existingItems, ...itemsToAdd] },
    });

    console.log(
      `✅ Added ${itemsToAdd.length} items to "${collectionName}":`,
      itemsToAdd.map((i) => i.title)
    );

    return NextResponse.json({
      success: true,
      collectionId: collection.id,
      itemsAdded: itemsToAdd.length,
      message: `Added ${itemsToAdd.length} items to "${collectionName}"`,
    });
  } catch (error: any) {
    console.error("❌ Collection add error:", error);
    return NextResponse.json(
      {
        success: false,
        itemsAdded: 0,
        collectionId: "",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
