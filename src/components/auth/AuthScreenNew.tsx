"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Phone, ArrowRight, Loader2, Sun, Moon, Mail, User, Check } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";

interface AuthScreenProps {
  onAuthSuccess: (user: { email: string; name: string; phone: string; isNewUser: boolean }) => void;
}

type AuthMode = "login" | "signup";
type AuthStep = "form" | "google-phone";

export default function AuthScreen({ onAuthSuccess }: Readonly<AuthScreenProps>) {
  const { theme, toggleTheme } = useTheme();
  const { data: session, status } = useSession();
  
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authStep, setAuthStep] = useState<AuthStep>("form");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<{ email: string; firstName: string } | null>(null);

  // Handle Google session - check if user exists and auto-login, otherwise ask for phone
  useEffect(() => {
    const handleGoogleSession = async () => {
      // Check if user just logged out (indicated by sessionStorage flag)
      const justLoggedOut = globalThis.sessionStorage?.getItem('lockin-just-logged-out');
      if (justLoggedOut) {
        // Clear the flag and don't auto-login
        globalThis.sessionStorage?.removeItem('lockin-just-logged-out');
        return;
      }

      if (status === "authenticated" && session?.user) {
        const googleEmail = session.user.email || "";
        const fullName = session.user.name || "";
        const googleFirstName = fullName.split(" ")[0];

        setIsGoogleLoading(true);

        try {
          // Check if user already exists in database
          const checkResponse = await fetch("/api/check-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: googleEmail.toLowerCase().trim() }),
          });

          const checkData = await checkResponse.json();

          if (checkData.exists && checkData.user) {
            // User exists - auto-login with their stored phone
            const loginResponse = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: googleEmail.toLowerCase().trim(),
                phone: checkData.user.phoneNumber,
              }),
            });

            const loginData = await loginResponse.json();

            if (loginData.success) {
              // Auto-login successful
              onAuthSuccess({
                email: loginData.user.email,
                name: loginData.user.name || googleFirstName,
                phone: checkData.user.phoneNumber,
                isNewUser: false,
              });
              setIsGoogleLoading(false);
              return;
            }

            if (loginData.needsPlan) {
              // User exists but needs a plan
              onAuthSuccess({
                email: googleEmail,
                name: googleFirstName,
                phone: checkData.user.phoneNumber,
                isNewUser: true,
              });
              setIsGoogleLoading(false);
              return;
            }
          }

          // User doesn't exist - show phone input form
          setGoogleUser({ email: googleEmail, firstName: googleFirstName });
          setAuthStep("google-phone");
        } catch (err) {
          console.error("Error checking user:", err);
          // Fall back to phone input on error
          setGoogleUser({ email: googleEmail, firstName: googleFirstName });
          setAuthStep("google-phone");
        }

        setIsGoogleLoading(false);
      }
    };

    handleGoogleSession();
  }, [session, status, onAuthSuccess]);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replaceAll(/[\s\-()]/g, '').replace('.', '');
    return /^(0\d{9}|\+233\d{9}|233\d{9})$/.test(cleaned);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await signIn("google", { redirect: false });
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError("Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authMode === "signup") {
      // Signup requires all fields
      if (!firstName.trim()) {
        setError("Please enter your first name");
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
    } else {
      // Login requires email and phone
      if (!validateEmail(email)) {
        setError("Please enter a valid email address");
        return;
      }
      if (!validatePhone(phone)) {
        setError("Please enter a valid Ghana phone number (e.g., 0241234567)");
        return;
      }
    }

    setIsLoading(true);

    try {
      // Check if user exists with this email
      const checkResponse = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const checkData = await checkResponse.json();

      if (checkData.exists) {
        // Existing user - try to log in
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
            onAuthSuccess({
              email: email.toLowerCase().trim(),
              name: firstName.trim(),
              phone: phone.trim(),
              isNewUser: true,
            });
            return;
          }
          setError(loginData.error || "Invalid credentials for this account");
          setIsLoading(false);
          return;
        }

        onAuthSuccess({
          email: loginData.user.email,
          name: loginData.user.name || firstName.trim(),
          phone: phone.trim(),
          isNewUser: false,
        });
      } else {
        if (authMode === "login") {
          setError("No account found with this email. Please sign up first.");
          setIsLoading(false);
          return;
        }
        // New user - proceed to wizard
        onAuthSuccess({
          email: email.toLowerCase().trim(),
          name: firstName.trim(),
          phone: phone.trim(),
          isNewUser: true,
        });
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google phone submission
  const handleGooglePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!googleUser) {
      setError("Please sign in with Google first");
      return;
    }

    if (!validatePhone(phone)) {
      setError("Please enter a valid Ghana phone number (e.g., 0241234567)");
      return;
    }

    setIsLoading(true);

    try {
      const checkResponse = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: googleUser.email.toLowerCase().trim() }),
      });

      const checkData = await checkResponse.json();

      if (checkData.exists) {
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: googleUser.email.toLowerCase().trim(),
            phone: phone.trim(),
          }),
        });

        const loginData = await loginResponse.json();

        if (!loginData.success) {
          if (loginData.needsPlan) {
            onAuthSuccess({
              email: googleUser.email,
              name: googleUser.firstName,
              phone: phone.trim(),
              isNewUser: true,
            });
            return;
          }
          setError(loginData.error || "Invalid phone number for this account");
          setIsLoading(false);
          return;
        }

        onAuthSuccess({
          email: loginData.user.email,
          name: loginData.user.name || googleUser.firstName,
          phone: phone.trim(),
          isNewUser: false,
        });
      } else {
        onAuthSuccess({
          email: googleUser.email.toLowerCase().trim(),
          name: googleUser.firstName,
          phone: phone.trim(),
          isNewUser: true,
        });
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetToForm = () => {
    setAuthStep("form");
    setGoogleUser(null);
    setPhone("");
    setError(null);
  };

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex ${isDark ? "bg-[#0a0a0c]" : "bg-gray-50"}`}>
      {/* Left Side - Image (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <Image
          src="/login.png"
          alt="LockIn - Your Learning Journey"
          fill
          className="object-cover"
          priority
        />
        {/* Gradient Overlay */}
        <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-r from-[#0a0a0c]/60 to-transparent" : "bg-gradient-to-r from-white/40 to-transparent"}`} />
        
        {/* Overlay Content */}
        <div className="relative z-10 p-12 flex flex-col justify-end h-full">
          <div className={`max-w-lg ${isDark ? "text-white" : "text-gray-900"}`}>
            <h2 className="text-4xl font-bold mb-4 drop-shadow-lg">
              Lock In Your Goals
            </h2>
            <p className={`text-lg drop-shadow ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              AI-powered personalized learning plans tailored to your schedule. 
              Daily tasks to master any skill.
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 mt-6">
              {["🎯 AI Plans", "📅 Daily Tasks", "📈 Progress", "🔔 Reminders"].map((feature) => (
                <span
                  key={feature}
                  className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md ${
                    isDark
                      ? "bg-white/20 text-white"
                      : "bg-black/20 text-white"
                  }`}
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Theme Toggle */}
          <div className="flex justify-end mb-6">
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-full transition-all duration-300 ${
                isDark
                  ? "bg-white/10 hover:bg-white/20 text-yellow-400"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
              aria-label="Toggle theme"
            >
              <motion.div
                initial={false}
                animate={{ rotate: isDark ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.div>
            </button>
          </div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/20">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Lock<span className="text-teal-500">In</span>
            </h1>
            <p className={`mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Your personalized AI learning journey
            </p>
          </motion.div>

          {/* Auth Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-3xl border p-8 ${
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-white border-gray-200 shadow-xl"
            }`}
          >
            <AnimatePresence mode="wait">
              {authStep === "form" ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {authMode === "signup" ? "Create Account" : "Welcome Back"}
                  </h2>
                  <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {authMode === "signup" 
                      ? "Enter your details to begin your learning journey" 
                      : "Sign in to continue your progress"}
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* First Name Input - Only for signup */}
                    {authMode === "signup" && (
                      <div className="relative">
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                          isDark ? "text-gray-500" : "text-gray-400"
                        }`} />
                        <input
                          type="text"
                          placeholder="First Name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-colors ${
                            isDark
                              ? "bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-teal-500/50"
                              : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500"
                          } focus:outline-none`}
                          disabled={isLoading}
                        />
                      </div>
                    )}

                    {/* Email Input */}
                    <div className="relative">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                        isDark ? "text-gray-500" : "text-gray-400"
                      }`} />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-colors ${
                          isDark
                            ? "bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-teal-500/50"
                            : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500"
                        } focus:outline-none`}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Phone Input */}
                    <div className="relative">
                      <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                        isDark ? "text-gray-500" : "text-gray-400"
                      }`} />
                      <input
                        type="tel"
                        placeholder="Phone (e.g., 0241234567)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-colors ${
                          isDark
                            ? "bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-teal-500/50"
                            : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500"
                        } focus:outline-none`}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-3 rounded-xl bg-red-500/20 border border-red-500/30"
                        >
                          <p className="text-red-400 text-sm">{error}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-teal-500/20"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Please wait...
                        </>
                      ) : (
                        <>
                          {authMode === "signup" ? "Sign Up" : "Log In"}
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="flex items-center gap-4 my-5">
                    <div className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                    <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      OR
                    </span>
                    <div className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                  </div>

                  {/* Google Sign In Button - Cute & Compact */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                      isDark
                        ? "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                    } disabled:opacity-50`}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                  </button>

                  {/* Toggle Login/Signup */}
                  <p className={`text-center text-sm mt-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {authMode === "signup" ? (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("login");
                            setError(null);
                          }}
                          className="text-teal-500 font-medium hover:text-teal-400 transition-colors"
                        >
                          Log In
                        </button>
                      </>
                    ) : (
                      <>
                        Don&apos;t have an account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("signup");
                            setError(null);
                          }}
                          className="text-teal-500 font-medium hover:text-teal-400 transition-colors"
                        >
                          Sign Up
                        </button>
                      </>
                    )}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="google-phone"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Google User Info */}
                  {googleUser && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
                      isDark ? "bg-teal-500/10 border border-teal-500/20" : "bg-teal-50 border border-teal-200"
                    }`}>
                      <div className="p-2 rounded-full bg-teal-500">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          Hi, {googleUser.firstName}!
                        </p>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          {googleUser.email}
                        </p>
                      </div>
                    </div>
                  )}

                  <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Almost there!
                  </h2>
                  <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Enter your phone number for verification and reminders
                  </p>

                  <form onSubmit={handleGooglePhoneSubmit} className="space-y-4">
                    <div className="relative">
                      <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                        isDark ? "text-gray-500" : "text-gray-400"
                      }`} />
                      <input
                        type="tel"
                        placeholder="Phone (e.g., 0241234567)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-colors ${
                          isDark
                            ? "bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-teal-500/50"
                            : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500"
                        } focus:outline-none`}
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-3 rounded-xl bg-red-500/20 border border-red-500/30"
                        >
                          <p className="text-red-400 text-sm">{error}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-teal-500/20"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={resetToForm}
                      className={`w-full py-3 text-sm ${
                        isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"
                      } transition-colors`}
                    >
                      ← Use a different account
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <p className={`text-center text-xs mt-6 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Mobile Background */}
      <div className="lg:hidden fixed inset-0 -z-10">
        <Image
          src="/login.png"
          alt=""
          fill
          className="object-cover opacity-10"
        />
      </div>
    </div>
  );
}
