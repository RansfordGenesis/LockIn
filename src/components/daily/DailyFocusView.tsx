"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import type { DayPlan, Task } from "@/types/plan";
import QuizModal from "@/components/quiz/QuizModal";
import LeetCodeModal, { type LeetCodeCompletionDetails } from "@/components/leetcode/LeetCodeModal";
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
  const { checkIn, checkStreakReset, longestStreak, addQuizAttempt, addLeetCodeSubmission, plan } = useAppStore();

  const date = parseISO(currentDate);
  const isCurrentDay = isToday(date);

  // Get the user's preferred LeetCode language from plan settings
  const planWithLeetCode = plan as { includeLeetCode?: boolean; leetCodeLanguage?: string } | null;
  const leetCodeLanguage = planWithLeetCode?.includeLeetCode ? planWithLeetCode.leetCodeLanguage || "python" : "python";

  // Check streak reset on mount
  useEffect(() => {
    checkStreakReset();
  }, [checkStreakReset]);

  const navigateDate = (direction: "prev" | "next") => {
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
      <header className="sticky top-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Date Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateDate("prev")}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center">
                <h1 className="text-xl font-bold text-white">
                  {isCurrentDay ? "Today" : format(date, "EEEE")}
                </h1>
                <p className="text-sm text-gray-400">{format(date, "MMMM d, yyyy")}</p>
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

            {/* View Switchers */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewChange("curriculum")}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-400 hover:from-teal-500/30 hover:to-emerald-500/30 rounded-lg transition-colors border border-teal-500/30"
              >
                📚 Full Plan
              </button>
              {(["weekly", "monthly", "quarterly"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => onViewChange(view)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors capitalize"
                >
                  {view}
                </button>
              ))}
              <button
                onClick={onLogout}
                className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-2xl p-4 border border-teal-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-500/30 flex items-center justify-center">
                <span className="text-xl">🔥</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{currentStreak}</p>
                <p className="text-xs text-teal-400">Day Streak</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                <span className="text-xl">⭐</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalPoints}</p>
                <p className="text-xs text-purple-400">Total Points</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-4 border border-blue-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">+{pointsToday}</p>
                <p className="text-xs text-blue-400">Today</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
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

                return (
                  <motion.div
                    key={task.taskId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-2xl border transition-all ${
                      isCompleted
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    } ${!isCompleted && isLeetCodeTask(task) ? "cursor-pointer hover:bg-white/10" : ""}`}
                    onClick={() => {
                      // Make the entire card clickable for LeetCode tasks
                      if (!isCompleted && isLeetCodeTask(task)) {
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
                        disabled={isCompleted}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          isCompleted
                            ? "bg-green-500 border-green-500 cursor-default"
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
                        className={`flex-1 min-w-0 text-left ${!isCompleted && isLeetCodeTask(task) ? "cursor-pointer" : ""}`}
                        onClick={(e) => {
                          if (!isCompleted && isLeetCodeTask(task)) {
                            e.stopPropagation();
                            handleTaskClick(task);
                          }
                        }}
                        disabled={isCompleted || !isLeetCodeTask(task)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                            {typeStyle.icon} {task.type}
                          </span>
                          <span className="text-xs text-gray-500">{task.estimatedMinutes} min</span>
                          {isLeetCodeTask(task) && !isCompleted && (
                            <span className="text-xs text-teal-400 ml-auto">Click to open →</span>
                          )}
                        </div>
                        <h4 className={`font-medium ${isCompleted ? "text-gray-500 line-through" : "text-white"}`}>
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

                            {task.resources && task.resources.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-500">Resources</p>
                                {task.resources.map((resource) => (
                                  <a
                                    key={resource.url}
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                  >
                                    <span className="text-sm">
                                      {resource.type === "video" && "🎥"}
                                      {resource.type === "article" && "📄"}
                                      {resource.type === "exercise" && "💻"}
                                      {resource.type === "project" && "🚀"}
                                      {resource.type === "documentation" && "📖"}
                                    </span>
                                    <span className="text-sm text-teal-400">{resource.title}</span>
                                  </a>
                                ))}
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
                <p className="text-xl font-bold text-amber-400">{longestStreak} days</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Current</p>
              <p className="text-xl font-bold text-teal-400">{currentStreak} days</p>
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
          onComplete={handleLeetCodeComplete}
          onClose={() => setLeetCodeTask(null)}
        />
      )}
    </div>
  );
}
