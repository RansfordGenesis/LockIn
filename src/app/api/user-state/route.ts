import { NextRequest, NextResponse } from "next/server";
import {
  getUserByEmailV2,
  isUserDocumentV2,
  updateUserProgress,
  updatePlanProgress,
  getActivePlan,
} from "@/lib/dynamodb";

// GET - Retrieve user progress state by email (and optionally planId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const planId = searchParams.get("planId");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await getUserByEmailV2(email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Handle V2 schema (multi-plan)
    if (isUserDocumentV2(user)) {
      // Get specific plan or active plan
      const targetPlanId = planId || user.activePlanId;
      const plan = user.plans.find((p) => p.planId === targetPlanId);

      if (!plan) {
        return NextResponse.json(
          { success: false, error: "Plan not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        state: {
          email: user.email,
          planId: plan.planId,
          completedTasks: plan.completedTasks || {},
          totalPoints: plan.earnedPoints || 0,
          currentStreak: plan.currentStreak || 0,
          longestStreak: plan.longestStreak || 0,
          lastCheckIn: plan.lastCheckIn || null,
          dailyCheckIns: plan.dailyCheckIns || {},
        },
        globalStats: {
          totalPoints: user.globalTotalPoints || 0,
          currentStreak: user.globalCurrentStreak || 0,
          longestStreak: user.globalLongestStreak || 0,
        },
      });
    }

    // Handle V1 schema (backward compatibility)
    return NextResponse.json({
      success: true,
      state: {
        email: user.email,
        planId: user.planId,
        completedTasks: user.completedTasks || {},
        totalPoints: user.totalPoints || 0,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        lastCheckIn: user.lastCheckIn || null,
        dailyCheckIns: user.dailyCheckIns || {},
      },
      globalStats: {
        totalPoints: user.totalPoints || 0,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
      },
    });
  } catch (error) {
    console.error("Error getting user state:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get user state" },
      { status: 500 }
    );
  }
}

// POST - Update user progress state
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      planId,
      completedTasks,
      totalPoints,
      currentStreak,
      longestStreak,
      lastCheckIn,
      dailyCheckIns,
    } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user is V2 and has planId
    const user = await getUserByEmailV2(normalizedEmail);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (isUserDocumentV2(user) && planId) {
      // V2 schema - update specific plan progress
      const result = await updatePlanProgress(normalizedEmail, planId, {
        completedTasks: completedTasks || {},
        earnedPoints: totalPoints || 0,
        currentStreak: currentStreak || 0,
        longestStreak: longestStreak || 0,
        lastCheckIn: lastCheckIn || null,
        dailyCheckIns: dailyCheckIns || {},
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
    } else {
      // V1 schema - use legacy update
      await updateUserProgress(normalizedEmail, {
        completedTasks: completedTasks || {},
        totalPoints: totalPoints || 0,
        currentStreak: currentStreak || 0,
        longestStreak: longestStreak || 0,
        lastCheckIn: lastCheckIn || null,
        dailyCheckIns: dailyCheckIns || {},
      });
    }

    return NextResponse.json({
      success: true,
      message: "User state saved",
    });
  } catch (error) {
    console.error("Error saving user state:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save user state" },
      { status: 500 }
    );
  }
}
