import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailV2 } from "@/lib/dynamodb";

// Check if email already exists and return user info for Google auto-login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    const user = await getUserByEmailV2(email.toLowerCase().trim());
    const exists = !!user;

    if (exists && user) {
      return NextResponse.json({
        success: true,
        exists: true,
        user: {
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
        },
        message: "An account with this email already exists. Please login instead.",
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
      message: "Email is available",
    });
  } catch (error) {
    console.error("Error checking email:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check email" },
      { status: 500 }
    );
  }
}
