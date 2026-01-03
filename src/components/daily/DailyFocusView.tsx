"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { ExternalLink, BookOpen } from "lucide-react";
import type { DayPlan, Task } from "@/types/plan";
import QuizModal from "@/components/quiz/QuizModal";
import LeetCodeModal, { type LeetCodeCompletionDetails } from "@/components/leetcode/LeetCodeModal";
import ResourcesModal from "@/components/resources/ResourcesModal";
import { useAppStore } from "@/store/useAppStore";

interface DailyFocusViewProps {
  currentDate: string;
  dayPlan: DayPlan | null;
  completedTasks: Set<string>;
  totalPoints: number;
  currentStreak: number;
  onCompleteTask: (taskId: string, points: number, quizScore?: number) => void;
  onDateChange: (date: string) => void;
  onViewChange: (view: "weekly" | "monthly" | "quarterly" | "curriculum") => void;
  onLogout: () => void;
}

const TASK_TYPE_COLORS = {
  learn: { bg: "bg-blue-500/20", text: "text-blue-400", icon: "📚" },
  practice: { bg: "bg-purple-500/20", text: "text-purple-400", icon: "💪" },
  build: { bg: "bg-orange-500/20", text: "text-orange-400", icon: "🔨" },
  review: { bg: "bg-green-500/20", text: "text-green-400", icon: "🔄" },
  quiz: { bg: "bg-pink-500/20", text: "text-pink-400", icon: "❓" },
};

export default function DailyFocusView({
  currentDate,
  dayPlan,
  completedTasks,
  totalPoints,
  currentStreak,
  onCompleteTask,
  onDateChange,
  onViewChange,
  onLogout,
}: Readonly<DailyFocusViewProps>) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [quizTask, setQuizTask] = useState<Task | null>(null);
  const [leetCodeTask, setLeetCodeTask] = useState<Task | null>(null);
  const [resourcesTask, setResourcesTask] = useState<Task | null>(null);
  const { checkIn, checkStreakReset, longestStreak, addQuizAttempt, addLeetCodeSubmission, plan } = useAppStore();

  const date = parseISO(currentDate);
  const isCurrentDay = isToday(date);
  const isFutureDay = date > new Date();
  const canCompleteTasks = !isFutureDay; // Can complete today and past days, not future

  // Get plan start date to restrict backward navigation
  const planStartDate = plan?.startDate ? parseISO(plan.startDate) : null;
  const canGoBack = planStartDate ? date > planStartDate : true;

  // Get the user's preferred LeetCode language from plan settings
  const planWithLeetCode = plan as { includeLeetCode?: boolean; leetCodeLanguage?: string } | null;
  const leetCodeLanguage = planWithLeetCode?.includeLeetCode ? planWithLeetCode.leetCodeLanguage || "python" : "python";

  // Check streak reset on mount
  useEffect(() => {
    checkStreakReset();
  }, [checkStreakReset]);

  const navigateDate = (direction: "prev" | "next") => {
    if (direction === "prev" && !canGoBack) return; // Don't go before plan start date
    const newDate = direction === "prev" ? subDays(date, 1) : addDays(date, 1);
    onDateChange(format(newDate, "yyyy-MM-dd"));
  };

  // Check if a task is a LeetCode challenge
  const isLeetCodeTask = (task: Task): boolean => {
    return task.title.toLowerCase().includes("leetcode") ||
           task.taskId.includes("-lc") ||
           task.description.toLowerCase().includes("leetcode.com");
  };

  const handleTaskClick = (task: Task) => {
    if (completedTasks.has(task.taskId)) return;
    
    // Only allow completing tasks for today and past days (not future)
    if (!canCompleteTasks) return;

    // Check if it's a LeetCode task
    if (isLeetCodeTask(task)) {
      setLeetCodeTask(task);
    } else {
      // Open regular quiz modal
      setQuizTask(task);
    }
  };

  const handleQuizComplete = (passed: boolean, score: number) => {
    if (!quizTask) return;

    // Record quiz attempt
    addQuizAttempt({
      taskId: quizTask.taskId,
      date: currentDate,
      answers: [],
      score,
      passed,
      attemptedAt: new Date().toISOString(),
    });

    if (passed) {
      // Complete the task and check in
      onCompleteTask(quizTask.taskId, quizTask.points, score);
      checkIn();
    }

    setQuizTask(null);
  };

  const handleLeetCodeComplete = (passed: boolean, points: number, details: LeetCodeCompletionDetails) => {
    if (!leetCodeTask) return;

    // Record LeetCode submission (without the code - only metadata)
    addLeetCodeSubmission({
      taskId: leetCodeTask.taskId,
      date: currentDate,
      problemSlug: details.problemSlug,
      problemTitle: details.problemTitle,
      difficulty: details.difficulty,
      language: leetCodeLanguage,
      timeComplexity: details.timeComplexity,
      spaceComplexity: details.spaceComplexity,
      isTimeCorrect: details.isTimeCorrect,
      isSpaceCorrect: details.isSpaceCorrect,
      codeScore: details.codeScore,
      passed,
      pointsEarned: points,
      submittedAt: new Date().toISOString(),
    });

    if (passed) {
      // Complete the task and check in - this saves points to DB
      onCompleteTask(leetCodeTask.taskId, points);
      checkIn();
    }

    setLeetCodeTask(null);
  };

  const completedCount = dayPlan?.tasks.filter((t) => completedTasks.has(t.taskId)).length || 0;
  const totalCount = dayPlan?.tasks.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const pointsToday = dayPlan?.tasks
    .filter((t) => completedTasks.has(t.taskId))
    .reduce((sum, t) => sum + t.points, 0) || 0;

  // Helper functions for day type display
  const getDayTypeLabel = (plan: DayPlan) => {
    if (plan.isRecoveryDay) return "Recovery Day";
    if (plan.isFlexDay) return "Flex Day";
    return "Focus Day";
  };

  const getDayDescription = (plan: DayPlan) => {
    if (plan.isRecoveryDay) return "Light review and rest. Consolidate what you've learned.";
    if (plan.isFlexDay) return "Catch up on any missed tasks or explore something new.";
    return `${plan.estimatedMinutes} minutes of focused learning`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 md:py-4">
          {/* Mobile: Stack layout, Desktop: Flex row */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Date Navigation */}
            <div className="flex items-center justify-center gap-2 md:gap-4">
              <button
                onClick={() => navigateDate("prev")}
                disabled={!canGoBack}
                className={`p-2 rounded-lg transition-colors ${
                  canGoBack
                    ? "hover:bg-white/10"
                    : "opacity-30 cursor-not-allowed"
                }`}
                title={!canGoBack ? "This is the start of your plan" : undefined}
              >
                <svg className={`w-5 h-5 ${canGoBack ? "text-gray-400" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center min-w-[120px]">
                <h1 className="text-lg md:text-xl font-bold text-white">
                  {isCurrentDay ? "Today" : format(date, "EEEE")}
                </h1>
                <p className="text-xs md:text-sm text-gray-400">{format(date, "MMMM d, yyyy")}</p>
              </div>
              
              <button
                onClick={() => navigateDate("next")}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* View Switchers - Scrollable on mobile */}
            <div className="flex items-center justify-center gap-1 md:gap-2 overflow-x-auto scrollbar-hide pb-1 md:pb-0">
              <button
                onClick={() => onViewChange("curriculum")}
                className="flex-shrink-0 px-2 md:px-3 py-1.5 text-xs md:text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                📚 Full Plan
              </button>
              {(["weekly", "monthly"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => onViewChange(view)}
                  className="flex-shrink-0 px-2 md:px-3 py-1.5 text-xs md:text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors capitalize"
                >
                  {view}
                </button>
              ))}
              {/* Hide logout on mobile since it's in the dropdown */}
              <button
                onClick={onLogout}
                className="hidden md:block flex-shrink-0 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-xl md:rounded-2xl p-2 md:p-4 border border-teal-500/20"
          >
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-center md:text-left">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-teal-500/30 flex items-center justify-center">
                <span className="text-lg md:text-xl">🔥</span>
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold text-white">{currentStreak}</p>
                <p className="text-[10px] md:text-xs text-teal-400">Day Streak</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl md:rounded-2xl p-2 md:p-4 border border-purple-500/20"
          >
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-center md:text-left">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                <span className="text-lg md:text-xl">⭐</span>
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold text-white">{totalPoints}</p>
                <p className="text-[10px] md:text-xs text-purple-400">Total Points</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl md:rounded-2xl p-2 md:p-4 border border-blue-500/20"
          >
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-center md:text-left">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/30 flex items-center justify-center">
                <span className="text-lg md:text-xl">✨</span>
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold text-white">+{pointsToday}</p>
                <p className="text-[10px] md:text-xs text-blue-400">Today</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Today&apos;s Progress</span>
            <span className="text-sm font-medium text-white">
              {completedCount}/{totalCount} tasks
            </span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                progress === 100
                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                  : "bg-gradient-to-r from-teal-500 to-cyan-500"
              }`}
            />
          </div>
        </div>

        {/* Day Theme */}
        {dayPlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  {getDayTypeLabel(dayPlan)}
                </h2>
                <p className="text-gray-400">
                  {getDayDescription(dayPlan)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Future Day Notice */}
        {isFutureDay && dayPlan && dayPlan.tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📅</span>
              <div>
                <p className="text-amber-400 font-medium">Viewing {format(date, "MMMM d")}</p>
                <p className="text-sm text-amber-400/70">This is a future day. Come back on this day to complete tasks!</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tasks */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tasks</h3>
          
          {!dayPlan || dayPlan.tasks.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-gray-400">No tasks scheduled for this day</p>
            </div>
          ) : (
            <AnimatePresence>
              {dayPlan.tasks.map((task, index) => {
                const isCompleted = completedTasks.has(task.taskId);
                const isExpanded = expandedTask === task.taskId;
                const typeStyle = TASK_TYPE_COLORS[task.type] || TASK_TYPE_COLORS.learn;
                const canComplete = canCompleteTasks && !isCompleted;

                return (
                  <motion.div
                    key={task.taskId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-2xl border transition-all ${
                      isCompleted
                        ? "bg-green-500/10 border-green-500/30"
                        : isFutureDay
                        ? "bg-white/5 border-white/10 opacity-60"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    } ${canComplete && isLeetCodeTask(task) ? "cursor-pointer hover:bg-white/10" : ""}`}
                    onClick={() => {
                      // Make the entire card clickable for LeetCode tasks
                      if (canComplete && isLeetCodeTask(task)) {
                        handleTaskClick(task);
                      }
                    }}
                  >
                    {/* Task Header */}
                    <div className="p-4 flex items-center gap-4">
                      {/* Checkbox - triggers quiz/leetcode */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent double trigger
                          handleTaskClick(task);
                        }}
                        disabled={isCompleted || isFutureDay}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          isCompleted
                            ? "bg-green-500 border-green-500 cursor-default"
                            : isFutureDay
                            ? "border-gray-600 cursor-not-allowed opacity-50"
                            : "border-white/30 hover:border-teal-500 hover:bg-teal-500/20"
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>

                      {/* Task Info - clickable area for LeetCode tasks */}
                      <button 
                        type="button"
                        className={`flex-1 min-w-0 text-left ${canComplete && isLeetCodeTask(task) ? "cursor-pointer" : ""}`}
                        onClick={(e) => {
                          if (canComplete && isLeetCodeTask(task)) {
                            e.stopPropagation();
                            handleTaskClick(task);
                          }
                        }}
                        disabled={isCompleted || isFutureDay || !isLeetCodeTask(task)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                            {typeStyle.icon} {task.type}
                          </span>
                          <span className="text-xs text-gray-500">{task.estimatedMinutes} min</span>
                          {isLeetCodeTask(task) && canComplete && (
                            <span className="text-xs text-teal-400 ml-auto">Click to open →</span>
                          )}
                          {isFutureDay && !isCompleted && (
                            <span className="text-xs text-gray-500 ml-auto">Future task</span>
                          )}
                        </div>
                        <h4 className={`font-medium ${isCompleted ? "text-gray-500 line-through" : isFutureDay ? "text-gray-400" : "text-white"}`}>
                          {task.title}
                        </h4>
                      </button>

                      {/* Points */}
                      <div className={`text-right ${isCompleted ? "text-green-500" : "text-gray-400"}`}>
                        <span className="text-lg font-bold">+{task.points}</span>
                        <span className="text-xs block">pts</span>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedTask(isExpanded ? null : task.taskId);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <motion.svg
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                      </button>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-white/10">
                            <p className="text-gray-400 mt-4 mb-4">{task.description}</p>

                            {/* Get Resources Button - Not shown for LeetCode tasks */}
                            {!isLeetCodeTask(task) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setResourcesTask(task);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-400 rounded-xl transition-all duration-200 border border-teal-500/30 mb-4 group"
                              >
                                <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Get Learning Resources</span>
                                <span className="text-xs text-teal-500 ml-auto">AI-powered</span>
                              </button>
                            )}

                            {task.resources && task.resources.length > 0 && (
                              <div className="space-y-3 mt-4">
                                <p className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                                  <span aria-hidden="true">📚</span>
                                  <span>Learning Resources</span>
                                </p>
                                <div className="grid gap-2">
                                  {task.resources.map((resource) => {
                                    // Icon and color mapping for each resource type
                                    const resourceStyles: Record<string, { icon: string; color: string; bg: string }> = {
                                      documentation: { icon: "📖", color: "text-blue-400", bg: "bg-blue-500/10 hover:bg-blue-500/20" },
                                      video: { icon: "🎥", color: "text-red-400", bg: "bg-red-500/10 hover:bg-red-500/20" },
                                      course: { icon: "🎓", color: "text-purple-400", bg: "bg-purple-500/10 hover:bg-purple-500/20" },
                                      article: { icon: "📄", color: "text-green-400", bg: "bg-green-500/10 hover:bg-green-500/20" },
                                      tutorial: { icon: "📝", color: "text-yellow-400", bg: "bg-yellow-500/10 hover:bg-yellow-500/20" },
                                      exercise: { icon: "💪", color: "text-orange-400", bg: "bg-orange-500/10 hover:bg-orange-500/20" },
                                      book: { icon: "📚", color: "text-indigo-400", bg: "bg-indigo-500/10 hover:bg-indigo-500/20" },
                                      podcast: { icon: "🎙️", color: "text-pink-400", bg: "bg-pink-500/10 hover:bg-pink-500/20" },
                                      tool: { icon: "🔧", color: "text-cyan-400", bg: "bg-cyan-500/10 hover:bg-cyan-500/20" },
                                      project: { icon: "🚀", color: "text-teal-400", bg: "bg-teal-500/10 hover:bg-teal-500/20" },
                                    };
                                    
                                    const style = resourceStyles[resource.type] || resourceStyles.article;
                                    
                                    // Helper for difficulty color
                                    const getDifficultyColor = (diff: string): string => {
                                      if (diff === "beginner") return "text-green-400";
                                      if (diff === "intermediate") return "text-yellow-400";
                                      return "text-red-400";
                                    };
                                    
                                    return (
                                      <a
                                        key={resource.url}
                                        href={resource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-start gap-3 p-3 rounded-xl ${style.bg} transition-all duration-200 border border-white/5 group`}
                                      >
                                        <span className="text-xl mt-0.5">{style.icon}</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-sm font-medium ${style.color} group-hover:underline`}>
                                              {resource.title}
                                            </span>
                                            {resource.source && (
                                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                                                {resource.source}
                                              </span>
                                            )}
                                            {resource.isFree && (
                                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                                Free
                                              </span>
                                            )}
                                          </div>
                                          {resource.description && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                              {resource.description}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                            {resource.estimatedMinutes && (
                                              <span>⏱️ {resource.estimatedMinutes} min</span>
                                            )}
                                            {resource.difficulty && (
                                              <span className={getDifficultyColor(resource.difficulty)}>
                                                {resource.difficulty.charAt(0).toUpperCase() + resource.difficulty.slice(1)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-gray-300 flex-shrink-0 mt-1" />
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-4">
                                {task.tags.map((tag) => (
                                  <span key={tag} className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Completion Celebration */}
        {progress === 100 && dayPlan && dayPlan.tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-500/30 text-center"
          >
            <span className="text-5xl mb-4 block">🎉</span>
            <h3 className="text-2xl font-bold text-white mb-2">Day Complete!</h3>
            <p className="text-gray-400">
              You earned <span className="text-green-400 font-bold">{pointsToday} points</span> today.
              Keep the streak going!
            </p>
          </motion.div>
        )}

        {/* Streak Stats */}
        <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-sm text-gray-400">Longest Streak</p>
                <p className="text-xl font-bold text-amber-400">{longestStreak} {longestStreak === 1 ? "day" : "days"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Current</p>
              <p className="text-xl font-bold text-teal-400">{currentStreak} {currentStreak === 1 ? "day" : "days"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Modal */}
      {quizTask && (
        <QuizModal
          task={quizTask}
          onComplete={handleQuizComplete}
          onClose={() => setQuizTask(null)}
        />
      )}

      {/* LeetCode Modal */}
      {leetCodeTask && (
        <LeetCodeModal
          task={leetCodeTask}
          language={leetCodeLanguage}
          currentDate={currentDate}
          onComplete={handleLeetCodeComplete}
          onClose={() => setLeetCodeTask(null)}
        />
      )}

      {/* Resources Modal */}
      {resourcesTask && (
        <ResourcesModal
          task={resourcesTask}
          category={(plan as { category?: string } | null)?.category || "general"}
          onClose={() => setResourcesTask(null)}
        />
      )}
    </div>
  );
}
