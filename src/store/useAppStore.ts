import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Plan, GoalInput, User, ViewType, QuizAttempt, LeetCodeSubmission } from "@/types/plan";
import { PlanSummary, PlanDocument, MAX_PLANS_PER_USER, PlanCategory } from "@/types/multiplan";
import { format, differenceInDays, parseISO, startOfDay } from "date-fns";

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // Multi-Plan Management
  plans: PlanSummary[];
  activePlanId: string | null;
  setPlans: (plans: PlanSummary[]) => void;
  setActivePlanId: (planId: string | null) => void;
  addPlanSummary: (plan: PlanSummary) => void;
  updatePlanSummary: (planId: string, updates: Partial<PlanSummary>) => void;
  removePlanSummary: (planId: string) => void;
  canAddPlan: () => boolean;

  // Active Plan (full data for current view)
  plan: Plan | null;
  setPlan: (plan: Plan) => void;
  clearPlan: () => void;

  // Goal Input (for wizard)
  goalInput: GoalInput | null;
  setGoalInput: (input: GoalInput) => void;

  // Current Date (for daily view)
  currentDate: string;
  setCurrentDate: (date: string) => void;

  // Task Completion (per-plan, permanent - points stay)
  completedTasks: Record<string, { points: number; completedAt: string; quizScore?: number }>;
  completeTask: (taskId: string, points: number, quizScore?: number) => void;

  // Quiz Attempts
  quizAttempts: Record<string, QuizAttempt[]>;
  addQuizAttempt: (attempt: QuizAttempt) => void;

  // LeetCode Submissions
  leetCodeSubmissions: Record<string, LeetCodeSubmission[]>;
  addLeetCodeSubmission: (submission: LeetCodeSubmission) => void;

  // Progress Stats (per-plan)
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  updateStreak: (streak: number) => void;

  // Global Stats (across all plans)
  globalTotalPoints: number;
  globalCurrentStreak: number;
  globalLongestStreak: number;
  setGlobalStats: (stats: { totalPoints?: number; currentStreak?: number; longestStreak?: number }) => void;

  // Daily check-in tracking (per-plan)
  lastCheckIn: string | null;
  dailyCheckIns: Record<string, boolean>;
  checkIn: () => void;
  checkStreakReset: () => void;

  // Restore state from backend (after login or plan switch)
  restoreUserState: (state: {
    completedTasks: Record<string, { points: number; completedAt: string; quizScore?: number }>;
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    lastCheckIn: string | null;
    dailyCheckIns: Record<string, boolean>;
  }) => void;

  // UI State
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  activePlanTab: "quarterly" | "monthly" | "weekly" | "daily";
  setActivePlanTab: (tab: "quarterly" | "monthly" | "weekly" | "daily") => void;

  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Plan Creation State
  isCreatingPlan: boolean;
  setIsCreatingPlan: (creating: boolean) => void;

  // Generation State
  isGenerating: boolean;
  setIsGenerating: (loading: boolean) => void;
  generationError: string | null;
  setGenerationError: (error: string | null) => void;

  // Full logout/clear
  clearAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User
      user: null,
      setUser: (user) => set({ user }),

      // Multi-Plan Management
      plans: [],
      activePlanId: null,
      setPlans: (plans) => set({ plans }),
      setActivePlanId: (planId) => set({ activePlanId: planId }),
      addPlanSummary: (plan) =>
        set((state) => {
          if (state.plans.length >= MAX_PLANS_PER_USER) return state;
          return { plans: [...state.plans, plan] };
        }),
      updatePlanSummary: (planId, updates) =>
        set((state) => ({
          plans: state.plans.map((p) =>
            p.planId === planId ? { ...p, ...updates } : p
          ),
        })),
      removePlanSummary: (planId) =>
        set((state) => {
          const newPlans = state.plans.filter((p) => p.planId !== planId);
          const newActivePlanId =
            state.activePlanId === planId
              ? newPlans.length > 0
                ? newPlans[0].planId
                : null
              : state.activePlanId;
          return { plans: newPlans, activePlanId: newActivePlanId };
        }),
      canAddPlan: () => get().plans.length < MAX_PLANS_PER_USER,

      // Goal Input
      goalInput: null,
      setGoalInput: (input) => set({ goalInput: input }),

      // Active Plan (full data)
      plan: null,
      setPlan: (plan) =>
        set((state) => {
          // Also update the plan summary
          const existingIndex = state.plans.findIndex((p) => p.planId === plan.planId);
          let newPlans = [...state.plans];

          // Plan type uses title/description/category, but PlanSummary uses planTitle/planDescription/planCategory
          const planAny = plan as Plan & { planTitle?: string; planDescription?: string; planCategory?: string; dailyTasks?: unknown[] };
          
          const summary: PlanSummary = {
            planId: plan.planId,
            planTitle: planAny.planTitle || plan.title || "My Learning Plan",
            planDescription: planAny.planDescription || plan.description || "",
            planCategory: (planAny.planCategory || plan.category || "custom") as PlanCategory,
            planIcon: plan.planIcon || "✨",
            totalDays: plan.totalDays || 365,
            totalTasks: plan.totalTasks || (planAny.dailyTasks?.length) || 0,
            completedTasksCount: Object.keys(state.completedTasks).length,
            totalPoints: state.totalPoints,
            earnedPoints: state.totalPoints,
            currentStreak: state.currentStreak,
            startDate: plan.startDate,
            endDate: plan.endDate,
            isActive: true,
            createdAt: plan.createdAt,
            progressPercent: (plan.totalTasks || planAny.dailyTasks?.length)
              ? Math.round((Object.keys(state.completedTasks).length / (plan.totalTasks || planAny.dailyTasks?.length || 1)) * 100)
              : 0,
          };

          if (existingIndex >= 0) {
            newPlans[existingIndex] = { ...newPlans[existingIndex], ...summary };
          } else {
            // Mark all other plans as inactive
            newPlans = newPlans.map((p) => ({ ...p, isActive: false }));
            newPlans.push(summary);
          }

          return {
            plan,
            plans: newPlans,
            activePlanId: plan.planId,
            currentView: "daily",
          };
        }),
      clearPlan: () =>
        set({
          plan: null,
          goalInput: null,
          completedTasks: {},
          quizAttempts: {},
          leetCodeSubmissions: {},
          currentStreak: 0,
          longestStreak: 0,
          totalPoints: 0,
          lastCheckIn: null,
          dailyCheckIns: {},
          currentDate: format(new Date(), "yyyy-MM-dd"),
        }),

      // Current Date
      currentDate: format(new Date(), "yyyy-MM-dd"),
      setCurrentDate: (date) => set({ currentDate: date }),

      // Task Completion (permanent)
      completedTasks: {},
      completeTask: (taskId, points, quizScore) =>
        set((state) => {
          // Points are permanent - once earned, never removed
          if (state.completedTasks[taskId]) return state;

          const newCompletedTasks = {
            ...state.completedTasks,
            [taskId]: { points, completedAt: new Date().toISOString(), quizScore },
          };
          const newTotalPoints = state.totalPoints + points;

          // Update plan summary
          const newPlans = state.plans.map((p) =>
            p.planId === state.activePlanId
              ? {
                  ...p,
                  completedTasksCount: Object.keys(newCompletedTasks).length,
                  earnedPoints: newTotalPoints,
                  progressPercent: p.totalTasks
                    ? Math.round((Object.keys(newCompletedTasks).length / p.totalTasks) * 100)
                    : 0,
                }
              : p
          );

          // Sync with backend using email and planId as identifiers
          if (state.user?.email && state.activePlanId) {
            fetch("/api/user-state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: state.user.email,
                planId: state.activePlanId,
                completedTasks: newCompletedTasks,
                totalPoints: newTotalPoints,
                currentStreak: state.currentStreak,
                longestStreak: state.longestStreak,
                lastCheckIn: state.lastCheckIn,
                dailyCheckIns: state.dailyCheckIns,
              }),
            }).catch(console.error);
          }

          return {
            completedTasks: newCompletedTasks,
            totalPoints: newTotalPoints,
            plans: newPlans,
            globalTotalPoints: state.globalTotalPoints + points,
          };
        }),

      // Quiz Attempts
      quizAttempts: {},
      addQuizAttempt: (attempt) =>
        set((state) => ({
          quizAttempts: {
            ...state.quizAttempts,
            [attempt.taskId]: [...(state.quizAttempts[attempt.taskId] || []), attempt],
          },
        })),

      // LeetCode Submissions
      leetCodeSubmissions: {},
      addLeetCodeSubmission: (submission) =>
        set((state) => {
          const newSubmissions = {
            ...state.leetCodeSubmissions,
            [submission.taskId]: [
              ...(state.leetCodeSubmissions[submission.taskId] || []),
              submission,
            ],
          };

          // Sync with backend
          if (state.user?.email && state.activePlanId) {
            fetch("/api/user-state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: state.user.email,
                planId: state.activePlanId,
                completedTasks: state.completedTasks,
                totalPoints: state.totalPoints,
                currentStreak: state.currentStreak,
                longestStreak: state.longestStreak,
                lastCheckIn: state.lastCheckIn,
                dailyCheckIns: state.dailyCheckIns,
                leetCodeSubmissions: newSubmissions,
              }),
            }).catch(console.error);
          }

          return { leetCodeSubmissions: newSubmissions };
        }),

      // Progress Stats
      currentStreak: 0,
      longestStreak: 0,
      totalPoints: 0,
      updateStreak: (streak) =>
        set((state) => ({
          currentStreak: streak,
          longestStreak: Math.max(state.longestStreak, streak),
        })),

      // Global Stats
      globalTotalPoints: 0,
      globalCurrentStreak: 0,
      globalLongestStreak: 0,
      setGlobalStats: (stats) =>
        set((state) => ({
          globalTotalPoints: stats.totalPoints ?? state.globalTotalPoints,
          globalCurrentStreak: stats.currentStreak ?? state.globalCurrentStreak,
          globalLongestStreak: stats.longestStreak ?? state.globalLongestStreak,
        })),

      // Daily check-in tracking
      lastCheckIn: null,
      dailyCheckIns: {},
      checkIn: () => {
        const today = format(new Date(), "yyyy-MM-dd");
        const state = get();

        // Already checked in today
        if (state.dailyCheckIns[today]) return;

        const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
        const hadYesterdayCheckIn = state.dailyCheckIns[yesterday];

        let newStreak;
        if (hadYesterdayCheckIn) {
          // Continue streak
          newStreak = state.currentStreak + 1;
        } else if (state.lastCheckIn) {
          // Check if streak should reset
          const lastDate = parseISO(state.lastCheckIn);
          const daysDiff = differenceInDays(startOfDay(new Date()), startOfDay(lastDate));
          if (daysDiff > 1) {
            // Missed a day - reset streak
            newStreak = 1;
          } else {
            newStreak = state.currentStreak + 1;
          }
        } else {
          // First check-in ever
          newStreak = 1;
        }

        const newDailyCheckIns = { ...state.dailyCheckIns, [today]: true };
        const newLastCheckIn = new Date().toISOString();
        const newLongestStreak = Math.max(state.longestStreak, newStreak);

        // Update plan summary streak
        const newPlans = state.plans.map((p) =>
          p.planId === state.activePlanId
            ? { ...p, currentStreak: newStreak }
            : p
        );

        set({
          lastCheckIn: newLastCheckIn,
          dailyCheckIns: newDailyCheckIns,
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          plans: newPlans,
          globalCurrentStreak: Math.max(state.globalCurrentStreak, newStreak),
          globalLongestStreak: Math.max(state.globalLongestStreak, newLongestStreak),
        });

        // Sync with backend using email and planId as identifiers
        if (state.user?.email && state.activePlanId) {
          fetch("/api/user-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: state.user.email,
              planId: state.activePlanId,
              completedTasks: state.completedTasks,
              totalPoints: state.totalPoints,
              currentStreak: newStreak,
              longestStreak: newLongestStreak,
              lastCheckIn: newLastCheckIn,
              dailyCheckIns: newDailyCheckIns,
            }),
          }).catch(console.error);
        }
      },
      checkStreakReset: () => {
        const state = get();
        if (!state.lastCheckIn) return;

        const lastDate = parseISO(state.lastCheckIn);
        const daysDiff = differenceInDays(startOfDay(new Date()), startOfDay(lastDate));

        if (daysDiff > 1) {
          // Missed more than 1 day - reset streak
          set({ currentStreak: 0 });
        }
      },

      // Restore state from backend (after login or plan switch)
      restoreUserState: (userState) => {
        set({
          completedTasks: userState.completedTasks || {},
          totalPoints: userState.totalPoints || 0,
          currentStreak: userState.currentStreak || 0,
          longestStreak: userState.longestStreak || 0,
          lastCheckIn: userState.lastCheckIn || null,
          dailyCheckIns: userState.dailyCheckIns || {},
          // Always reset to today when restoring state (login)
          currentDate: format(new Date(), "yyyy-MM-dd"),
        });
      },

      // UI State
      currentView: "landing",
      setCurrentView: (view) => set({ currentView: view }),
      activePlanTab: "daily",
      setActivePlanTab: (tab) => set({ activePlanTab: tab }),

      // Sidebar state
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Plan Creation State
      isCreatingPlan: false,
      setIsCreatingPlan: (creating) => set({ isCreatingPlan: creating }),

      // Generation State
      isGenerating: false,
      setIsGenerating: (loading) => set({ isGenerating: loading }),
      generationError: null,
      setGenerationError: (error) => set({ generationError: error }),

      // Full logout/clear
      clearAll: () =>
        set({
          user: null,
          plans: [],
          activePlanId: null,
          plan: null,
          goalInput: null,
          completedTasks: {},
          quizAttempts: {},
          leetCodeSubmissions: {},
          currentStreak: 0,
          longestStreak: 0,
          totalPoints: 0,
          globalTotalPoints: 0,
          globalCurrentStreak: 0,
          globalLongestStreak: 0,
          lastCheckIn: null,
          dailyCheckIns: {},
          currentDate: format(new Date(), "yyyy-MM-dd"),
          currentView: "landing",
          sidebarOpen: false,
          isCreatingPlan: false,
        }),
    }),
    {
      name: "lockin-storage-v4",
      partialize: (state) => ({
        user: state.user,
        plans: state.plans,
        activePlanId: state.activePlanId,
        goalInput: state.goalInput,
        plan: state.plan,
        completedTasks: state.completedTasks,
        quizAttempts: state.quizAttempts,
        leetCodeSubmissions: state.leetCodeSubmissions,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        totalPoints: state.totalPoints,
        globalTotalPoints: state.globalTotalPoints,
        globalCurrentStreak: state.globalCurrentStreak,
        globalLongestStreak: state.globalLongestStreak,
        lastCheckIn: state.lastCheckIn,
        dailyCheckIns: state.dailyCheckIns,
        currentView: state.currentView, // Persist view so users don't see welcome screen on reload
        // NOTE: currentDate is intentionally NOT persisted
        // It should always reset to today on reload/login
      }),
    }
  )
);
