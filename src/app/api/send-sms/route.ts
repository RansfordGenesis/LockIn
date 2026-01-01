import { NextRequest, NextResponse } from "next/server";

// Arkesel SMS API
const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY;
const ARKESEL_SENDER_ID = process.env.ARKESEL_SENDER_ID || "LockIn";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing required fields: to and message" },
        { status: 400 }
      );
    }

    if (!ARKESEL_API_KEY) {
      return NextResponse.json(
        { error: "Arkesel API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": ARKESEL_API_KEY,
      },
      body: JSON.stringify({
        sender: ARKESEL_SENDER_ID,
        recipients: [to],
        message: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to send SMS" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error sending SMS:", error);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}

// Utility function to send daily reminder
export async function sendDailyReminder(phoneNumber: string, taskDescription: string) {
  const message = `🎯 LockIn Daily Task\n\nToday's focus: ${taskDescription}\n\nConsistency > Intensity. You've got this!`;
  
  return fetch("/api/send-sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: phoneNumber, message }),
  });
}
