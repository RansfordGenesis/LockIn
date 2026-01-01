import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, updateUserProgress } from "@/lib/dynamodb";

// GET - Retrieve user progress state by email
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

    // Return progress state from user document
    return NextResponse.json({
      success: true,
      state: {
        email: user.email,
        completedTasks: user.completedTasks || {},
        totalPoints: user.totalPoints || 0,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        lastCheckIn: user.lastCheckIn || null,
        dailyCheckIns: user.dailyCheckIns || {},
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
    const { email, completedTasks, totalPoints, currentStreak, longestStreak, lastCheckIn, dailyCheckIns } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Update progress fields in user document
    await updateUserProgress(email.toLowerCase().trim(), {
      completedTasks: completedTasks || {},
      totalPoints: totalPoints || 0,
      currentStreak: currentStreak || 0,
      longestStreak: longestStreak || 0,
      lastCheckIn: lastCheckIn || null,
      dailyCheckIns: dailyCheckIns || {},
    });

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
