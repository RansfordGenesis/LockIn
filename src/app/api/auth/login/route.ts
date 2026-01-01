import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/dynamodb";
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

    // Get user by email
    const user = await getUserByEmail(email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "No account found with this email.",
      }, { status: 401 });
    }

    // Verify phone number matches (phone acts as password)
    const normalizedInputPhone = formatPhone(phone);
    const normalizedStoredPhone = formatPhone(user.phoneNumber || "");
    
    if (normalizedInputPhone !== normalizedStoredPhone) {
      return NextResponse.json({
        success: false,
        error: "Invalid phone number. Please check and try again.",
      }, { status: 401 });
    }

    // Check if user has a plan
    if (!user.dailyTasks || user.dailyTasks.length === 0) {
      return NextResponse.json({
        success: true,
        needsPlan: true,
        user: {
          email: user.email,
          name: user.name,
        }
      });
    }

    // Return the user document (contains everything: plan, tasks, state)
    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      },
      plan: {
        planId: user.planId,
        planTitle: user.planTitle,
        planDescription: user.planDescription,
        planCategory: user.planCategory,
        scheduleType: user.scheduleType,
        timeCommitment: user.timeCommitment,
        includeLeetCode: user.includeLeetCode,
        totalDays: user.totalDays,
        dailyTasks: user.dailyTasks,
        monthlyThemes: user.monthlyThemes,
      },
      userState: {
        completedTasks: user.completedTasks || {},
        totalPoints: user.totalPoints || 0,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        lastCheckIn: user.lastCheckIn || null,
        dailyCheckIns: user.dailyCheckIns || {},
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
