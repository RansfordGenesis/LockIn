"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, ArrowRight, Loader2, Target, Shield } from "lucide-react";
import type { User, Plan } from "@/types/plan";
import { validateCredentials, formatPhone } from "@/lib/validation";

interface UserState {
  completedTasks: Record<string, { points: number; completedAt: string; quizScore?: number }>;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string | null;
  dailyCheckIns: Record<string, boolean>;
}

interface LoginModalProps {
  onSuccess: (userData: { user: User; plan: Plan; userState?: UserState }) => void;
  onClose: () => void;
  onCreateNew: () => void;
}

export default function LoginModal({ onSuccess, onClose, onCreateNew }: Readonly<LoginModalProps>) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate credentials using centralized validation
    const validation = validateCredentials(email, phone);
    
    if (!validation.isValid) {
      const errorMsg = validation.errors.email || validation.errors.phone;
      setError(errorMsg || "Please check your credentials");
      return;
    }
    
    // Format phone before sending
    const formattedPhone = formatPhone(phone);

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), phone: formattedPhone }),
      });

      const data = await response.json();

      if (data.success && data.user && data.plan) {
        onSuccess({
          user: data.user,
          plan: data.plan,
          userState: data.userState,
        });
      } else {
        setError(data.error || "Invalid credentials. Please check your email and phone number.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500">
              <Target className="w-6 h-6 text-[#0a0a0c]" />
            </div>
            <span className="text-2xl font-bold text-white">
              Lock<span className="text-teal-400">In</span>
            </span>
          </div>
          <h2 className="text-xl font-semibold text-white">Access Your Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">
            Enter your email and phone number to continue
          </p>
        </div>

        {/* Security Notice */}
        <div className="flex items-center gap-2 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl mb-6">
          <Shield className="w-5 h-5 text-teal-400 flex-shrink-0" />
          <p className="text-xs text-teal-300">
            Your phone number is used to verify your identity
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+233 XX XXX XXXX"
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Access Dashboard
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-sm text-gray-500">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Create New Plan */}
        <button
          onClick={onCreateNew}
          className="w-full py-3 bg-white/5 text-white font-medium rounded-xl hover:bg-white/10 transition-all border border-white/10"
        >
          Create New Plan
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-gray-500 hover:text-white transition-colors text-sm"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}
