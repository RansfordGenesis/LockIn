"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Mail, Phone, User, ArrowRight, Loader2, Calendar, Award } from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (user: { email: string; name: string; phone: string; isNewUser: boolean }) => void;
}

export default function AuthScreen({ onAuthSuccess }: Readonly<AuthScreenProps>) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Ghana phone: starts with 0 and has 10 digits, or +233 with 9 digits after
    const cleaned = phone.replaceAll(/[\s\-()]/g, '').replace('.', '');
    return /^(0\d{9}|\+233\d{9}|233\d{9})$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !phone) {
      setError("Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!validatePhone(phone)) {
      setError("Please enter a valid Ghana phone number (e.g., 0241234567)");
      return;
    }

    if (mode === "signup" && !firstName.trim()) {
      setError("Please enter your first name");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "signup") {
        // Check if email already exists
        const checkResponse = await fetch("/api/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.toLowerCase().trim() }),
        });

        const checkData = await checkResponse.json();
        if (checkData.exists) {
          setError("An account with this email already exists. Please log in instead.");
          setMode("login");
          setIsLoading(false);
          return;
        }

        // Email is available - proceed with signup flow
        onAuthSuccess({
          email: email.toLowerCase().trim(),
          name: firstName.trim(),
          phone: phone.trim(),
          isNewUser: true,
        });
      } else {
        // Login flow - verify email + phone
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
          }),
        });

        const loginData = await loginResponse.json();

        if (!loginData.success) {
          if (loginData.needsPlan) {
            // User exists but has no plan - send to wizard
            onAuthSuccess({
              email: loginData.user.email,
              name: loginData.user.name || email.split("@")[0],
              phone: phone.trim(),
              isNewUser: true, // Treat as new to go through wizard
            });
            return;
          }
          setError(loginData.error || "Invalid email or phone number");
          setIsLoading(false);
          return;
        }

        // User logged in successfully with existing plan
        onAuthSuccess({
          email: loginData.user.email,
          name: loginData.user.name || email.split("@")[0],
          phone: phone.trim(),
          isNewUser: false,
        });
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500">
              <Target className="w-8 h-8 text-[#0a0a0c]" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Lock<span className="text-teal-400">In</span>
          </h1>
          <p className="text-gray-400 mt-2">Your personalized AI learning journey</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/5 rounded-3xl border border-white/10 p-8">
          {/* Mode Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode("signup"); setError(null); }}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                mode === "signup"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-[#0a0a0c]"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                mode === "login"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-[#0a0a0c]"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              Log In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="firstName"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                    disabled={isLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="tel"
                placeholder="Phone Number (e.g., 0241234567)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                disabled={isLoading}
              />
            </div>
            
            <p className="text-gray-500 text-xs text-center">
              Your phone number is used for verification and SMS reminders
            </p>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-red-500/20 border border-red-500/30"
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-[#0a0a0c] font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === "signup" ? "Checking..." : "Logging In..."}
                </>
              ) : (
                <>
                  {mode === "signup" ? "Create Account & Start" : "Log In"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError(null); }}
                  className="text-teal-400 hover:underline"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => { setMode("signup"); setError(null); }}
                  className="text-teal-400 hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <div className="flex justify-center mb-2">
              <Target className="w-6 h-6 text-teal-400" />
            </div>
            <p className="text-gray-400 text-sm">AI-Powered Plans</p>
          </div>
          <div className="p-4">
            <div className="flex justify-center mb-2">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-gray-400 text-sm">365 Unique Tasks</p>
          </div>
          <div className="p-4">
            <div className="flex justify-center mb-2">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-gray-400 text-sm">Track Progress</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
