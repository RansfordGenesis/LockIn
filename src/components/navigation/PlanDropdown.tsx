"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlanSummary, MAX_PLANS_PER_USER } from "@/types/multiplan";

interface PlanDropdownProps {
  plans: PlanSummary[];
  activePlan: PlanSummary | null;
  onPlanSelect: (planId: string) => void;
  onAddPlan: () => void;
  onLogout: () => void;
}

export function PlanDropdown({
  plans,
  activePlan,
  onPlanSelect,
  onAddPlan,
  onLogout,
}: PlanDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const canAddPlan = plans.length < MAX_PLANS_PER_USER;

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
        className="flex items-center gap-3 w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
      >
        {activePlan ? (
          <>
            <span className="text-2xl">{activePlan.planIcon || "📋"}</span>
            <div className="flex-1 text-left min-w-0">
              <div className="text-white font-medium truncate">
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
                <button
                  key={plan.planId}
                  onClick={() => {
                    onPlanSelect(plan.planId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors ${
                    plan.planId === activePlan?.planId ? "bg-teal-500/20" : ""
                  }`}
                >
                  <span className="text-xl">{plan.planIcon || "📋"}</span>
                  <div className="flex-1 text-left min-w-0">
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
    </div>
  );
}
