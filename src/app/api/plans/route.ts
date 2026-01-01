import { NextRequest, NextResponse } from "next/server";
import {
  getUserPlanSummaries,
  addPlanToUser,
  getUserByEmailV2,
  isUserDocumentV2,
  saveUserV2,
  savePlanTasks,
  CURRENT_SCHEMA_VERSION,
} from "@/lib/dynamodb";
import {
  PlanDocument,
  UserDocumentV2,
  DEFAULT_USER_SETTINGS,
  MAX_PLANS_PER_USER,
  EnhancedDailyTask,
} from "@/types/multiplan";

// GET /api/plans?email=user@example.com
// Returns all plan summaries for a user
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const plans = await getUserPlanSummaries(email);

    return NextResponse.json({
      success: true,
      plans,
      canAddPlan: plans.length < MAX_PLANS_PER_USER,
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

// POST /api/plans
// Creates a new plan for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, plan } = body as { email: string; plan: PlanDocument };

    if (!email || !plan) {
      return NextResponse.json(
        { success: false, error: "Email and plan are required" },
        { status: 400 }
      );
    }

    // Get or create user
    let user = await getUserByEmailV2(email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Ensure user is V2 schema
    if (!isUserDocumentV2(user)) {
      // Convert to V2 (should not happen with fresh table)
      const v2User: UserDocumentV2 = {
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        updatedAt: new Date().toISOString(),
        settings: DEFAULT_USER_SETTINGS,
        plans: [],
        activePlanId: null,
        globalTotalPoints: 0,
        globalCurrentStreak: 0,
        globalLongestStreak: 0,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
      await saveUserV2(v2User);
      user = v2User;
    }

    // Extract tasks from plan to store separately (avoid 400KB limit)
    const dailyTasks = plan.dailyTasks || [];
    const planWithoutTasks: PlanDocument = {
      ...plan,
      totalTasks: dailyTasks.length, // Store count before clearing array
      dailyTasks: [], // Store empty array in user document
    };

    // Save tasks to separate table first
    if (dailyTasks.length > 0) {
      await savePlanTasks(plan.planId, dailyTasks as EnhancedDailyTask[]);
    }

    // Add the plan (without tasks) to user document
    const result = await addPlanToUser(email, planWithoutTasks);

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
      activePlanId: plan.planId,
    });
  } catch (error) {
    console.error("Error creating plan:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create plan" },
      { status: 500 }
    );
  }
}
