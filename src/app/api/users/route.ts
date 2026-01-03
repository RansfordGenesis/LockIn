import { NextRequest, NextResponse } from "next/server";
import {
  checkEmailExists,
  saveUserV2,
  getUserByEmailV2,
  isUserDocumentV2,
  CURRENT_SCHEMA_VERSION,
} from "@/lib/dynamodb";
import { formatPhone, validateEmail, validatePhone } from "@/lib/validation";
import type {
  UserDocumentV2,
  PlanDocument,
  DEFAULT_USER_SETTINGS,
} from "@/types/multiplan";

// POST - Create a new user with or without a plan (V2 schema)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      phoneNumber,
      name,
      // Flag to create user without plan (for new user registration before wizard)
      createWithoutPlan,
      // Plan data from generate-enhanced-plan (optional if createWithoutPlan is true)
      planId,
      planTitle,
      planDescription,
      planCategory,
      planIcon,
      planStartDate,
      planEndDate,
      scheduleType,
      timeCommitment,
      includeLeetCode,
      leetCodeLanguage,
      totalDays,
      dailyTasks,
      monthlyThemes,
    } = body;

    if (!email || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Email and phone number are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json(
        { success: false, error: emailError },
        { status: 400 }
      );
    }

    // Validate phone format
    const phoneError = validatePhone(phoneNumber);
    if (phoneError) {
      return NextResponse.json(
        { success: false, error: phoneError },
        { status: 400 }
      );
    }

    // Normalize email and phone
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = formatPhone(phoneNumber);

    // Check if email already exists
    const exists = await checkEmailExists(normalizedEmail);
    if (exists) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email already exists. Please log in instead.",
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // If creating user without plan (new signup flow)
    if (createWithoutPlan) {
      const userDocument: UserDocumentV2 = {
        email: normalizedEmail,
        name: name || "",
        phoneNumber: normalizedPhone,
        createdAt: now,
        updatedAt: now,
        settings: {
          reminderTime: "09:00",
          timezone: "Africa/Accra",
          emailNotifications: true,
          smsNotifications: true,
          theme: "dark",
        },
        plans: [],
        activePlanId: null,
        globalTotalPoints: 0,
        globalCurrentStreak: 0,
        globalLongestStreak: 0,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };

      // Save to DynamoDB
      await saveUserV2(userDocument);

      return NextResponse.json({
        success: true,
        user: {
          email: userDocument.email,
          name: userDocument.name,
          phoneNumber: userDocument.phoneNumber,
          createdAt: userDocument.createdAt,
        },
        plans: [],
        activePlanId: null,
        needsPlan: true,
      });
    }

    // Create with plan (existing flow)
    const startDate = planStartDate || now.split("T")[0];
    const endDate =
      planEndDate ||
      new Date(Date.now() + (totalDays || 365) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    // Create the first plan document
    const firstPlan: PlanDocument = {
      planId: planId || `plan_${Date.now()}`,
      planTitle: planTitle || "My Learning Plan",
      planDescription: planDescription || "",
      planCategory: planCategory || "custom",
      planIcon: planIcon || "✨",
      startDate,
      endDate,
      totalDays: totalDays || 365,
      scheduleType: scheduleType || "weekdays",
      timeCommitment: timeCommitment || "1hr-daily",
      experienceLevel: "intermediate",
      includeLeetCode: includeLeetCode || false,
      leetCodeLanguage: leetCodeLanguage,
      dailyTasks: dailyTasks || [],
      monthlyThemes: monthlyThemes || [],
      completedTasks: {},
      totalPoints: 0,
      earnedPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastCheckIn: null,
      dailyCheckIns: {},
      quizAttempts: [],
      leetCodeSubmissions: [],
      createdAt: now,
      updatedAt: now,
    };

    // Create V2 user document with the plan
    const userDocument: UserDocumentV2 = {
      email: normalizedEmail,
      name: name || "",
      phoneNumber: normalizedPhone,
      createdAt: now,
      updatedAt: now,
      settings: {
        reminderTime: "09:00",
        timezone: "Africa/Accra",
        emailNotifications: true,
        smsNotifications: true,
        theme: "dark",
      },
      plans: [firstPlan],
      activePlanId: firstPlan.planId,
      globalTotalPoints: 0,
      globalCurrentStreak: 0,
      globalLongestStreak: 0,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    // Save to DynamoDB
    await saveUserV2(userDocument);

    return NextResponse.json({
      success: true,
      user: {
        email: userDocument.email,
        name: userDocument.name,
        planTitle: firstPlan.planTitle,
        totalDays: firstPlan.totalDays,
        totalTasks: firstPlan.dailyTasks.length,
      },
      plans: [
        {
          planId: firstPlan.planId,
          planTitle: firstPlan.planTitle,
          planDescription: firstPlan.planDescription,
          planCategory: firstPlan.planCategory,
          planIcon: firstPlan.planIcon,
          totalDays: firstPlan.totalDays,
          totalTasks: firstPlan.dailyTasks.length,
          completedTasksCount: 0,
          totalPoints: 0,
          earnedPoints: 0,
          currentStreak: 0,
          startDate: firstPlan.startDate,
          endDate: firstPlan.endDate,
          isActive: true,
          createdAt: firstPlan.createdAt,
          progressPercent: 0,
        },
      ],
      activePlanId: firstPlan.planId,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// GET - Get user by email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

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

    // Handle V2 schema
    if (isUserDocumentV2(user)) {
      const activePlan = user.plans.find((p) => p.planId === user.activePlanId);

      return NextResponse.json({
        success: true,
        user: {
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
          planTitle: activePlan?.planTitle || "",
          planCategory: activePlan?.planCategory || "",
          totalDays: activePlan?.totalDays || 0,
          totalTasks: activePlan?.dailyTasks?.length || 0,
          totalPoints: user.globalTotalPoints,
          currentStreak: user.globalCurrentStreak,
          longestStreak: user.globalLongestStreak,
        },
        plans: user.plans.map((plan) => ({
          planId: plan.planId,
          planTitle: plan.planTitle,
          planDescription: plan.planDescription,
          planCategory: plan.planCategory,
          planIcon: plan.planIcon,
          totalDays: plan.totalDays,
          totalTasks: plan.dailyTasks?.length || 0,
          completedTasksCount: Object.keys(plan.completedTasks || {}).length,
          totalPoints: plan.totalPoints,
          earnedPoints: plan.earnedPoints || 0,
          currentStreak: plan.currentStreak || 0,
          startDate: plan.startDate,
          endDate: plan.endDate,
          isActive: plan.planId === user.activePlanId,
          createdAt: plan.createdAt,
          progressPercent: plan.dailyTasks?.length
            ? Math.round(
                (Object.keys(plan.completedTasks || {}).length /
                  plan.dailyTasks.length) *
                  100
              )
            : 0,
        })),
        activePlanId: user.activePlanId,
      });
    }

    // Handle V1 schema (backward compatibility)
    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        planTitle: user.planTitle,
        planCategory: user.planCategory,
        totalDays: user.totalDays,
        totalTasks: user.dailyTasks?.length || 0,
        totalPoints: user.totalPoints,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
