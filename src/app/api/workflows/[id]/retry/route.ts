// app/api/workflows/[id]/retry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

// POST /api/workflows/[id]/retry — Retry from the failed step
export async function POST(
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
    const user = await ensureUserExists(supabaseUser);

    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
        failedStep: true,
        totalSteps: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (workflow.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (workflow.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed workflows can be retried" },
        { status: 400 }
      );
    }

    const retryFromStep = workflow.failedStep ?? 0;

    // Reset workflow status to running
    await prisma.workflow.update({
      where: { id },
      data: {
        status: "running",
        currentStep: retryFromStep,
        errorMessage: null,
        failedStep: null,
      },
    });

    // Delete failed execution records for the failed step (will be recreated)
    await prisma.workflowExecution.deleteMany({
      where: {
        workflowId: id,
        stepIndex: { gte: retryFromStep },
        status: "failed",
      },
    });

    // Restart execution from the failed step
    const { executeWorkflow } = await import("@/lib/workflow-engine");
    executeWorkflow(id, retryFromStep).catch((err) => {
      console.error(`Workflow ${id} retry error:`, err);
    });

    return NextResponse.json({
      success: true,
      message: `Retrying workflow from step ${retryFromStep + 1}`,
      retryFromStep,
    });
  } catch (error) {
    console.error("Failed to retry workflow:", error);
    return NextResponse.json(
      { error: "Failed to retry workflow" },
      { status: 500 }
    );
  }
}
