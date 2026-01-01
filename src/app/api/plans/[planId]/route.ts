import { NextRequest, NextResponse } from "next/server";
import {
  getPlanById,
  deletePlan,
  switchActivePlan,
  updatePlan,
  getUserPlanSummaries,
  getPlanTasks,
  deletePlanTasks,
} from "@/lib/dynamodb";

// GET /api/plans/[planId]?email=user@example.com
// Returns full plan data by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const plan = await getPlanById(email, planId);

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    // Load tasks from separate table if plan has no tasks
    if (!plan.dailyTasks || plan.dailyTasks.length === 0) {
      const tasks = await getPlanTasks(planId);
      plan.dailyTasks = tasks;
    }

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Error fetching plan:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}

// PUT /api/plans/[planId]
// Updates a plan (switch active, update progress, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const body = await request.json();
    const { email, action, updates } = body as {
      email: string;
      action?: "switch" | "update";
      updates?: Record<string, unknown>;
    };

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    let result;

    if (action === "switch") {
      // Switch active plan
      result = await switchActivePlan(email, planId);
    } else if (action === "update" && updates) {
      // Update plan data
      result = await updatePlan(email, planId, updates);
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action or missing updates" },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Get updated plan data
    const plan = await getPlanById(email, planId);
    const plans = await getUserPlanSummaries(email);

    return NextResponse.json({
      success: true,
      plan,
      plans,
      activePlanId: planId,
    });
  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update plan" },
      { status: 500 }
    );
  }
}

// DELETE /api/plans/[planId]
// Deletes a plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Delete tasks from separate table first
    await deletePlanTasks(planId);

    const result = await deletePlan(email, planId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Get updated plan summaries
    const plans = await getUserPlanSummaries(email);

    return NextResponse.json({
      success: true,
      plans,
      activePlanId: plans.length > 0 ? plans[0].planId : null,
    });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete plan" },
      { status: 500 }
    );
  }
}
