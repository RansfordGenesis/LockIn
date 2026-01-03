"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlanSummary, MAX_PLANS_PER_USER } from "@/types/multiplan";
import { PlanCard } from "@/components/plan/PlanCard";

interface PlanSidebarProps {
  plans: PlanSummary[];
  archivedPlans?: PlanSummary[];
  activePlanId: string | null;
  onPlanSelect: (planId: string) => void;
  onAddPlan: () => void;
  onDeletePlan: (planId: string) => void;
  onRenamePlan?: (planId: string, newTitle: string) => void;
  onArchivePlan?: (planId: string) => void;
  onUnarchivePlan?: (planId: string) => void;
  userName?: string;
  onLogout: () => void;
}

export function PlanSidebar({
  plans,
  archivedPlans = [],
  activePlanId,
  onPlanSelect,
  onAddPlan,
  onDeletePlan,
  onRenamePlan,
  onArchivePlan,
  onUnarchivePlan,
  userName,
  onLogout,
}: PlanSidebarProps) {
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null);
  const [renameModal, setRenameModal] = useState<{ planId: string; currentTitle: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const canAddPlan = plans.length < MAX_PLANS_PER_USER;

  const handleArchiveClick = (planId: string) => {
    setArchiveConfirm(planId);
  };

  const confirmArchive = () => {
    if (archiveConfirm) {
      if (onArchivePlan) {
        onArchivePlan(archiveConfirm);
      } else {
        onDeletePlan(archiveConfirm);
      }
      setArchiveConfirm(null);
    }
  };

  const handleRenameClick = (planId: string, currentTitle: string) => {
    setRenameModal({ planId, currentTitle });
    setNewTitle(currentTitle);
  };

  const confirmRename = () => {
    if (renameModal && newTitle.trim() && onRenamePlan) {
      onRenamePlan(renameModal.planId, newTitle.trim());
      setRenameModal(null);
      setNewTitle("");
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
            onDelete={() => handleArchiveClick(plan.planId)}
            onRename={onRenamePlan ? () => handleRenameClick(plan.planId, plan.planTitle) : undefined}
            compact
            showArchiveInsteadOfDelete
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

        {/* Archived Plans Section */}
        {archivedPlans.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full flex items-center gap-2 px-1 py-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showArchived ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="uppercase tracking-wider">
                Archived ({archivedPlans.length})
              </span>
            </button>

            <AnimatePresence>
              {showArchived && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2 mt-2"
                >
                  {archivedPlans.map((plan) => (
                    <div
                      key={plan.planId}
                      className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 opacity-60"
                    >
                      <span className="text-xl flex-shrink-0">{plan.planIcon || "📋"}</span>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="font-medium text-gray-400 truncate text-sm">
                          {plan.planTitle || "Untitled Plan"}
                        </h3>
                        <p className="text-xs text-gray-500">{plan.progressPercent}% complete</p>
                      </div>
                      {onUnarchivePlan && (
                        <button
                          onClick={() => onUnarchivePlan(plan.planId)}
                          className="p-2 text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors flex-shrink-0"
                          title="Restore plan"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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

      {/* Archive Confirmation Modal */}
      <AnimatePresence>
        {archiveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setArchiveConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-2">
                Archive Plan?
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                This will archive this plan and hide it from your active plans.
                Your progress will be saved and you can restore it later.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setArchiveConfirm(null)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmArchive}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                >
                  Archive
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {renameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setRenameModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Rename Plan
              </h3>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter new plan name"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-teal-500/50 focus:outline-none mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmRename();
                  if (e.key === "Escape") setRenameModal(null);
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRenameModal(null)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRename}
                  disabled={!newTitle.trim() || newTitle.trim() === renameModal.currentTitle}
                  className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
