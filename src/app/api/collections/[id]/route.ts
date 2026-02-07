// app/api/collections/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prismaUser = await ensureUserExists(supabaseUser);
    const { id } = await params;

    // Verify ownership
    const collection = await prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    if (collection.userId !== prismaUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete collection
    await prisma.collection.delete({
      where: { id },
    });

    console.log("🗑️ Deleted collection:", id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete collection error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete collection" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prismaUser = await ensureUserExists(supabaseUser);
    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const collection = await prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    if (collection.userId !== prismaUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update collection
    const updatedCollection = await prisma.collection.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
      },
    });

    console.log("✏️ Updated collection:", id);

    return NextResponse.json({
      success: true,
      collection: {
        id: updatedCollection.id,
        name: updatedCollection.name,
        items: updatedCollection.items,
        createdAt: updatedCollection.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Update collection error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update collection" },
      { status: 500 }
    );
  }
}
