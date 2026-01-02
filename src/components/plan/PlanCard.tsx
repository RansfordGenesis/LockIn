"use client";

import { motion } from "framer-motion";
import { PlanSummary } from "@/types/multiplan";

interface PlanCardProps {
  plan: PlanSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function PlanCard({
  plan,
  isActive,
  onSelect,
  onDelete,
  compact = false,
}: PlanCardProps) {
  if (compact) {
    return (
      <div
        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
          isActive
            ? "bg-teal-500/20 border border-teal-500/50"
            : "bg-white/5 hover:bg-white/10 border border-transparent"
        }`}
      >
        <button
          onClick={onSelect}
          className="flex-1 flex items-center gap-3 text-left min-w-0 overflow-hidden"
        >
          <span className="text-2xl flex-shrink-0">{plan.planIcon || "📋"}</span>
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-medium text-white truncate text-sm">
              {plan.planTitle || "Untitled Plan"}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${plan.progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {plan.progressPercent}%
              </span>
            </div>
          </div>
          {isActive && (
            <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
          )}
        </button>
        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
            title="Delete plan"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className={`relative p-4 rounded-xl transition-all ${
        isActive
          ? "bg-teal-500/20 border-2 border-teal-500"
          : "bg-white/5 hover:bg-white/10 border-2 border-transparent"
      }`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
          title="Delete plan"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}

      <button onClick={onSelect} className="w-full text-left">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{plan.planIcon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">
              {plan.planTitle}
            </h3>
            <p className="text-sm text-gray-400 line-clamp-2 mt-1">
              {plan.planDescription}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{plan.progressPercent}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${plan.progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-sm font-semibold text-white">
              {plan.currentStreak}
            </div>
            <div className="text-xs text-gray-400">Streak</div>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-sm font-semibold text-white">
              {plan.earnedPoints}
            </div>
            <div className="text-xs text-gray-400">Points</div>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-sm font-semibold text-white">
              {plan.completedTasksCount}/{plan.totalTasks}
            </div>
            <div className="text-xs text-gray-400">Tasks</div>
          </div>
        </div>
      </button>

      {isActive && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-teal-500 text-white text-xs font-medium rounded-full">
          Active
        </div>
      )}
    </motion.div>
  );
}
