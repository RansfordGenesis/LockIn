import { NextRequest, NextResponse } from "next/server";
import {
  getUserByEmailV2,
  isUserDocumentV2,
  getActivePlan,
  getUserPlanSummaries,
} from "@/lib/dynamodb";
import { formatPhone } from "@/lib/validation";

// Auth - verify user by email + phone (phone acts as password)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    // Require email and phone
    if (!email || !phone) {
      return NextResponse.json(
        { success: false, error: "Email and phone number are required" },
        { status: 400 }
      );
    }

    // Get user by email (supports both V1 and V2 schema)
    const user = await getUserByEmailV2(email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "No account found with this email.",
        },
        { status: 401 }
      );
    }

    // Verify phone number matches (phone acts as password)
    const normalizedInputPhone = formatPhone(phone);
    const normalizedStoredPhone = formatPhone(user.phoneNumber || "");

    if (normalizedInputPhone !== normalizedStoredPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid phone number. Please check and try again.",
        },
        { status: 401 }
      );
    }

    // Handle V2 schema (multi-plan)
    if (isUserDocumentV2(user)) {
      const planSummaries = await getUserPlanSummaries(email);
      const activePlan = await getActivePlan(email);

      // Check if user has any plans
      if (!activePlan || user.plans.length === 0) {
        return NextResponse.json({
          success: true,
          needsPlan: true,
          user: {
            email: user.email,
            name: user.name,
          },
          plans: [],
        });
      }

      // Return multi-plan response
      return NextResponse.json({
        success: true,
        user: {
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
        },
        plans: planSummaries,
        activePlanId: user.activePlanId,
        plan: {
          planId: activePlan.planId,
          planTitle: activePlan.planTitle,
          planDescription: activePlan.planDescription,
          planCategory: activePlan.planCategory,
          planIcon: activePlan.planIcon,
          scheduleType: activePlan.scheduleType,
          timeCommitment: activePlan.timeCommitment,
          includeLeetCode: activePlan.includeLeetCode,
          totalDays: activePlan.totalDays,
          totalTasks: activePlan.totalTasks || activePlan.dailyTasks?.length || 0,
          dailyTasks: activePlan.dailyTasks,
          monthlyThemes: activePlan.monthlyThemes,
          startDate: activePlan.startDate,
          endDate: activePlan.endDate,
        },
        userState: {
          completedTasks: activePlan.completedTasks || {},
          totalPoints: activePlan.earnedPoints || 0,
          currentStreak: activePlan.currentStreak || 0,
          longestStreak: activePlan.longestStreak || 0,
          lastCheckIn: activePlan.lastCheckIn || null,
          dailyCheckIns: activePlan.dailyCheckIns || {},
        },
        globalStats: {
          totalPoints: user.globalTotalPoints || 0,
          currentStreak: user.globalCurrentStreak || 0,
          longestStreak: user.globalLongestStreak || 0,
        },
      });
    }

    // Handle V1 schema (backward compatibility - single plan)
    // Check if user has a plan
    if (!user.dailyTasks || user.dailyTasks.length === 0) {
      return NextResponse.json({
        success: true,
        needsPlan: true,
        user: {
          email: user.email,
          name: user.name,
        },
        plans: [],
      });
    }

    // Return the user document (contains everything: plan, tasks, state)
    // Format as multi-plan response for frontend consistency
    const planSummary = {
      planId: user.planId,
      planTitle: user.planTitle,
      planDescription: user.planDescription,
      planCategory: user.planCategory,
      planIcon: "💻",
      totalDays: user.totalDays,
      totalTasks: user.dailyTasks?.length || 0,
      completedTasksCount: Object.keys(user.completedTasks || {}).length,
      totalPoints: user.totalPoints || 0,
      earnedPoints: user.totalPoints || 0,
      currentStreak: user.currentStreak || 0,
      startDate: user.planStartDate,
      endDate: user.planEndDate,
      isActive: true,
      createdAt: user.createdAt,
      progressPercent: user.dailyTasks?.length
        ? Math.round(
            (Object.keys(user.completedTasks || {}).length /
              user.dailyTasks.length) *
              100
          )
        : 0,
    };

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      },
      plans: [planSummary],
      activePlanId: user.planId,
      plan: {
        planId: user.planId,
        planTitle: user.planTitle,
        planDescription: user.planDescription,
        planCategory: user.planCategory,
        planIcon: "💻",
        scheduleType: user.scheduleType,
        timeCommitment: user.timeCommitment,
        includeLeetCode: user.includeLeetCode,
        totalDays: user.totalDays,
        totalTasks: user.dailyTasks?.length || 0,
        dailyTasks: user.dailyTasks,
        monthlyThemes: user.monthlyThemes,
        startDate: user.planStartDate,
        endDate: user.planEndDate,
      },
      userState: {
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
    console.error("Error during login:", error);
    return NextResponse.json(
      { success: false, error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
