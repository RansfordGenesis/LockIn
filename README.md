# LockIn - AI Planning Architect

<div align="center">
  <h3>🎯 12-Month Sustainable Goal Achievement Planning</h3>
  <p>Transform ambitious goals into actionable, sustainable plans for 2026 powered by AI</p>
</div>

---

## ✨ Features

### 🎯 Daily-First Approach
- **Focus on Today** - Main view is your daily tasks with real 2026 calendar dates
- **Permanent Points** - Complete a task, earn points forever (even if unchecked later)
- **Streak Tracking** - Maintain consistency with visual streak counters

### 🧙 Enhanced Goal Wizard
- **Category Selection** - Choose from Backend, Frontend, Full-Stack, ML/AI, DevOps, Mobile, Data, DSA, or Custom
- **AI-Driven Follow-Ups** - Smart questions based on your category (language → framework → databases)
- **Multi-Select Options** - Pick skills, tools, and technologies you want to learn
- **Preset Time Commitments** - Choose from 30min to 3+ hours daily, or weekends only

### 📅 2026 Calendar System
- **Real Dates** - Tasks mapped to actual Monday-Friday or full-week schedules
- **Recovery Weeks** - Built-in light weeks every 6-8 weeks
- **Flex Days** - 2 flex days per month for catching up or exploring
- **52 Weeks** - Full year coverage from January 5 to December 31, 2026

### 📱 Notification System
- **Email Reminders** - Daily motivation and weekly summaries via Resend
- **SMS Check-ins** - Arkesel SMS if you haven't completed tasks by evening
- **Streak Warnings** - Alerts when your streak is at risk

### Plan Views
- **📊 Quarterly View** - High-level roadmap with Q1 (Foundation) → Q4 (Mastery)
- **📅 Monthly View** - Themes, topics, and milestones
- **📆 Weekly View** - Structured weekly patterns
- **✅ Daily View** - Main focus with expandable task details

### 💾 AWS DynamoDB Storage
- **User Accounts** - Store email, phone, and preferences
- **Plan Persistence** - Your full 12-month plan saved to the cloud
- **Progress Tracking** - Daily check-ins and completion status
- **Notification Logs** - Track all sent reminders

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- AWS account with Bedrock access (for AI features)
- (Optional) Resend, Arkesel for notification features

### Installation

1. Navigate to the project:
```bash
cd lockin-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:
```env
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
RESEND_API_KEY=your_resend_api_key_here
ARKESEL_API_KEY=your_arkesel_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

---

## 🎨 Design System

### Colors
- **Background**: `#0a0a0c`
- **Card**: `#121214`
- **Primary (Teal)**: `#14B8A6`
- **Accent (Cyan)**: `#06B6D4`

### Typography
- **Font**: DM Sans, Geist Mono

### Effects
- Glass morphism
- Teal glow effects
- Subtle grid patterns
- Smooth micro-interactions

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate-plan/     # AWS Bedrock AI plan generation
│   │   ├── send-email/        # Resend email integration
│   │   └── send-sms/          # Arkesel SMS integration
│   ├── globals.css            # Global styles & design system
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main app entry
├── components/
│   ├── dashboard/
│   │   └── DashboardView.tsx  # Progress tracking dashboard
│   ├── plan/
│   │   ├── CollapsibleSection.tsx
│   │   ├── DailyView.tsx
│   │   ├── MonthlyView.tsx
│   │   ├── PlanDisplay.tsx
│   │   ├── QuarterlyView.tsx
│   │   └── WeeklyView.tsx
│   ├── ui/
│   │   └── index.tsx          # Reusable UI components
│   └── wizard/
│       └── GoalWizard.tsx     # Multi-step goal input
├── lib/
│   └── utils.ts               # Utility functions
├── store/
│   └── useAppStore.ts         # Zustand state management
└── types/
    └── plan.ts                # TypeScript types
```

---

## 🔧 API Endpoints

### POST `/api/generate-plan`
Generate a 12-month plan using AWS Bedrock (Claude).

**Request Body:**
```json
{
  "goal": "Become proficient in ML",
  "experience": "beginner",
  "stack": "Python, TensorFlow",
  "timeAvailable": "2 hours daily",
  "constraints": "Full-time job"
}
```

### POST `/api/send-email`
Send plan summary via email using Resend.

### POST `/api/send-sms`
Send daily reminders via SMS using Arkesel.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **AI**: AWS Bedrock (Claude)
- **Email**: Resend
- **SMS**: Arkesel

---

## 📝 Philosophy

> Consistency matters more than intensity.

LockIn is built on the principle that sustainable progress beats burnout. The app:
- Sets realistic expectations (80% daily target, not 100%)
- Builds in recovery periods
- Provides failure recovery protocols without guilt
- Uses "pause and resume" mindset, not "failed"

---

## 🚧 Roadmap

- [ ] User authentication
- [ ] Cloud sync with AWS
- [ ] Mobile app (React Native)
- [ ] Calendar integrations
- [ ] Spaced repetition reminders
- [ ] Community features
- [ ] AI-powered progress analysis

---

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

<div align="center">
  <p>Built with 💚 for sustainable goal achievement</p>
</div>
