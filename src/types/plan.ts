// ==========================================
// USER & AUTHENTICATION
// ==========================================

export interface User {
  userId: string;
  email: string;
  phoneNumber: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  settings: UserSettings;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  completedDays: number;
}

export interface UserSettings {
  scheduleType: "weekdays" | "fullweek";
  timeCommitment: string;
  reminderTime: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

// ==========================================
// GOAL INPUT (Collected from Wizard)
// ==========================================

export interface GoalInput {
  category: string;
  categoryName?: string;
  primaryGoal: string;
  subGoals?: string[];
  selectedOptions: Record<string, string | string[]>;
  followUpAnswers?: Record<string, string | string[]>; // Legacy
  timeCommitment: string;
  experienceLevel: string;
  constraints: string[];
  customGoal?: string;
  scheduleType: "weekdays" | "fullweek";
  customCurriculum?: string; // User's own pasted curriculum
}

// Legacy support
export interface LegacyGoalInput {
  goal: string;
  experience: "beginner" | "intermediate" | "advanced";
  stack: string;
  timeAvailable: string;
  constraints: string;
}

// ==========================================
// PLAN STRUCTURE (AI Generated)
// ==========================================

export interface Plan {
  planId: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  scheduleType: "weekdays" | "fullweek";
  quarters: Quarter[];
  milestones: Milestone[];
  totalTasks: number;
  estimatedHours: number;
}

export interface Quarter {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  theme: string;
  description: string;
  months: Month[];
}

export interface Month {
  id: string;
  month: number;
  year: number;
  name: string;
  theme: string;
  description: string;
  weeks: Week[];
  flexDaysRemaining: number;
}

export interface Week {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  theme: string;
  isRecoveryWeek: boolean;
  days: DayPlan[];
}

export interface DayPlan {
  id: string;
  date: string;
  dayOfWeek: string;
  isWorkDay: boolean;
  isFlexDay: boolean;
  isRecoveryDay: boolean;
  tasks: Task[];
  estimatedMinutes: number;
}

export interface Task {
  taskId: string;
  dayId: string;
  title: string;
  description: string;
  type: "learn" | "practice" | "build" | "review" | "quiz";
  estimatedMinutes: number;
  points: number;
  resources?: Resource[];
  tags: string[];
  quizTopics?: string[]; // Topics for quiz generation
  quiz?: Quiz; // Generated quiz (populated on demand)
}

export interface Quiz {
  taskId: string;
  questions: QuizQuestion[];
  passScore: number; // e.g., 3 out of 5
  totalQuestions: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizAttempt {
  taskId: string;
  date: string;
  answers: number[];
  score: number;
  passed: boolean;
  attemptedAt: string;
}

export interface LeetCodeSubmission {
  taskId: string;
  date: string;
  problemSlug: string;
  problemTitle?: string;
  difficulty?: string;
  language: string;
  timeComplexity: string;
  spaceComplexity: string;
  isTimeCorrect: boolean;
  isSpaceCorrect: boolean;
  codeScore: number;
  passed: boolean;
  pointsEarned: number;
  submittedAt: string;
  // Note: We intentionally do NOT save the solution code to the database
  // to reduce storage and privacy concerns
}

export interface Resource {
  type: "video" | "article" | "exercise" | "project" | "documentation";
  title: string;
  url?: string;
  description?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  quarter: number;
  month: number;
  type: "checkpoint" | "project" | "certification" | "skill";
  taskIds: string[];
}

// ==========================================
// DAILY TASK TRACKING (Persisted in DynamoDB)
// ==========================================

export interface DailyTaskRecord {
  id: string;
  taskId: string;
  userId: string;
  planId: string;
  date: string;
  status: "pending" | "completed" | "skipped" | "partial";
  completedAt?: string;
  pointsEarned: number;
  notes?: string;
  timeSpent?: number;
}

// ==========================================
// USER PROGRESS
// ==========================================

export interface UserProgress {
  userId: string;
  planId: string;
  date: string;
  tasksCompleted: number;
  tasksTotal: number;
  pointsEarned: number;
  pointsTotal: number;
  minutesSpent: number;
  minutesPlanned: number;
  checkedIn: boolean;
  checkedInAt?: string;
  streak: number;
}

// Legacy progress structure
export interface LegacyUserProgress {
  currentDay: number;
  currentWeek: number;
  currentMonth: number;
  currentQuarter: number;
  completedTasks: string[];
  streakDays: number;
  totalPoints: number;
  weeklyProgress: number[];
  monthlyProgress: number[];
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export interface NotificationRecord {
  notificationId: string;
  userId: string;
  type: "reminder" | "missed-checkin" | "streak-warning" | "achievement" | "weekly-summary";
  channel: "email" | "sms" | "push";
  status: "pending" | "sent" | "failed";
  message: string;
  scheduledFor: string;
  sentAt?: string;
  error?: string;
}

// ==========================================
// STATS & ANALYTICS
// ==========================================

export interface WeeklyStats {
  weekNumber: number;
  startDate: string;
  endDate: string;
  tasksCompleted: number;
  tasksTotal: number;
  pointsEarned: number;
  minutesSpent: number;
  averageCompletion: number;
  streakMaintained: boolean;
}

export interface MonthlyStats {
  month: number;
  year: number;
  tasksCompleted: number;
  tasksTotal: number;
  pointsEarned: number;
  minutesSpent: number;
  flexDaysUsed: number;
  averageCompletion: number;
  milestonesReached: number;
}

// ==========================================
// VIEW STATE
// ==========================================

export type ViewType = "landing" | "wizard" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "dashboard" | "settings";

// ==========================================
// WIZARD STATE
// ==========================================

export interface WizardState {
  step: number;
  totalSteps: number;
  category: string | null;
  followUpAnswers: Record<string, string | string[]>;
  timeCommitment: string | null;
  experienceLevel: string | null;
  constraints: string[];
  scheduleType: "weekdays" | "fullweek" | null;
  email: string;
  phoneNumber: string;
  name: string;
  customGoal: string;
  isGeneratingFollowUp: boolean;
  aiFollowUpQuestions: AIFollowUpQuestion[];
}

export interface AIFollowUpQuestion {
  id: string;
  question: string;
  type: "single" | "multi";
  options: { value: string; label: string; description?: string }[];
  reason: string;
}

// ==========================================
// CALENDAR TYPES
// ==========================================

export interface CalendarDay {
  date: string;
  dayOfWeek: number;
  dayName: string;
  month: number;
  year: number;
  weekNumber: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isWorkDay: boolean;
  isFlexDay: boolean;
  isRecoveryDay: boolean;
  hasTask: boolean;
  taskStatus?: "pending" | "completed" | "partial" | "skipped";
  pointsEarned: number;
}

export interface CalendarWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: CalendarDay[];
  isRecoveryWeek: boolean;
  progress: number;
}

export interface CalendarMonth {
  month: number;
  year: number;
  name: string;
  weeks: CalendarWeek[];
  flexDaysRemaining: number;
  progress: number;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface GeneratePlanResponse {
  success: boolean;
  plan?: Plan;
  error?: string;
}

export interface GenerateFollowUpResponse {
  success: boolean;
  questions?: AIFollowUpQuestion[];
  error?: string;
}
