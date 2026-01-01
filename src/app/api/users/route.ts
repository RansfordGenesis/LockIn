import { NextRequest, NextResponse } from "next/server";
import { checkEmailExists, saveUser, getUserByEmail } from "@/lib/dynamodb";
import { formatPhone, validateEmail, validatePhone } from "@/lib/validation";
import type { UserDocument, DailyTask } from "@/lib/dynamodb";

// POST - Create a new user with their complete plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      phoneNumber, 
      name,
      // Plan data from generate-enhanced-plan
      planId,
      planTitle,
      planDescription,
      planCategory,
      planStartDate,
      planEndDate,
      scheduleType,
      timeCommitment,
      includeLeetCode,
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
        { success: false, error: "An account with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    // Create complete user document with plan data
    const userDocument: UserDocument = {
      email: normalizedEmail,
      name: name || "",
      phoneNumber: normalizedPhone,
      createdAt: new Date().toISOString(),
      // Plan info
      scheduleType: scheduleType || "weekdays",
      timeCommitment: timeCommitment || "1hr-daily",
      includeLeetCode: includeLeetCode || false,
      planId: planId || "",
      planTitle: planTitle || "",
      planDescription: planDescription || "",
      planCategory: planCategory || "",
      planStartDate: planStartDate || new Date().toISOString().split('T')[0],
      planEndDate: planEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalDays: totalDays || 260,
      // All daily tasks (260 or 365 unique tasks)
      dailyTasks: (dailyTasks || []) as DailyTask[],
      monthlyThemes: monthlyThemes || [],
      // Progress tracking (starts empty)
      completedTasks: {},
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastCheckIn: null,
      dailyCheckIns: {},
    };

    // Save to DynamoDB (email is the primary key)
    await saveUser(userDocument);

    return NextResponse.json({
      success: true,
      user: {
        email: userDocument.email,
        name: userDocument.name,
        planTitle: userDocument.planTitle,
        totalDays: userDocument.totalDays,
        totalTasks: userDocument.dailyTasks.length,
      },
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

    const user = await getUserByEmail(email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

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
