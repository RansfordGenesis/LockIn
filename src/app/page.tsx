"use client";

import React, { useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import AuthScreen from "@/components/auth/AuthScreen";
import AIFirstWizard from "@/components/wizard/AIFirstWizard";
import DailyFocusView from "@/components/daily/DailyFocusView";
import DashboardView from "@/components/dashboard/DashboardView";
import FullYearPlanView from "@/components/curriculum/FullYearPlanView";
import { PlanSidebar, PlanDropdown } from "@/components/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { GoalInput, DayPlan } from "@/types/plan";

// Auth user info passed from AuthScreen
interface AuthUser {
  email: string;
  name: string;
  phone: string;
  isNewUser: boolean;
}

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [dashboardViewMode, setDashboardViewMode] = useState<"overview" | "weekly" | "monthly" | "quarterly">("overview");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const {
    currentView,
    setCurrentView,
    plan,
    setPlan,
    setUser,
    currentDate,
    setCurrentDate,
    completedTasks,
    completeTask,
    totalPoints,
    currentStreak,
    longestStreak,
    isGenerating,
    setIsGenerating,
    setGenerationError,
    clearPlan,
    clearAll,
    setGoalInput,
    restoreUserState,
    // Multi-plan state
    plans,
    setPlans,
    activePlanId,
    setActivePlanId,
    removePlanSummary,
    user,
    isCreatingPlan,
    setIsCreatingPlan,
    setGlobalStats,
  } = useAppStore();

  // Auto-redirect to daily view if user has a plan and is on landing page
  // This handles the case where currentView wasn't persisted in older versions
  React.useEffect(() => {
    if (currentView === "landing" && plan && user) {
      setCurrentView("daily");
    }
  }, [currentView, plan, user, setCurrentView]);

  // Helper type for new plan format
  interface NewPlanFormat {
    dailyTasks: Array<{
      taskId: string;
      day: number;
      date: string;
      title: string;
      description: string;
      type: string;
      estimatedMinutes: number;
      points: number;
      month: number;
      week: number;
    }>;
  }

  // Get today's plan from the full plan structure (supports both old and new formats)
  const todaysPlan = useMemo((): DayPlan | null => {
    if (!plan) return null;

    // Helper: Build DayPlan from new format tasks
    const buildDayPlanFromNewFormat = (tasks: NewPlanFormat['dailyTasks']): DayPlan => ({
      id: currentDate,
      date: currentDate,
      dayOfWeek: new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long' }),
      isWorkDay: true,
      isFlexDay: false,
      isRecoveryDay: false,
      tasks: tasks.map(t => ({
        taskId: t.taskId,
        dayId: currentDate,
        title: t.title,
        description: t.description,
        type: t.type as "learn" | "practice" | "build" | "review" | "quiz",
        estimatedMinutes: t.estimatedMinutes,
        points: t.points,
        tags: [],
        quizTopics: [],
      })),
      estimatedMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
    });

    // Helper: Find day in old format structure
    interface OldFormatQuarter {
      months?: Array<{
        weeks?: Array<{
          days?: DayPlan[];
        }>;
      }>;
    }
    const findDayInOldFormat = (quarters: OldFormatQuarter[]): DayPlan | null => {
      for (const quarter of quarters) {
        if (!quarter.months) continue;

        for (const month of quarter.months) {
          if (!month.weeks) continue;

          const day = month.weeks.flatMap(w => w.days || []).find(d => d.date === currentDate);
          if (day) return day;
        }
      }
      return null;
    };

    // Check for new format (flat dailyTasks array)
    if ('dailyTasks' in plan && Array.isArray((plan as NewPlanFormat).dailyTasks)) {
      const newPlan = plan as NewPlanFormat;
      const todaysTasks = newPlan.dailyTasks.filter(t => t.date === currentDate);
      return todaysTasks.length > 0 ? buildDayPlanFromNewFormat(todaysTasks) : null;
    }

    // Old format (nested quarters structure)
    return Array.isArray(plan.quarters) ? findDayInOldFormat(plan.quarters) : null;
  }, [plan, currentDate]);

  // Get completed task IDs as Set
  const completedTaskIds = useMemo(() => new Set(Object.keys(completedTasks)), [completedTasks]);

  // Get active plan summary
  const activePlanSummary = useMemo(() => {
    return plans.find(p => p.planId === activePlanId) || null;
  }, [plans, activePlanId]);

  // Define wizard data interface matching AIFirstWizard output
  interface WizardData {
    goal: string;
    analysis: {
      detectedCategory: string;
      categoryName: string;
      categoryIcon: string;
      summary: string;
      questions: Array<{
        id: string;
        question: string;
        type: "single" | "multi";
        reason: string;
        options: Array<{ value: string; label: string; description?: string }>;
      }>;
      suggestedTimeCommitment: string;
    } | null;
    answers: Record<string, string | string[]>;
    otherInputs: Record<string, string>;
    timeCommitment: string;
    experience: "beginner" | "intermediate" | "advanced";
    constraints: string[];
    firstName: string;
    email: string;
    phone: string;
    enableNotifications: boolean;
    scheduleType: "weekdays" | "fullweek";
    includeLeetCode: boolean;
    leetCodeLanguage: string;
    customCurriculum: string;
    useCustomCurriculum: boolean;
    // Timeline fields
    selectedCategory: string | null;
    startDate: string;
    timelineDays: number;
  }

  // Handle auth success - either go to wizard (new user) or daily view (existing user with plan)
  const handleAuthSuccess = async (authData: { email: string; name: string; phone: string; isNewUser: boolean }) => {
    if (authData.isNewUser) {
      // New user - save auth info and go to wizard
      setAuthUser(authData);
      setCurrentView("wizard");
    } else {
      // Existing user - fetch their plan and go to daily view
      try {
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authData.email,
            phone: authData.phone,
          }),
        });

        const loginData = await loginResponse.json();

        if (loginData.success && loginData.plan) {
          // Set user
          setUser({
            userId: loginData.user.email,
            email: loginData.user.email,
            phoneNumber: loginData.user.phoneNumber,
            name: loginData.user.name,
            createdAt: loginData.user.createdAt,
            updatedAt: new Date().toISOString(),
            settings: {
              scheduleType: loginData.plan.scheduleType || "weekdays",
              timeCommitment: loginData.plan.timeCommitment || "1hr-daily",
              reminderTime: "09:00",
              timezone: "Africa/Accra",
              emailNotifications: true,
              smsNotifications: true,
            },
            currentStreak: loginData.userState?.currentStreak || 0,
            longestStreak: loginData.userState?.longestStreak || 0,
            totalPoints: loginData.userState?.totalPoints || 0,
            completedDays: 0,
          });

          // Set plans list and active plan ID
          if (loginData.plans) {
            setPlans(loginData.plans);
            setActivePlanId(loginData.activePlanId);
          }

          // Set global stats
          if (loginData.globalStats) {
            setGlobalStats(loginData.globalStats);
          }

          setPlan(loginData.plan);

          // Restore user state
          if (loginData.userState) {
            restoreUserState(loginData.userState);
          }

          setCurrentView("daily");
        } else if (loginData.needsPlan) {
          // User exists but has no plan - go to wizard
          setAuthUser(authData);
          setPlans(loginData.plans || []);
          setCurrentView("wizard");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // Fallback to wizard
        setAuthUser(authData);
        setCurrentView("wizard");
      }
    }
  };

  // Handle plan switch
  const handlePlanSwitch = async (planId: string) => {
    if (!user?.email || planId === activePlanId) return;

    try {
      // Fetch the plan data
      const response = await fetch(`/api/plans/${planId}?email=${user.email}`);
      const data = await response.json();

      if (data.success && data.plan) {
        // Update store
        setActivePlanId(planId);
        setPlan(data.plan);

        // Restore progress for this plan
        restoreUserState({
          completedTasks: data.plan.completedTasks || {},
          totalPoints: data.plan.earnedPoints || 0,
          currentStreak: data.plan.currentStreak || 0,
          longestStreak: data.plan.longestStreak || 0,
          lastCheckIn: data.plan.lastCheckIn || null,
          dailyCheckIns: data.plan.dailyCheckIns || {},
        });

        // Switch active on server
        await fetch(`/api/plans/${planId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            action: "switch",
          }),
        });
      }
    } catch (error) {
      console.error("Error switching plan:", error);
    }
  };

  // Handle add new plan
  const handleAddPlan = () => {
    setIsCreatingPlan(true);
    setCurrentView("wizard");
  };

  // Handle delete plan
  const handleDeletePlan = async (planId: string) => {
    if (!user?.email) return;

    try {
      const response = await fetch(`/api/plans/${planId}?email=${user.email}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        removePlanSummary(planId);

        // If deleted active plan, switch to another
        if (planId === activePlanId && data.plans?.length > 0) {
          handlePlanSwitch(data.activePlanId);
        } else if (data.plans?.length === 0) {
          // No plans left - go to wizard
          clearPlan();
          setCurrentView("wizard");
        }
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
    }
  };

  // Handle AI-first wizard completion
  const handleWizardComplete = async (wizardData: WizardData) => {
    const currentAuthUser = authUser || (user ? { email: user.email, name: user.name || "", phone: user.phoneNumber, isNewUser: false } : null);

    if (!currentAuthUser) {
      setGenerationError("Authentication required. Please sign in first.");
      setCurrentView("landing");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    // Convert wizard data to GoalInput format
    const mergedAnswers: Record<string, string | string[]> = {};
    Object.entries(wizardData.answers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        mergedAnswers[key] = value.map((v) =>
          v === "other" && wizardData.otherInputs[key]
            ? wizardData.otherInputs[key]
            : v
        );
      } else {
        mergedAnswers[key] =
          value === "other" && wizardData.otherInputs[key]
            ? wizardData.otherInputs[key]
            : value;
      }
    });

    const goalInput: GoalInput = {
      category: wizardData.selectedCategory || wizardData.analysis?.detectedCategory || "custom",
      categoryName: wizardData.analysis?.categoryName,
      primaryGoal: wizardData.goal,
      subGoals: [],
      selectedOptions: mergedAnswers,
      timeCommitment: wizardData.timeCommitment,
      scheduleType: wizardData.scheduleType,
      experienceLevel: wizardData.experience,
      constraints: wizardData.constraints,
      customCurriculum: wizardData.useCustomCurriculum ? wizardData.customCurriculum : undefined,
      // Timeline configuration
      startDate: wizardData.startDate,
      totalDays: wizardData.timelineDays,
    };

    setGoalInput(goalInput);

    try {
      const userName = currentAuthUser.name;
      const userEmail = currentAuthUser.email;
      const userPhone = currentAuthUser.phone;

      // Generate the complete plan
      const planResponse = await fetch("/api/generate-enhanced-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalInput,
          includeLeetCode: wizardData.includeLeetCode,
          leetCodeLanguage: wizardData.leetCodeLanguage,
          // Pass timeline config
          startDate: wizardData.startDate,
          totalDays: wizardData.timelineDays,
        }),
      });

      const planData = await planResponse.json();
      if (!planData.success) {
        throw new Error(planData.error || "Failed to generate plan");
      }

      // Check if this is a new user or adding a plan
      if (isCreatingPlan && user) {
        // Existing user adding a new plan
        const planDocument = {
          planId: planData.plan.planId,
          planTitle: planData.plan.planTitle,
          planDescription: planData.plan.planDescription,
          planCategory: planData.plan.planCategory,
          planIcon: planData.plan.planIcon || "✨",
          startDate: planData.plan.startDate,
          endDate: planData.plan.endDate,
          totalDays: planData.plan.totalDays,
          scheduleType: planData.plan.scheduleType,
          timeCommitment: planData.plan.timeCommitment,
          experienceLevel: wizardData.experience,
          includeLeetCode: planData.plan.includeLeetCode,
          leetCodeLanguage: wizardData.leetCodeLanguage,
          dailyTasks: planData.plan.dailyTasks,
          monthlyThemes: planData.plan.monthlyThemes,
          completedTasks: {},
          totalPoints: 0,
          earnedPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastCheckIn: null,
          dailyCheckIns: {},
          quizAttempts: [],
          leetCodeSubmissions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const addPlanResponse = await fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            plan: planDocument,
          }),
        });

        const addPlanData = await addPlanResponse.json();
        if (!addPlanData.success) {
          throw new Error(addPlanData.error || "Failed to add plan");
        }

        setPlans(addPlanData.plans);
        setActivePlanId(planData.plan.planId);
        setPlan(planData.plan);
        setIsCreatingPlan(false);
      } else {
        // New user - create user with first plan
        const userResponse = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            phoneNumber: userPhone,
            name: userName,
            planId: planData.plan.planId,
            planTitle: planData.plan.planTitle,
            planDescription: planData.plan.planDescription,
            planCategory: planData.plan.planCategory,
            planIcon: planData.plan.planIcon || "✨",
            scheduleType: planData.plan.scheduleType,
            timeCommitment: planData.plan.timeCommitment,
            includeLeetCode: planData.plan.includeLeetCode,
            totalDays: planData.plan.totalDays,
            dailyTasks: planData.plan.dailyTasks,
            monthlyThemes: planData.plan.monthlyThemes,
          }),
        });

        const userData = await userResponse.json();
        if (!userData.success) {
          throw new Error(userData.error || "Failed to create account");
        }

        // Set local user state
        setUser({
          userId: userEmail,
          email: userEmail,
          phoneNumber: userPhone,
          name: userName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settings: {
            scheduleType: goalInput.scheduleType,
            timeCommitment: goalInput.timeCommitment,
            reminderTime: "09:00",
            timezone: "Africa/Accra",
            emailNotifications: true,
            smsNotifications: true,
          },
          currentStreak: 0,
          longestStreak: 0,
          totalPoints: 0,
          completedDays: 0,
        });

        setPlan(planData.plan);

        // Send welcome SMS/Email
        fetch("/api/send-welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: userPhone,
            email: userEmail,
            planTitle: planData.plan.planTitle,
            userName: userName,
          }),
        }).catch(console.error);
      }

      setCurrentView("daily");
    } catch (error) {
      console.error("Error:", error);
      setGenerationError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle task completion
  const handleCompleteTask = (taskId: string, points: number) => {
    completeTask(taskId, points);
  };

  // Handle date change in daily view
  const handleDateChange = (date: string) => {
    setCurrentDate(date);
  };

  // Handle logout - clear local state and go to auth screen
  const handleLogout = () => {
    clearAll();
    setAuthUser(null);
    setShowDashboard(false);
    setShowCurriculum(false);
    setCurrentView("landing");
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Check if user is authenticated with plans
  const isAuthenticated = user && plans.length > 0 && plan;

  // Main render
  return (
    <div className="flex min-h-screen bg-[#0a0a0c]">
      {/* Desktop Sidebar - Only show when authenticated and has plans */}
      {isAuthenticated && currentView === "daily" && (
        <aside className="hidden md:flex w-60 flex-col flex-shrink-0">
          <PlanSidebar
            plans={plans}
            activePlanId={activePlanId}
            onPlanSelect={handlePlanSwitch}
            onAddPlan={handleAddPlan}
            onDeletePlan={handleDeletePlan}
            userName={user?.name}
            onLogout={handleLogout}
          />
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header with Dropdown - Only show when authenticated */}
        {isAuthenticated && currentView === "daily" && !showDashboard && !showCurriculum && (
          <header className="md:hidden sticky top-0 z-[60] p-4 border-b border-white/10 bg-[#0a0a0c]/95 backdrop-blur-xl">
            <PlanDropdown
              plans={plans}
              activePlan={activePlanSummary}
              onPlanSelect={handlePlanSwitch}
              onAddPlan={handleAddPlan}
              onLogout={handleLogout}
            />
          </header>
        )}

        {/* View Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {/* Auth Screen - First thing users see if not authenticated */}
            {!authUser && !plan && currentView === "landing" && (
              <motion.div
                key="auth"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AuthScreen onAuthSuccess={handleAuthSuccess} />
              </motion.div>
            )}

            {/* Wizard */}
            {currentView === "wizard" && (authUser || user) && (
              <motion.div
                key="wizard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {isGenerating ? (
                  <GeneratingPage />
                ) : (
                  <AIFirstWizard
                    onComplete={handleWizardComplete}
                    onCancel={plans.length > 0 ? () => setCurrentView("daily") : undefined}
                    authUser={authUser || { email: user!.email, name: user!.name || "", phone: user!.phoneNumber, isNewUser: false }}
                  />
                )}
              </motion.div>
            )}

            {/* Daily View (Main Focus) */}
            {currentView === "daily" && plan && !showDashboard && !showCurriculum && (
              <motion.div
                key="daily"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DailyFocusView
                  currentDate={currentDate}
                  dayPlan={todaysPlan}
                  completedTasks={completedTaskIds}
                  totalPoints={totalPoints}
                  currentStreak={currentStreak}
                  onCompleteTask={handleCompleteTask}
                  onDateChange={handleDateChange}
                  onLogout={handleLogout}
                  onViewChange={(view) => {
                    if (view === "weekly" || view === "monthly" || view === "quarterly") {
                      setCurrentDate(getTodayDate());
                      setDashboardViewMode(view);
                      setShowDashboard(true);
                    } else if (view === "curriculum") {
                      setShowCurriculum(true);
                    }
                  }}
                />
              </motion.div>
            )}

            {/* Dashboard View */}
            {currentView === "daily" && plan && showDashboard && !showCurriculum && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DashboardView
                  plan={plan}
                  completedTasks={completedTasks}
                  totalPoints={totalPoints}
                  currentStreak={currentStreak}
                  longestStreak={longestStreak}
                  onBack={() => {
                    setShowDashboard(false);
                    setDashboardViewMode("overview");
                  }}
                  viewMode={dashboardViewMode}
                />
              </motion.div>
            )}

            {/* Full Year Curriculum View */}
            {currentView === "daily" && plan && showCurriculum && (
              <motion.div
                key="curriculum"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <FullYearPlanView
                  plan={plan}
                  completedTasks={completedTasks}
                  onBack={() => setShowCurriculum(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Generating Page with Timer and Motivational Messages
function GeneratingPage() {
  const [seconds, setSeconds] = React.useState(0);
  const [messageIndex, setMessageIndex] = React.useState(0);

  const messages = [
    { text: "Analyzing your goals...", emoji: "🎯" },
    { text: "Mapping your calendar...", emoji: "📅" },
    { text: "Creating personalized daily tasks...", emoji: "✨" },
    { text: "Building recovery weeks...", emoji: "🧘" },
    { text: "Setting up milestones...", emoji: "🏆" },
    { text: "Finding learning resources...", emoji: "📚" },
    { text: "Optimizing your learning path...", emoji: "🚀" },
    { text: "Adding practice exercises...", emoji: "📝" },
    { text: "Almost there...", emoji: "🎉" },
  ];

  const tips = [
    "Did you know? Consistency beats intensity every time.",
    "The best time to start was yesterday. The next best time is now.",
    "Small daily improvements lead to stunning results.",
    "Your future self will thank you for starting today.",
    "Progress, not perfection, is what matters.",
  ];

  React.useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(i => (i + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center max-w-lg"
      >
        {/* Animated Logo */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-4 border-teal-500/20 border-t-teal-500"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 rounded-full border-4 border-emerald-500/20 border-b-emerald-500"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className="text-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🎯
            </motion.span>
          </div>
        </div>

        {/* Timer */}
        <div className="mb-6">
          <span className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            {formatTime(seconds)}
          </span>
        </div>

        <h2 className="text-2xl font-semibold text-white mb-2">Crafting Your Journey</h2>

        {/* Current Step */}
        <motion.div
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          <span className="text-2xl">{messages[messageIndex].emoji}</span>
          <span className="text-gray-400">{messages[messageIndex].text}</span>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-8">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min((seconds / 30) * 100, 95)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="p-4 bg-white/5 rounded-xl border border-white/10"
        >
          <p className="text-xs text-gray-500 mb-1">Pro Tip</p>
          <p className="text-sm text-gray-300">
            {tips[Math.floor(seconds / 10) % tips.length]}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="mt-8 grid grid-cols-4 gap-2">
          {["Goals", "Calendar", "Tasks", "Done"].map((step, idx) => (
            <div key={step} className="text-center">
              <motion.div
                className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center ${
                  seconds > idx * 8 ? "bg-teal-500" : "bg-white/10"
                }`}
                animate={seconds > idx * 8 ? { scale: [1, 1.1, 1] } : {}}
              >
                {seconds > idx * 8 ? (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-gray-500 text-xs">{idx + 1}</span>
                )}
              </motion.div>
              <span className={`text-xs ${seconds > idx * 8 ? "text-teal-400" : "text-gray-500"}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
