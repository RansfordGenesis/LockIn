import { NextRequest, NextResponse } from "next/server";
import { checkEmailExists } from "@/lib/dynamodb";

// Check if email already exists
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

    const exists = await checkEmailExists(email);

    return NextResponse.json({
      success: true,
      exists,
      message: exists 
        ? "An account with this email already exists. Please login instead." 
        : "Email is available",
    });
  } catch (error) {
    console.error("Error checking email:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check email" },
      { status: 500 }
    );
  }
}
