import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.warn("Resend API key not configured - skipping email");
      return NextResponse.json({ success: true, skipped: true, message: "Email service not configured" });
    }

    const body = await request.json();
    const { to, subject, planSummary, userName } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "LockIn <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0c; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #14B8A6; font-size: 28px; margin: 0;">LockIn</h1>
                <p style="color: #a3a3a3; font-size: 14px; margin-top: 8px;">AI Planning Architect</p>
              </div>
              
              <div style="background: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(6, 182, 212, 0.05)); border: 1px solid rgba(20, 184, 166, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #fafafa; font-size: 20px; margin: 0 0 16px 0;">
                  Hey${userName ? ` ${userName}` : ""},
                </h2>
                <p style="color: #a3a3a3; font-size: 16px; line-height: 1.6; margin: 0;">
                  Your personalized 12-month plan has been created! Here's your journey ahead:
                </p>
              </div>

              <div style="background: rgba(18, 18, 20, 0.8); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #14B8A6; font-size: 16px; margin: 0 0 16px 0;">📋 Plan Summary</h3>
                <div style="color: #e5e5e5; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${planSummary || "Your plan is ready to view in the app."}</div>
              </div>

              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}" 
                   style="display: inline-block; background: linear-gradient(135deg, #14B8A6, #06B6D4); color: #0a0a0c; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Your Plan
                </a>
              </div>

              <div style="border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 24px; text-align: center;">
                <p style="color: #525252; font-size: 12px; margin: 0;">
                  Consistency matters more than intensity. You've got this.
                </p>
                <p style="color: #404040; font-size: 11px; margin-top: 16px;">
                  © ${new Date().getFullYear()} LockIn. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
