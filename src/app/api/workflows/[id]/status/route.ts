// app/api/workflows/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";

// GET /api/workflows/[id]/status — Get real-time workflow status
export async function GET(
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
      include: {
        executions: {
          orderBy: { stepIndex: "asc" },
          select: {
            id: true,
            stepIndex: true,
            stepType: true,
            stepTitle: true,
            status: true,
            error: true,
            durationMs: true,
            output: true,
            createdAt: true,
            completedAt: true,
          },
        },
        report: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (workflow.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate progress percentage
    const completedSteps = workflow.executions.filter(
      (e) => e.status === "completed"
    ).length;
    const progress =
      workflow.totalSteps > 0
        ? Math.round((completedSteps / workflow.totalSteps) * 100)
        : 0;

    // Build step status array from workflow definition + execution records
    const steps = (workflow.steps as any[]).map((stepDef: any) => {
      const execution = workflow.executions.find(
        (e) => e.stepIndex === stepDef.index
      );
      return {
        index: stepDef.index,
        type: stepDef.type,
        title: stepDef.title,
        description: stepDef.description,
        status: execution?.status || "pending",
        error: execution?.error || null,
        durationMs: execution?.durationMs || null,
        hasOutput: !!execution?.output,
      };
    });

    return NextResponse.json({
      workflowId: workflow.id,
      title: workflow.title,
      description: workflow.description,
      query: workflow.query,
      status: workflow.status,
      currentStep: workflow.currentStep,
      totalSteps: workflow.totalSteps,
      progress,
      steps,
      sources: workflow.sources,
      outputFormat: workflow.outputFormat,
      errorMessage: workflow.errorMessage,
      failedStep: workflow.failedStep,
      reportId: workflow.report?.id || null,
      reportTitle: workflow.report?.title || null,
      createdAt: workflow.createdAt,
      completedAt: workflow.completedAt,
    });
  } catch (error) {
    console.error("Failed to get workflow status:", error);
    return NextResponse.json(
      { error: "Failed to get workflow status" },
      { status: 500 }
    );
  }
}
