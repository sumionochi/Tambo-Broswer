// app/api/workflows/execute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureUserExists } from "@/lib/utils/sync-user";
import { planWorkflowSteps } from "@/lib/workflow-engine";
import { matchTemplate, buildFromTemplate } from "@/lib/workflow-templates";

// POST /api/workflows/execute — Create and start a workflow
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
    const {
      goal,
      sources = ["google"],
      depth = "standard",
      outputFormat = "summary",
      templateId, // Optional: force a specific template
    } = body;

    if (!goal || typeof goal !== "string") {
      return NextResponse.json(
        { error: "Missing required field: goal" },
        { status: 400 }
      );
    }

    let title: string = "";
    let description: string = "";
    let steps: any[] = [];
    let usedTemplate = false;

    // ── Step 1: Try template matching first (instant, no AI call) ──
    if (templateId) {
      // Forced template by ID
      const { WORKFLOW_TEMPLATES } = await import("@/lib/workflow-templates");
      const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        const result = buildFromTemplate(
          template,
          goal,
          depth,
          sources,
          outputFormat
        );
        title = result.title;
        description = result.description;
        steps = result.steps;
        usedTemplate = true;
        console.log(`⚡ Using forced template: ${template.name}`);
      }
    }

    if (!usedTemplate) {
      // Try auto-matching
      const match = matchTemplate(goal);

      if (match && match.confidence >= 0.5) {
        // High-confidence template match — use it
        const result = buildFromTemplate(
          match.template,
          match.topic,
          depth,
          sources,
          outputFormat
        );
        title = result.title;
        description = result.description;
        steps = result.steps;
        usedTemplate = true;
        console.log(
          `⚡ Template matched: ${
            match.template.name
          } (confidence: ${match.confidence.toFixed(2)}, topic: "${
            match.topic
          }")`
        );
      }
    }

    if (!usedTemplate) {
      // ── Step 1b: Fall back to AI planning ──
      console.log(`🤖 No template match, using AI planner for: "${goal}"`);
      const plan = await planWorkflowSteps({
        goal,
        sources,
        depth,
        outputFormat,
      });
      title = plan.title;
      description = plan.description;
      steps = plan.steps;
    }

    // ── Step 2: Create the workflow record in database ──
    const workflow = await prisma.workflow.create({
      data: {
        userId: user.id,
        title,
        description,
        query: goal,
        status: "pending",
        currentStep: 0,
        totalSteps: steps.length,
        steps: JSON.parse(JSON.stringify(steps)),
        results: JSON.parse(JSON.stringify([])),
        sources,
        depth,
        outputFormat,
      },
    });

    // ── Step 3: Start execution asynchronously (fire-and-forget) ──
    const { executeWorkflow } = await import("@/lib/workflow-engine");

    executeWorkflow(workflow.id).catch((err) => {
      console.error(`Workflow ${workflow.id} execution error:`, err);
    });

    // ── Step 4: Return workflow info immediately ──
    return NextResponse.json({
      success: true,
      workflowId: workflow.id,
      title: workflow.title,
      status: "pending",
      totalSteps: steps.length,
      usedTemplate,
      steps: steps.map((s: any) => ({
        index: s.index,
        type: s.type,
        title: s.title,
        description: s.description,
        status: "pending",
      })),
      message: usedTemplate
        ? `Workflow created from template with ${steps.length} steps. Execution starting...`
        : `Workflow created with ${steps.length} AI-planned steps. Execution starting...`,
    });
  } catch (error: any) {
    console.error("Failed to create workflow:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create workflow" },
      { status: 500 }
    );
  }
}
