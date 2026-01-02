"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, getWeek, getQuarter, parseISO, isWithinInterval, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import { 
  Lock, TrendingUp, Calendar, CheckCircle, Award, 
  Flame, BookOpen, Clock, ArrowLeft, ChevronLeft, ChevronRight, Circle
} from "lucide-react";
import type { Plan, DayPlan } from "@/types/plan";

interface CompletedTaskInfo {
  points: number;
  completedAt: string;
  quizScore?: number;
}

// New plan format with flat dailyTasks array
interface DailyTask {
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
}

interface NewPlanFormat {
  planId: string;
  planTitle?: string;
  planDescription?: string;
  dailyTasks: DailyTask[];
}

interface DashboardViewProps {
  plan: Plan | NewPlanFormat;
  completedTasks: Record<string, boolean | CompletedTaskInfo>;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  onBack: () => void;
  viewMode?: "overview" | "weekly" | "monthly" | "quarterly";
}

// Type guard
function isNewPlanFormat(plan: Plan | NewPlanFormat): plan is NewPlanFormat {
  return "dailyTasks" in plan && Array.isArray(plan.dailyTasks);
}

export default function DashboardView({
  plan,
  completedTasks,
  totalPoints,
  currentStreak,
  longestStreak,
  onBack,
  viewMode = "overview",
}: Readonly<DashboardViewProps>) {
  // State for period navigation (offset from current period)
  const [periodOffset, setPeriodOffset] = useState(0);
  
  // Memoize today's date to prevent dependency changes
  const today = useMemo(() => new Date(), []);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Check if this is the new plan format
  const isNewFormat = isNewPlanFormat(plan);

  // Get period info based on viewMode and offset
  const periodInfo = useMemo(() => {
    const baseDate = new Date(today);
    
    if (viewMode === "weekly") {
      // Adjust by weeks
      baseDate.setDate(baseDate.getDate() + (periodOffset * 7));
      const start = startOfWeek(baseDate, { weekStartsOn: 1 });
      const end = endOfWeek(baseDate, { weekStartsOn: 1 });
      const weekNum = getWeek(baseDate, { weekStartsOn: 1 });
      return {
        label: `Week ${weekNum}`,
        sublabel: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
        start,
        end,
        type: "weekly" as const,
      };
    }
    
    if (viewMode === "monthly") {
      // Adjust by months
      baseDate.setMonth(baseDate.getMonth() + periodOffset);
      const start = startOfMonth(baseDate);
      const end = endOfMonth(baseDate);
      return {
        label: format(baseDate, "MMMM yyyy"),
        sublabel: `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
        start,
        end,
        type: "monthly" as const,
      };
    }
    
    if (viewMode === "quarterly") {
      // Adjust by quarters (3 months)
      baseDate.setMonth(baseDate.getMonth() + (periodOffset * 3));
      const q = getQuarter(baseDate);
      const start = startOfQuarter(baseDate);
      const end = endOfQuarter(baseDate);
      return {
        label: `Q${q} ${format(baseDate, "yyyy")}`,
        sublabel: `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
        start,
        end,
        type: "quarterly" as const,
      };
    }
    
    return null;
  }, [viewMode, periodOffset, today]);

  // Filter tasks for the selected period
  const periodTasks = useMemo(() => {
    if (!isNewFormat || !periodInfo) return [];
    
    return plan.dailyTasks.filter(task => {
      const taskDate = parseISO(task.date);
      return isWithinInterval(taskDate, { start: periodInfo.start, end: periodInfo.end });
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [isNewFormat, plan, periodInfo]);

  // Group tasks by date for period view
  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, DailyTask[]>();
    for (const task of periodTasks) {
      if (!grouped.has(task.date)) {
        grouped.set(task.date, []);
      }
      grouped.get(task.date)!.push(task);
    }
    return grouped;
  }, [periodTasks]);

  // Period stats
  const periodStats = useMemo(() => {
    const total = periodTasks.length;
    const completed = periodTasks.filter(t => completedTasks[t.taskId]).length;
    const totalMinutes = periodTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
    const completedMinutes = periodTasks
      .filter(t => completedTasks[t.taskId])
      .reduce((sum, t) => sum + t.estimatedMinutes, 0);
    const totalPoints = periodTasks.reduce((sum, t) => sum + t.points, 0);
    const earnedPoints = periodTasks
      .filter(t => completedTasks[t.taskId])
      .reduce((sum, t) => sum + t.points, 0);
    
    return {
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalMinutes,
      completedMinutes,
      totalPoints,
      earnedPoints,
    };
  }, [periodTasks, completedTasks]);

  // Helper function for progress bar colors
  const getProgressColor = (percent: number) => {
    if (percent === 100) return "bg-green-500";
    if (percent > 0) return "bg-teal-500";
    return "bg-white/20";
  };

  // Get period label for navigation
  const getPeriodLabel = (mode: "weekly" | "monthly" | "quarterly") => {
    if (mode === "weekly") return "Week";
    if (mode === "monthly") return "Month";
    return "Quarter";
  };

  // Get task type styling
  const getTaskTypeStyle = (type: string) => {
    if (type === "learn") return "bg-blue-500/20 text-blue-400";
    if (type === "practice") return "bg-purple-500/20 text-purple-400";
    if (type === "build") return "bg-orange-500/20 text-orange-400";
    return "bg-green-500/20 text-green-400";
  };

  // Helper: Process new format stats
  const processNewFormatStats = (
    tasks: DailyTask[],
    completed: Record<string, boolean | CompletedTaskInfo>
  ) => {
    let totalTasks = 0;
    let completedCount = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;
    const dayStats: Map<string, { total: number; completed: number }> = new Map();
    const tasksByDate = new Map<string, DailyTask[]>();
    
    for (const task of tasks) {
      if (!tasksByDate.has(task.date)) {
        tasksByDate.set(task.date, []);
      }
      tasksByDate.get(task.date)!.push(task);
      
      totalTasks++;
      totalMinutes += task.estimatedMinutes || 0;
      
      if (completed[task.taskId]) {
        completedCount++;
        completedMinutes += task.estimatedMinutes || 0;
      }
    }
    
    for (const [dateKey, tasks] of tasksByDate) {
      const completedInDay = tasks.filter(t => completed[t.taskId]).length;
      dayStats.set(dateKey, { total: tasks.length, completed: completedInDay });
    }
    
    return { totalTasks, completedCount, totalMinutes, completedMinutes, dayStats };
  };

  // Helper: Process a single day's stats
  interface DayWithTasks {
    tasks: Array<{ taskId: string; estimatedMinutes?: number }>;
  }
  const processDayStats = (day: DayWithTasks, completed: Record<string, boolean | CompletedTaskInfo>) => {
    let dayTotal = 0;
    let dayCompleted = 0;
    let dayMinutes = 0;
    let dayCompletedMinutes = 0;

    for (const task of day.tasks) {
      dayTotal++;
      dayMinutes += task.estimatedMinutes || 0;
      
      if (completed[task.taskId]) {
        dayCompleted++;
        dayCompletedMinutes += task.estimatedMinutes || 0;
      }
    }

    return { dayTotal, dayCompleted, dayMinutes, dayCompletedMinutes };
  };

  // Helper: Process old format stats
  const processOldFormatStats = (
    quarters: Plan["quarters"],
    completed: Record<string, boolean | CompletedTaskInfo>
  ) => {
    let totalTasks = 0;
    let completedCount = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;
    const dayStats: Map<string, { total: number; completed: number }> = new Map();
    
    if (!quarters) return { totalTasks, completedCount, totalMinutes, completedMinutes, dayStats };
    
    for (const quarter of quarters) {
      for (const month of quarter.months) {
        for (const week of month.weeks) {
          for (const day of week.days) {
            const stats = processDayStats(day, completed);
            
            totalTasks += stats.dayTotal;
            completedCount += stats.dayCompleted;
            totalMinutes += stats.dayMinutes;
            completedMinutes += stats.dayCompletedMinutes;
            
            dayStats.set(day.date, { total: stats.dayTotal, completed: stats.dayCompleted });
          }
        }
      }
    }
    
    return { totalTasks, completedCount, totalMinutes, completedMinutes, dayStats };
  };

  // Calculate various stats (supports both formats)
  const stats = useMemo(() => {
    const result = isNewFormat
      ? processNewFormatStats(plan.dailyTasks, completedTasks)
      : processOldFormatStats(plan.quarters, completedTasks);

    return {
      ...result,
      completedPercent: result.totalTasks > 0 
        ? Math.round((result.completedCount / result.totalTasks) * 100) 
        : 0,
      totalHours: Math.round(result.totalMinutes / 60),
      completedHours: Math.round(result.completedMinutes / 60),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, completedTasks, isNewFormat]);


  // This week's stats
  const weekStats = useMemo(() => {
    let weekTotal = 0;
    let weekCompleted = 0;

    weekDays.forEach((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const stat = stats.dayStats.get(dateKey);
      if (stat) {
        weekTotal += stat.total;
        weekCompleted += stat.completed;
      }
    });

    return {
      total: weekTotal,
      completed: weekCompleted,
      percent: weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0,
    };
  }, [weekDays, stats.dayStats]);

  // Get today's plan (supports both formats)
  const todayPlan = useMemo((): DayPlan | null => {
    const todayStr = format(today, "yyyy-MM-dd");
    
    if (isNewFormat) {
      // NEW FORMAT: flat dailyTasks array
      const todaysTasks = plan.dailyTasks.filter(t => t.date === todayStr);
      
      if (todaysTasks.length === 0) return null;
      
      return {
        id: todayStr,
        date: todayStr,
        dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
        isWorkDay: true,
        isFlexDay: false,
        isRecoveryDay: false,
        tasks: todaysTasks.map(t => ({
          taskId: t.taskId,
          dayId: todayStr,
          title: t.title,
          description: t.description,
          type: t.type as "learn" | "practice" | "build" | "review" | "quiz",
          estimatedMinutes: t.estimatedMinutes,
          points: t.points,
          tags: [],
          quizTopics: [],
        })),
        estimatedMinutes: todaysTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
      };
    }
    
    // OLD FORMAT: nested quarters structure
    if (!plan.quarters) return null;
    
    for (const quarter of plan.quarters) {
      for (const month of quarter.months) {
        for (const week of month.weeks) {
          const day = week.days.find((d) => d.date === todayStr);
          if (day) return day;
        }
      }
    }
    return null;
  }, [plan, today, isNewFormat]);

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0c]/95 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setPeriodOffset(0); // Reset offset when going back
                onBack();
              }}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Daily
            </button>
            
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500">
                <Lock className="w-5 h-5 text-[#0a0a0c]" />
              </div>
              <span className="text-xl font-bold text-white">
                Lock<span className="text-teal-400">In</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Period View (weekly/monthly/quarterly) */}
        {viewMode !== "overview" && periodInfo && (
          <>
            {/* Period Header with Navigation */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setPeriodOffset(periodOffset - 1)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-400" />
                </button>
                
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-white">{periodInfo.label}</h1>
                  <p className="text-gray-400 text-sm">{periodInfo.sublabel}</p>
                </div>
                
                <button
                  onClick={() => setPeriodOffset(periodOffset + 1)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  disabled={periodOffset >= 0}
                >
                  <ChevronRight className={`w-6 h-6 ${periodOffset >= 0 ? "text-gray-600" : "text-gray-400"}`} />
                </button>
              </div>
              
              {periodOffset !== 0 && (
                <button
                  onClick={() => setPeriodOffset(0)}
                  className="mx-auto block text-sm text-teal-400 hover:text-teal-300"
                >
                  Go to Current {getPeriodLabel(viewMode)}
                </button>
              )}
            </div>

            {/* Period Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-white">{periodStats.completed}/{periodStats.total}</p>
                <p className="text-sm text-gray-400">Tasks Completed</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-teal-400">{periodStats.percent}%</p>
                <p className="text-sm text-gray-400">Progress</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-purple-400">{periodStats.earnedPoints}</p>
                <p className="text-sm text-gray-400">Points Earned</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-blue-400">{Math.round(periodStats.completedMinutes / 60)}h</p>
                <p className="text-sm text-gray-400">Time Invested</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${periodStats.percent}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                />
              </div>
            </div>

            {/* Tasks by Date */}
            <div className="space-y-6">
              {Array.from(tasksByDate.entries()).map(([date, tasks]) => {
                const dateObj = parseISO(date);
                const isToday = format(dateObj, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                const dayCompleted = tasks.filter(t => completedTasks[t.taskId]).length;
                const dayTotal = tasks.length;
                
                return (
                  <motion.div
                    key={date}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white/5 rounded-xl border ${isToday ? "border-teal-500/50" : "border-white/10"} overflow-hidden`}
                  >
                    {/* Day Header */}
                    <div className={`px-4 py-3 flex items-center justify-between ${isToday ? "bg-teal-500/10" : "bg-white/5"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${isToday ? "text-teal-400" : "text-white"}`}>
                          {format(dateObj, "EEE, MMM d")}
                        </span>
                        {isToday && (
                          <span className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded-full">Today</span>
                        )}
                      </div>
                      <span className={`text-sm ${dayCompleted === dayTotal ? "text-green-400" : "text-gray-400"}`}>
                        {dayCompleted}/{dayTotal} completed
                      </span>
                    </div>
                    
                    {/* Tasks */}
                    <div className="p-4 space-y-2">
                      {tasks.map((task) => {
                        const isCompleted = !!completedTasks[task.taskId];
                        
                        return (
                          <div
                            key={task.taskId}
                            className={`flex items-center gap-3 p-3 rounded-lg ${
                              isCompleted ? "bg-green-500/10" : "bg-white/5"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${isCompleted ? "text-gray-400 line-through" : "text-white"}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-gray-500 truncate">{task.description}</p>
                              )}
                            </div>
                            
                            <span className={`text-xs px-2 py-1 rounded-full ${getTaskTypeStyle(task.type)}`}>
                              {task.type}
                            </span>
                            
                            <span className="text-xs text-gray-500">
                              {task.estimatedMinutes}m • +{task.points}pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
              
              {periodTasks.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No tasks scheduled for this period</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Overview Mode (original dashboard) */}
        {viewMode === "overview" && (
          <>
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Dashboard</h1>
          <p className="text-gray-400">Track your progress on &quot;{isNewFormat ? (plan.planTitle || "Your Learning Journey") : plan.title}&quot;</p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-2xl p-6 border border-teal-500/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-teal-500/30">
                <Flame className="w-6 h-6 text-teal-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{currentStreak}</p>
            <p className="text-sm text-teal-400">Current Streak</p>
            <p className="text-xs text-gray-500 mt-1">Best: {longestStreak} {longestStreak === 1 ? "day" : "days"}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-purple-500/30">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{totalPoints.toLocaleString()}</p>
            <p className="text-sm text-purple-400">Total Points</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-6 border border-blue-500/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-blue-500/30">
                <CheckCircle className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.completedCount}</p>
            <p className="text-sm text-blue-400">Tasks Completed</p>
            <p className="text-xs text-gray-500 mt-1">of {stats.totalTasks} total</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-2xl p-6 border border-orange-500/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-orange-500/30">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.completedHours}h</p>
            <p className="text-sm text-orange-400">Time Invested</p>
            <p className="text-xs text-gray-500 mt-1">of {stats.totalHours}h planned</p>
          </motion.div>
        </div>

        {/* Progress Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Overall Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-400" />
                Overall Progress
              </h3>
              <span className="text-2xl font-bold text-teal-400">{stats.completedPercent}%</span>
            </div>
            <div className="h-4 bg-white/10 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.completedPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
              />
            </div>
            <p className="text-sm text-gray-400">
              {stats.completedCount} of {stats.totalTasks} tasks • {stats.completedHours} of {stats.totalHours} hours
            </p>
          </motion.div>

          {/* This Week Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white/5 rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                This Week
              </h3>
              <span className="text-2xl font-bold text-blue-400">{weekStats.percent}%</span>
            </div>
            <div className="h-4 bg-white/10 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weekStats.percent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              />
            </div>
            <p className="text-sm text-gray-400">
              {weekStats.completed} of {weekStats.total} tasks this week
            </p>
          </motion.div>
        </div>

        {/* Weekly Calendar View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-8"
        >
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Weekly Overview
          </h3>
          
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const stat = stats.dayStats.get(dateKey);
              const isToday = isSameDay(day, today);
              const isPast = day < today;
              const percent = stat && stat.total > 0 
                ? Math.round((stat.completed / stat.total) * 100) 
                : 0;

              return (
                <div
                  key={dateKey}
                  className={`p-4 rounded-xl text-center transition-all ${
                    isToday 
                      ? "bg-teal-500/20 border-2 border-teal-500/50" 
                      : "bg-white/5 border border-white/10"
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">{format(day, "EEE")}</p>
                  <p className={`text-lg font-bold ${isToday ? "text-teal-400" : "text-white"}`}>
                    {format(day, "d")}
                  </p>
                  {stat && stat.total > 0 ? (
                    <>
                      <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getProgressColor(percent)}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-xs mt-1 text-gray-400">
                        {stat.completed}/{stat.total}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs mt-2 text-gray-600">
                      {isPast ? "No tasks" : "—"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Today's Tasks Summary */}
        {todayPlan && todayPlan.tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white/5 rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Today&apos;s Focus</h3>
            <div className="space-y-3">
              {todayPlan.tasks.map((task) => {
                const isCompleted = completedTasks[task.taskId];
                return (
                  <div
                    key={task.taskId}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      isCompleted ? "bg-green-500/10" : "bg-white/5"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isCompleted ? "bg-green-500" : "border-2 border-gray-500"
                    }`}>
                      {isCompleted && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className={`flex-1 ${isCompleted ? "text-gray-500 line-through" : "text-white"}`}>
                      {task.title}
                    </span>
                    <span className={`text-sm ${isCompleted ? "text-green-400" : "text-gray-500"}`}>
                      +{task.points} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
