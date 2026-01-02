"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlanSummary, MAX_PLANS_PER_USER } from "@/types/multiplan";
import { PlanCard } from "@/components/plan/PlanCard";

interface PlanSidebarProps {
  plans: PlanSummary[];
  activePlanId: string | null;
  onPlanSelect: (planId: string) => void;
  onAddPlan: () => void;
  onDeletePlan: (planId: string) => void;
  userName?: string;
  onLogout: () => void;
}

export function PlanSidebar({
  plans,
  activePlanId,
  onPlanSelect,
  onAddPlan,
  onDeletePlan,
  userName,
  onLogout,
}: PlanSidebarProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const canAddPlan = plans.length < MAX_PLANS_PER_USER;

  const handleDeleteClick = (planId: string) => {
    setDeleteConfirm(planId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDeletePlan(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/50 backdrop-blur-sm border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-teal-400">Lock</span>In
        </h1>
        <p className="text-xs text-gray-400 mt-1">Your learning journey</p>
      </div>

      {/* Plans List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider px-1 mb-2">
          Your Plans ({plans.length}/{MAX_PLANS_PER_USER})
        </div>

        {plans.map((plan) => (
          <PlanCard
            key={plan.planId}
            plan={plan}
            isActive={plan.planId === activePlanId}
            onSelect={() => onPlanSelect(plan.planId)}
            onDelete={() => handleDeleteClick(plan.planId)}
            compact
          />
        ))}

        {/* Add Plan Button */}
        <motion.button
          onClick={onAddPlan}
          disabled={!canAddPlan}
          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed transition-all ${
            canAddPlan
              ? "border-white/20 hover:border-teal-500/50 hover:bg-teal-500/10 text-gray-400 hover:text-teal-400"
              : "border-white/10 text-gray-600 cursor-not-allowed"
          }`}
          whileHover={canAddPlan ? { scale: 1.02 } : {}}
          whileTap={canAddPlan ? { scale: 0.98 } : {}}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="text-sm font-medium">
            {canAddPlan ? "Add New Plan" : "Max Plans Reached"}
          </span>
        </motion.button>
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm">
            {userName?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white font-medium truncate">
              {userName || "User"}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            title="Logout"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-2">
                Delete Plan?
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                This will permanently delete this plan and all its progress. This
                action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
