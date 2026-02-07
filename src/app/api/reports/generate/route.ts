// app/api/reports/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";
import { synthesizeReport } from "@/lib/workflow-engine";

// POST /api/reports/generate — Generate report from workflow results or collection
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await ensureUserExists(supabaseUser);

    const body = await request.json();
    const { workflowId, collectionId, reportType = "summary", title } = body;

    if (!workflowId && !collectionId) {
      return NextResponse.json(
        { error: "Either workflowId or collectionId is required" },
        { status: 400 }
      );
    }

    let reportData: any;
    let sourceData: any = {};

    // ── Generate from workflow results ──
    if (workflowId) {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          report: { select: { id: true } },
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

      if (workflow.status !== "completed") {
        return NextResponse.json(
          { error: "Workflow must be completed before generating a report" },
          { status: 400 }
        );
      }

      // If report already exists for this workflow, return it
      if (workflow.report) {
        const existingReport = await prisma.report.findUnique({
          where: { id: workflow.report.id },
        });
        return NextResponse.json({
          success: true,
          report: existingReport,
          message: "Report already exists for this workflow",
        });
      }

      // Synthesize report from workflow results
      reportData = await synthesizeReport({
        goal: workflow.query,
        results: workflow.results as any[],
        outputFormat: reportType || workflow.outputFormat,
        customTitle: title,
      });

      sourceData = {
        workflowQuery: workflow.query,
        workflowId: workflow.id,
        sources: workflow.sources.map((s) => ({ type: s })),
      };
    }

    // ── Generate from collection ──
    if (collectionId) {
      const collection = await prisma.collection.findUnique({
        where: { id: collectionId },
      });

      if (!collection) {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        );
      }

      if (collection.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const items = collection.items as any[];

      // Synthesize report from collection items
      reportData = await synthesizeReport({
        goal: `Analyze and summarize the collection "${collection.name}"`,
        results: [
          { stepIndex: 0, data: { items, collectionName: collection.name } },
        ],
        outputFormat: reportType,
        customTitle: title || `${collection.name} — ${reportType} Report`,
      });

      sourceData = {
        collectionId: collection.id,
        collectionName: collection.name,
        itemCount: items.length,
      };
    }

    // Save report to database
    const report = await prisma.report.create({
      data: {
        userId: user.id,
        title: reportData.title,
        summary: reportData.summary,
        sections: reportData.sections,
        format: reportType,
        sourceData,
        workflowId: workflowId || null,
        sourceCollectionId: collectionId || null,
      },
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      report,
      message: "Report generated successfully",
    });
  } catch (error: any) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}
