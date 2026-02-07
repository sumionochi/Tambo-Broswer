// app/api/collections/[id]/items/[itemId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
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
    const { id, itemId } = await params;

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

    // Remove item from collection
    const items = (collection.items as any[]) || [];
    const updatedItems = items.filter((item: any) => item.id !== itemId);

    await prisma.collection.update({
      where: { id },
      data: { items: updatedItems as any },
    });

    console.log("🗑️ Deleted item from collection:", itemId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete collection item error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete item" },
      { status: 500 }
    );
  }
}
