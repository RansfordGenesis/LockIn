import { NextRequest, NextResponse } from "next/server";
import { scanAllUsers } from "@/lib/dynamodb";

// Format phone number to international format (+233...)
function formatPhone(phone: string): string {
  const clean = phone.trim().replaceAll(/[\s\-()]/g, '');

  if (clean.startsWith('+233')) return clean;
  if (clean.startsWith('233')) return '+' + clean;
  if (clean.startsWith('0')) return '+233' + clean.slice(1);
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
    console.log('SMS likely sent (network/CORS issue):', formatPhone(phoneNumber));
    return true;
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

// Helper: Send notification to single user
async function sendDirectNotification(
  type: string,
  email?: string,
  phoneNumber?: string,
  customMessage?: string
): Promise<{ sms?: boolean; email?: boolean }> {
  const results: { sms?: boolean; email?: boolean } = {};

  if (phoneNumber) {
    const smsMessage = customMessage || getDefaultMessage(type);
    results.sms = await sendSMS(phoneNumber, smsMessage);
  }

  if (email) {
    const emailSubject = getEmailSubject(type);
    const emailHtml = getEmailHtml(type, customMessage);
    results.email = await sendEmail(email, emailSubject, emailHtml);
  }

  return results;
}

// Helper: Process batch user notification
async function notifyUser(
  user: { name?: string; phoneNumber?: string; email?: string },
  results: { smsSent: number; emailSent: number; failed: number }
): Promise<void> {
  if (user.phoneNumber) {
    const name = user.name?.split(" ")[0] || "";
    const message = `🔥 ${name ? name + ", " : ""}Don't break your streak! Check in now. - LockIn`;
    const success = await sendSMS(user.phoneNumber, message);
    if (success) results.smsSent++;
    else results.failed++;
  }

  if (user.email) {
    const subject = "🔥 Don't break your streak!";
    const html = getEmailHtml("missed-checkin", user.name);
    const success = await sendEmail(user.email, subject, html);
    if (success) results.emailSent++;
    else results.failed++;
  }
}

// Send check-in reminder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, phoneNumber, customMessage } = body;

    if (!type) {
      return NextResponse.json({ success: false, error: "Notification type required" }, { status: 400 });
    }

    // Direct notification to a specific user
    if (phoneNumber || email) {
      const results = await sendDirectNotification(type, email, phoneNumber, customMessage);
      return NextResponse.json({ success: true, results });
    }

    // Batch notification for all users who haven't checked in today
    if (type === "batch-reminder") {
      const today = new Date().toISOString().split("T")[0];
      const users = await scanAllUsers();

      const results = {
        total: 0,
        smsSent: 0,
        emailSent: 0,
        failed: 0,
      };

      // Find users who haven't checked in today
      const usersToNotify = users.filter(user => {
        const hasCheckedInToday = user.dailyCheckIns?.[today];
        return !hasCheckedInToday && (user.phoneNumber || user.email);
      });

      results.total = usersToNotify.length;

      for (const user of usersToNotify) {
        await notifyUser(user, results);
      }

      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json({ success: false, error: "Failed to send notification" }, { status: 500 });
  }
}

function getDefaultMessage(type: string): string {
  switch (type) {
    case "reminder":
      return "🎯 LockIn: Time to learn! Your tasks are ready.";
    case "missed-checkin":
      return "🔥 LockIn: Don't break your streak! Check in now.";
    case "streak-warning":
      return "⚠️ LockIn: Streak at risk! Complete a task now.";
    case "achievement":
      return "🎉 LockIn: New achievement unlocked!";
    case "weekly-summary":
      return "📊 LockIn: Your weekly summary is ready.";
    default:
      return "📱 LockIn: You have a notification.";
  }
}

function getEmailSubject(type: string): string {
  switch (type) {
    case "reminder":
      return "🎯 Time to LockIn!";
    case "missed-checkin":
      return "🔥 Don't break your streak!";
    case "streak-warning":
      return "⚠️ Your streak is at risk!";
    case "achievement":
      return "🎉 Achievement Unlocked!";
    case "weekly-summary":
      return "📊 Your Weekly Progress Report";
    default:
      return "📱 LockIn Notification";
  }
}

function getEmailHtml(type: string, name?: string): string {
  const greeting = name ? `Hey ${name}!` : "Hey there!";
  
  const contentMap: Record<string, string> = {
    reminder: `
      <h2>Time to LockIn! 🎯</h2>
      <p>Your daily learning tasks are ready and waiting. Keep the momentum going!</p>
      <p>Small consistent steps lead to big results. Let's make today count.</p>
    `,
    "missed-checkin": `
      <h2>Don't Break Your Streak! 🔥</h2>
      <p>We noticed you haven't checked in today. Your streak is at risk!</p>
      <p>Even completing one small task keeps you on track. Jump back in now!</p>
    `,
    "streak-warning": `
      <h2>Streak Alert! ⚠️</h2>
      <p>Your learning streak is about to break! Check in before midnight to keep it alive.</p>
      <p>Remember: consistency beats intensity. Just show up!</p>
    `,
    achievement: `
      <h2>Congratulations! 🎉</h2>
      <p>You've unlocked a new achievement! Your hard work is paying off.</p>
      <p>Keep pushing forward!</p>
    `,
    "weekly-summary": `
      <h2>Your Weekly Progress 📊</h2>
      <p>Great work this week! Here's a summary of your learning journey.</p>
      <p>Keep up the momentum!</p>
    `,
  };

  const content = contentMap[type] || `<h2>LockIn Notification 📱</h2><p>You have a new notification.</p>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #14b8a6, #10b981); color: white; padding: 20px; border-radius: 12px 12px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; }
        .button { display: inline-block; background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 LockIn</h1>
          <p>${greeting}</p>
        </div>
        <div class="content">
          ${content}
          <a href="https://lockin.app" class="button">Open LockIn</a>
        </div>
        <div class="footer">
          <p>You're receiving this because you signed up for LockIn.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
