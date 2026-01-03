"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlanSummary, MAX_PLANS_PER_USER } from "@/types/multiplan";

interface PlanDropdownProps {
  plans: PlanSummary[];
  archivedPlans?: PlanSummary[];
  activePlan: PlanSummary | null;
  onPlanSelect: (planId: string) => void;
  onAddPlan: () => void;
  onDeletePlan?: (planId: string) => void;
  onRenamePlan?: (planId: string, newTitle: string) => void;
  onArchivePlan?: (planId: string) => void;
  onUnarchivePlan?: (planId: string) => void;
  onLogout: () => void;
}

export function PlanDropdown({
  plans,
  archivedPlans = [],
  activePlan,
  onPlanSelect,
  onAddPlan,
  onDeletePlan,
  onRenamePlan,
  onArchivePlan,
  onUnarchivePlan,
  onLogout,
}: PlanDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [renameModal, setRenameModal] = useState<{ planId: string; currentTitle: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const canAddPlan = plans.length < MAX_PLANS_PER_USER;

  const handleArchiveClick = (planId: string) => {
    setConfirmArchive(planId);
  };

  const confirmArchiveAction = () => {
    if (confirmArchive) {
      if (onArchivePlan) {
        onArchivePlan(confirmArchive);
      } else if (onDeletePlan) {
        onDeletePlan(confirmArchive);
      }
      setConfirmArchive(null);
      setIsOpen(false);
    }
  };

  const handleRenameClick = (planId: string, currentTitle: string) => {
    setRenameModal({ planId, currentTitle });
    setNewTitle(currentTitle);
    setIsOpen(false);
  };

  const confirmRename = () => {
    if (renameModal && newTitle.trim() && onRenamePlan) {
      onRenamePlan(renameModal.planId, newTitle.trim());
      setRenameModal(null);
      setNewTitle("");
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
      >
        {activePlan ? (
          <>
            <span className="text-2xl flex-shrink-0">{activePlan.planIcon || "📋"}</span>
            <div className="flex-1 text-left min-w-0 overflow-hidden">
              <div className="text-white font-medium truncate text-sm">
                {activePlan.planTitle || "Untitled Plan"}
              </div>
              <div className="text-xs text-gray-400">
                {activePlan.progressPercent}% complete
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="text-2xl">📋</span>
            <div className="flex-1 text-left">
              <div className="text-white font-medium">Select a Plan</div>
              <div className="text-xs text-gray-400">Choose your journey</div>
            </div>
          </>
        )}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-[70]"
          >
            {/* Plans List */}
            <div className="max-h-64 overflow-y-auto">
              {plans.map((plan) => (
                <div
                  key={plan.planId}
                  className={`flex items-center gap-2 p-3 hover:bg-white/10 transition-colors ${
                    plan.planId === activePlan?.planId ? "bg-teal-500/20" : ""
                  }`}
                >
                  {confirmArchive === plan.planId ? (
                    // Confirm archive UI
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm text-gray-300">Archive this plan?</span>
                      <button
                        onClick={confirmArchiveAction}
                        className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmArchive(null)}
                        className="px-2 py-1 text-xs bg-white/10 text-gray-300 hover:bg-white/20 rounded"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    // Normal plan display
                    <>
                      <button
                        onClick={() => {
                          onPlanSelect(plan.planId);
                          setIsOpen(false);
                        }}
                        className="flex-1 flex items-center gap-3 text-left min-w-0 overflow-hidden"
                      >
                        <span className="text-xl flex-shrink-0">{plan.planIcon || "📋"}</span>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="text-white font-medium truncate text-sm">
                            {plan.planTitle || "Untitled Plan"}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden max-w-[100px]">
                              <div
                                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400"
                                style={{ width: `${plan.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">
                              {plan.progressPercent}%
                            </span>
                          </div>
                        </div>
                        {plan.planId === activePlan?.planId && (
                          <svg
                            className="w-5 h-5 text-teal-400"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        )}
                      </button>
                      {/* Rename button */}
                      {onRenamePlan && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameClick(plan.planId, plan.planTitle);
                          }}
                          className="p-2 text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors"
                          title="Rename plan"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {/* Archive button */}
                      {(onArchivePlan || onDeletePlan) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveClick(plan.planId);
                          }}
                          className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Archive plan"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Add Plan */}
            <button
              onClick={() => {
                if (canAddPlan) {
                  onAddPlan();
                  setIsOpen(false);
                }
              }}
              disabled={!canAddPlan}
              className={`w-full flex items-center gap-3 p-3 transition-colors ${
                canAddPlan
                  ? "hover:bg-white/10 text-gray-300"
                  : "text-gray-600 cursor-not-allowed"
              }`}
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
                {canAddPlan
                  ? `Add New Plan (${plans.length}/${MAX_PLANS_PER_USER})`
                  : "Max Plans Reached"}
              </span>
            </button>

            {/* Archived Plans Section */}
            {archivedPlans.length > 0 && (
              <>
                <div className="border-t border-white/10" />
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="w-full flex items-center gap-3 p-3 text-gray-400 hover:bg-white/5 transition-colors"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showArchived ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm">Archived ({archivedPlans.length})</span>
                </button>

                {showArchived && (
                  <div className="bg-black/20">
                    {archivedPlans.map((plan) => (
                      <div
                        key={plan.planId}
                        className="flex items-center gap-2 p-3 opacity-60"
                      >
                        <span className="text-lg flex-shrink-0">{plan.planIcon || "📋"}</span>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="text-gray-400 font-medium truncate text-sm">
                            {plan.planTitle || "Untitled Plan"}
                          </div>
                          <div className="text-xs text-gray-500">{plan.progressPercent}% complete</div>
                        </div>
                        {onUnarchivePlan && (
                          <button
                            onClick={() => {
                              onUnarchivePlan(plan.planId);
                              setIsOpen(false);
                            }}
                            className="p-2 text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors"
                            title="Restore plan"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Logout */}
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 text-gray-300 hover:text-red-400 transition-colors"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-sm font-medium">Logout</span>
            </button>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4"
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
