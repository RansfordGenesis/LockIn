import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Plan, GoalInput, User, ViewType, QuizAttempt, LeetCodeSubmission } from "@/types/plan";
import { format, differenceInDays, parseISO, startOfDay } from "date-fns";

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // Goal Input
  goalInput: GoalInput | null;
  setGoalInput: (input: GoalInput) => void;

  // Generated Plan
  plan: Plan | null;
  setPlan: (plan: Plan) => void;
  clearPlan: () => void;

  // Current Date (for daily view)
  currentDate: string;
  setCurrentDate: (date: string) => void;

  // Task Completion (permanent - points stay)
  completedTasks: Record<string, { points: number; completedAt: string; quizScore?: number }>;
  completeTask: (taskId: string, points: number, quizScore?: number) => void;
  
  // Quiz Attempts
  quizAttempts: Record<string, QuizAttempt[]>;
  addQuizAttempt: (attempt: QuizAttempt) => void;

  // LeetCode Submissions
  leetCodeSubmissions: Record<string, LeetCodeSubmission[]>;
  addLeetCodeSubmission: (submission: LeetCodeSubmission) => void;

  // Progress Stats
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  updateStreak: (streak: number) => void;
  
  // Daily check-in tracking
  lastCheckIn: string | null;
  dailyCheckIns: Record<string, boolean>; // date -> checked in
  checkIn: () => void;
  checkStreakReset: () => void;

  // Restore state from backend (after login)
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

  // Generation State
  isGenerating: boolean;
  setIsGenerating: (loading: boolean) => void;
  generationError: string | null;
  setGenerationError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User
      user: null,
      setUser: (user) => set({ user }),

      // Goal Input
      goalInput: null,
      setGoalInput: (input) => set({ goalInput: input }),

      // Generated Plan
      plan: null,
      setPlan: (plan) => set({ plan, currentView: "daily" }),
      clearPlan: () => set({
        user: null,
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
          
          // Sync with backend using email as identifier
          if (state.user?.email) {
            fetch("/api/user-state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: state.user.email,
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
            [submission.taskId]: [...(state.leetCodeSubmissions[submission.taskId] || []), submission],
          };

          // Sync with backend
          if (state.user?.email) {
            fetch("/api/user-state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: state.user.email,
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
        
        set({
          lastCheckIn: newLastCheckIn,
          dailyCheckIns: newDailyCheckIns,
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
        });
        
        // Sync with backend using email as identifier
        if (state.user?.email) {
          fetch("/api/user-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: state.user.email,
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

      // Restore state from backend (after login)
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

      // Generation State
      isGenerating: false,
      setIsGenerating: (loading) => set({ isGenerating: loading }),
      generationError: null,
      setGenerationError: (error) => set({ generationError: error }),
    }),
    {
      name: "lockin-storage-v3",
      partialize: (state) => ({
        user: state.user,
        goalInput: state.goalInput,
        plan: state.plan,
        completedTasks: state.completedTasks,
        quizAttempts: state.quizAttempts,
        leetCodeSubmissions: state.leetCodeSubmissions,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        totalPoints: state.totalPoints,
        lastCheckIn: state.lastCheckIn,
        dailyCheckIns: state.dailyCheckIns,
        // NOTE: currentDate is intentionally NOT persisted
        // It should always reset to today on reload/login
      }),
    }
  )
);
