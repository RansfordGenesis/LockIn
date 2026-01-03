// ==========================================
// MULTI-PLAN SYSTEM TYPES
// ==========================================

// ==========================================
// PLAN CATEGORIES
// ==========================================

export type PlanCategory =
  | "software"
  | "hardware"
  | "language"
  | "music"
  | "fitness"
  | "business"
  | "creative"
  | "academic"
  | "professional"
  | "personal"
  | "custom";

export interface CategoryConfig {
  id: PlanCategory;
  name: string;
  icon: string;
  description: string;
  showLeetCode: boolean;
  sampleGoals: string[];
}

export const PLAN_CATEGORIES: CategoryConfig[] = [
  {
    id: "software",
    name: "Software Development",
    icon: "💻",
    description: "Programming, web dev, mobile apps, AI/ML",
    showLeetCode: true,
    sampleGoals: [
      "Master full-stack development",
      "Learn machine learning",
      "Build mobile apps",
      "Become a backend engineer",
    ],
  },
  {
    id: "hardware",
    name: "Hardware & Electronics",
    icon: "🔧",
    description: "Arduino, Raspberry Pi, IoT, circuits",
    showLeetCode: false,
    sampleGoals: [
      "Build a robot",
      "Create home automation",
      "Learn PCB design",
      "Master embedded systems",
    ],
  },
  {
    id: "language",
    name: "Language Learning",
    icon: "🌍",
    description: "Foreign languages, linguistics",
    showLeetCode: false,
    sampleGoals: [
      "Learn Spanish",
      "Pass JLPT N2",
      "Business French",
      "Conversational German",
    ],
  },
  {
    id: "music",
    name: "Music & Instruments",
    icon: "🎵",
    description: "Learn instruments, music theory, production",
    showLeetCode: false,
    sampleGoals: [
      "Learn guitar",
      "Master piano fundamentals",
      "Learn music production",
      "Master songwriting",
    ],
  },
  {
    id: "fitness",
    name: "Fitness & Health",
    icon: "💪",
    description: "Exercise, nutrition, wellness",
    showLeetCode: false,
    sampleGoals: [
      "Run a marathon",
      "Build muscle",
      "Lose weight healthily",
      "Develop a yoga practice",
    ],
  },
  {
    id: "business",
    name: "Business & Entrepreneurship",
    icon: "📈",
    description: "Startups, marketing, finance",
    showLeetCode: false,
    sampleGoals: [
      "Start a business",
      "Master digital marketing",
      "Improve financial literacy",
      "Develop leadership skills",
    ],
  },
  {
    id: "creative",
    name: "Creative Arts",
    icon: "🎨",
    description: "Drawing, design, photography, writing",
    showLeetCode: false,
    sampleGoals: [
      "Learn digital art",
      "Master UI/UX design",
      "Learn photography",
      "Improve creative writing",
    ],
  },
  {
    id: "academic",
    name: "Academic Studies",
    icon: "📚",
    description: "School subjects, test prep, certifications",
    showLeetCode: false,
    sampleGoals: [
      "Prepare for the GRE",
      "Master mathematics",
      "Learn physics",
      "Get AWS certified",
    ],
  },
  {
    id: "professional",
    name: "Professional Skills",
    icon: "💼",
    description: "Career development, soft skills",
    showLeetCode: false,
    sampleGoals: [
      "Master public speaking",
      "Learn project management",
      "Develop negotiation skills",
      "Improve time management",
    ],
  },
  {
    id: "personal",
    name: "Personal Development",
    icon: "🌱",
    description: "Habits, mindfulness, life skills",
    showLeetCode: false,
    sampleGoals: [
      "Build better habits",
      "Learn meditation",
      "Improve my sleep",
      "Read more books",
    ],
  },
  {
    id: "custom",
    name: "Custom Goal",
    icon: "✨",
    description: "Define your own learning path",
    showLeetCode: true, // Allow LeetCode for custom tech goals
    sampleGoals: [],
  },
];

// ==========================================
// TIMELINE CONFIGURATION
// ==========================================

export interface TimelineConfig {
  startDate: string;
  totalDays: number;
  scheduleType: "weekdays" | "fullweek" | "custom";
  daysPerWeek?: number; // For custom schedules (1-7)
  endDate?: string; // Calculated from startDate + totalDays
}

export const TIMELINE_PRESETS = [
  { label: "1 Month", days: 30, description: "Quick sprint" },
  { label: "2 Months", days: 60, description: "Short course" },
  { label: "3 Months", days: 90, description: "Quarter focus" },
  { label: "6 Months", days: 180, description: "Deep dive" },
  { label: "9 Months", days: 270, description: "Extended journey" },
  { label: "1 Year", days: 365, description: "Full mastery" },
] as const;

// ==========================================
// TASK RESOURCES
// ==========================================

export type ResourceType =
  | "documentation"
  | "video"
  | "course"
  | "article"
  | "tutorial"
  | "exercise"
  | "book"
  | "podcast"
  | "tool"
  | "project";

export interface TaskResource {
  type: ResourceType;
  title: string;
  url: string;
  description?: string;
  source?: string; // e.g., "YouTube", "MDN", "Coursera"
  estimatedMinutes?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  isFree?: boolean;
}

// ==========================================
// PLAN SUMMARY (Lightweight for sidebar)
// ==========================================

export interface PlanSummary {
  planId: string;
  planTitle: string;
  planDescription: string;
  planCategory: PlanCategory;
  planIcon: string;
  totalDays: number;
  totalTasks: number;
  completedTasksCount: number;
  totalPoints: number;
  earnedPoints: number;
  currentStreak: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  progressPercent: number; // Calculated: completedTasksCount / totalTasks * 100
  isArchived?: boolean;
}

// ==========================================
// PLAN DOCUMENT (Full plan stored in DB)
// ==========================================

export interface PlanDocument {
  planId: string;
  planTitle: string;
  planDescription: string;
  planCategory: PlanCategory;
  planIcon: string;

  // Timeline settings
  startDate: string;
  endDate: string;
  totalDays: number;
  totalTasks?: number; // Stored separately since dailyTasks array may be empty (stored in separate table)
  scheduleType: "weekdays" | "fullweek" | "custom";
  customDaysPerWeek?: number;

  // Plan-specific settings
  timeCommitment: string;
  experienceLevel: string;
  includeLeetCode: boolean;
  leetCodeLanguage?: string;

  // Tasks with enhanced resources
  dailyTasks: EnhancedDailyTask[];
  monthlyThemes: MonthlyTheme[];

  // Plan-specific progress
  completedTasks: Record<string, TaskCompletion>;
  totalPoints: number;
  earnedPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string | null;
  dailyCheckIns: Record<string, boolean>;

  // Quiz and LeetCode tracking (per plan)
  quizAttempts: QuizAttemptRecord[];
  leetCodeSubmissions: LeetCodeSubmissionRecord[];

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Archive status
  isArchived?: boolean;
  archivedAt?: string;
}

export interface EnhancedDailyTask {
  taskId: string;
  day: number;
  date: string;
  title: string;
  description: string;
  type: "learn" | "practice" | "build" | "review";
  estimatedMinutes: number;
  points: number;
  month: number;
  week: number;
  isLeetCode?: boolean;
  resources?: TaskResource[];
  tags?: string[];
}

export interface MonthlyTheme {
  month: number;
  theme: string;
  focus: string;
  description?: string;
}

export interface TaskCompletion {
  completedAt: string;
  points: number;
  quizScore?: number;
  timeSpent?: number;
}

export interface QuizAttemptRecord {
  taskId: string;
  date: string;
  score: number;
  passed: boolean;
  attemptedAt: string;
}

export interface LeetCodeSubmissionRecord {
  taskId: string;
  date: string;
  problemSlug: string;
  problemTitle?: string;
  difficulty?: string;
  language: string;
  passed: boolean;
  pointsEarned: number;
  submittedAt: string;
}

// ==========================================
// USER DOCUMENT V2 (Multi-plan support)
// ==========================================

export interface UserSettings {
  reminderTime: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  theme: "dark" | "light" | "system";
}

export interface UserDocumentV2 {
  email: string; // Primary Key

  // User Info
  name: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;

  // Global User Settings
  settings: UserSettings;

  // Multi-Plan Array (Max 3)
  plans: PlanDocument[];
  activePlanId: string | null; // Currently selected plan

  // Global Stats (across all plans)
  globalTotalPoints: number;
  globalCurrentStreak: number;
  globalLongestStreak: number;

  // Schema version for migration
  schemaVersion: number; // 2 for multi-plan
}

// ==========================================
// CONSTANTS
// ==========================================

export const MAX_PLANS_PER_USER = 3;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  reminderTime: "09:00",
  timezone: "Africa/Accra",
  emailNotifications: true,
  smsNotifications: true,
  theme: "dark",
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function getCategoryConfig(categoryId: PlanCategory): CategoryConfig | undefined {
  return PLAN_CATEGORIES.find((c) => c.id === categoryId);
}

export function shouldShowLeetCode(categoryId: PlanCategory): boolean {
  const config = getCategoryConfig(categoryId);
  return config?.showLeetCode ?? false;
}

export function calculateProgressPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function canAddPlan(currentPlanCount: number): boolean {
  return currentPlanCount < MAX_PLANS_PER_USER;
}

export function planDocumentToSummary(plan: PlanDocument): PlanSummary {
  const completedTasksCount = Object.keys(plan.completedTasks || {}).length;
  // Use stored totalTasks field (since dailyTasks may be empty when stored separately)
  const totalTasks = plan.totalTasks || plan.dailyTasks?.length || 0;

  return {
    planId: plan.planId,
    planTitle: plan.planTitle || "My Learning Plan",
    planDescription: plan.planDescription || "Personal learning journey",
    planCategory: plan.planCategory,
    planIcon: plan.planIcon,
    totalDays: plan.totalDays,
    totalTasks,
    completedTasksCount,
    totalPoints: plan.totalPoints,
    earnedPoints: plan.earnedPoints || 0,
    currentStreak: plan.currentStreak || 0,
    startDate: plan.startDate,
    endDate: plan.endDate,
    isActive: false, // Set by caller based on activePlanId
    createdAt: plan.createdAt,
    progressPercent: calculateProgressPercent(completedTasksCount, totalTasks),
    isArchived: plan.isArchived,
  };
}
