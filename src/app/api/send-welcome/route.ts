import { NextRequest, NextResponse } from "next/server";

// Format phone number to international format (+233...)
function formatPhone(phone: string): string {
  // Remove all spaces, dashes, parentheses, and dots
  const clean = phone.trim().replaceAll(/[\s\-().]/g, '');

  // Already in international format with +233
  if (clean.startsWith('+233')) {
    return clean;
  }

  // Has 233 prefix but missing +
  if (clean.startsWith('233')) {
    return '+' + clean;
  }

  // Local format starting with 0
  if (clean.startsWith('0')) {
    return '+233' + clean.slice(1);
  }

  // Plain number (assume Ghana)
  return '+233' + clean;
}

// Arkesel SMS API
async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  const apiKey = process.env.ARKESEL_API_KEY;
  const senderId = process.env.ARKESEL_SENDER_ID || "LockIn";
  
  if (!apiKey) {
    console.error("Arkesel API key not configured");
    return false;
  }

  try {
    const formattedPhone = formatPhone(phoneNumber);
    
    // Use the GET-based API as shown in user's example
    const params = new URLSearchParams({
      action: 'send-sms',
      api_key: apiKey,
      to: formattedPhone,
      from: senderId,
      sms: message
    });

    const response = await fetch(`https://sms.arkesel.com/sms/api?${params.toString()}`, {
      method: 'GET',
    });

    const data = await response.json();
    
    if (data.code === 'ok' || data.status === 'success') {
      console.log('SMS sent successfully to', formattedPhone);
      return true;
    } else {
      console.error('Arkesel SMS API error:', data.message || 'Unknown error');
      return false;
    }
  } catch {
    // CORS or network error - SMS may still be sent
    console.log('SMS likely sent (network/CORS issue):', formatPhone(phoneNumber));
    return true; // Assume success as per user's example
  }
}

// Resend Email API
async function sendEmail(email: string, subject: string, htmlContent: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error("Resend API key not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LockIn <notifications@yourdomain.com>",
        to: email,
        subject,
        html: htmlContent,
      }),
    });

    const data = await response.json();
    return !!data.id;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, email, planTitle, userName, startDate } = body;

    const results = { sms: false, email: false };
    const name = userName || "there";
    
    // Format the start date for display
    const formatStartDate = (dateStr: string): string => {
      if (!dateStr) return "soon";
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const formattedDate = formatStartDate(startDate);

    // Send welcome SMS
    if (phoneNumber) {
      const firstName = userName ? userName.split(" ")[0] : "";
      const smsMessage = `🚀 ${firstName ? firstName + ", " : ""}Your LockIn plan is ready! "${planTitle}" starts ${formattedDate}. Let's go! 💪 - LockIn`;

      results.sms = await sendSMS(phoneNumber, smsMessage);
    }

    // Send welcome email
    if (email) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0c; color: #ffffff; padding: 40px; }
    .container { max-width: 600px; margin: 0 auto; background: #111113; border-radius: 16px; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 32px; font-weight: bold; }
    .logo span { color: #14b8a6; }
    h1 { color: #ffffff; margin-bottom: 10px; }
    .subtitle { color: #9ca3af; font-size: 18px; }
    .plan-title { background: linear-gradient(135deg, #14b8a6, #10b981); -webkit-background-clip: text; background-clip: text; color: transparent; font-size: 24px; font-weight: bold; margin: 20px 0; }
    .stats { display: flex; gap: 20px; margin: 30px 0; }
    .stat { flex: 1; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #14b8a6; }
    .stat-label { color: #9ca3af; font-size: 14px; }
    .cta { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #14b8a6, #10b981); color: #000; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; }
    .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Lock<span>In</span></div>
    </div>
    
    <h1>🎉 Your Plan is Ready!</h1>
    <p class="subtitle">Hey ${name}, your learning journey begins now.</p>
    
    <p class="plan-title">"${planTitle}"</p>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-value">12</div>
        <div class="stat-label">Months</div>
      </div>
      <div class="stat">
        <div class="stat-value">52</div>
        <div class="stat-label">Weeks</div>
      </div>
      <div class="stat">
        <div class="stat-value">260+</div>
        <div class="stat-label">Tasks</div>
      </div>
    </div>
    
    <p style="color: #9ca3af;">Your journey kicks off on <strong style="color: #fff;">${formattedDate}</strong>. We'll send you daily reminders to keep you on track.</p>
    
    <p style="color: #9ca3af;">Remember: Consistency beats intensity. Small daily progress compounds into massive results.</p>
    
    <div class="cta">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="btn">View Your Dashboard →</a>
    </div>
    
    <div class="footer">
      <p>Let's make 2026 your year! 💪</p>
      <p>— Team LockIn</p>
    </div>
  </div>
</body>
</html>`;

      results.email = await sendEmail(email, "🚀 Your LockIn Plan is Ready!", emailHtml);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error sending welcome message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send welcome message" },
      { status: 500 }
    );
  }
}
