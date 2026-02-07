// app/api/collections/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

// GET /api/collections — List all collections for the user
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ collections: [] });
    }

    const prismaUser = await ensureUserExists(supabaseUser);

    const collections = await prisma.collection.findMany({
      where: { userId: prismaUser.id },
      orderBy: { updatedAt: "desc" },
    });

    const formattedCollections = collections.map((col) => ({
      id: col.id,
      name: col.name,
      items: (col.items as any[]) || [],
    }));

    console.log("📚 Loaded", formattedCollections.length, "collections");

    return NextResponse.json({ collections: formattedCollections });
  } catch (error: any) {
    console.error("Load collections error:", error);
    return NextResponse.json({ collections: [] });
  }
}

// POST /api/collections — Create an empty collection
export async function POST(request: NextRequest) {
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
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.collection.findFirst({
      where: { userId: prismaUser.id, name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "A collection with this name already exists",
          collection: {
            id: existing.id,
            name: existing.name,
            items: (existing.items as any[]) || [],
          },
        },
        { status: 409 }
      );
    }

    const collection = await prisma.collection.create({
      data: {
        userId: prismaUser.id,
        name: name.trim(),
        items: [],
      },
    });

    console.log("📁 Created empty collection:", collection.name);

    return NextResponse.json({
      success: true,
      collection: {
        id: collection.id,
        name: collection.name,
        items: [],
      },
    });
  } catch (error: any) {
    console.error("Create collection error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create collection" },
      { status: 500 }
    );
  }
}
