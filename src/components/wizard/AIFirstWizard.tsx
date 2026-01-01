"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  Target,
  Code,
  User,
  Mail,
  Phone,
} from "lucide-react";

// Pre-filled user info from auth screen
interface AuthUserInfo {
  email: string;
  name: string;
  phone: string;
}

interface ConditionalQuestion {
  showWhen: string;
  id: string;
  question: string;
  type: "single" | "multi";
  reason: string;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
}

interface AIQuestion {
  id: string;
  question: string;
  type: "single" | "multi";
  reason: string;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
  conditionalQuestions?: ConditionalQuestion[];
}

interface AIAnalysis {
  detectedCategory: string;
  categoryName: string;
  categoryIcon: string;
  summary: string;
  questions: AIQuestion[];
  suggestedTimeCommitment: string;
}

interface WizardData {
  goal: string;
  analysis: AIAnalysis | null;
  answers: Record<string, string | string[]>;
  otherInputs: Record<string, string>; // Custom "Other" text inputs
  scheduleType: "weekdays" | "fullweek";
  timeCommitment: string;
  experience: "beginner" | "intermediate" | "advanced";
  constraints: string[];
  firstName: string;
  email: string;
  phone: string;
  enableNotifications: boolean;
  includeLeetCode: boolean;
  leetCodeLanguage: string;
  customCurriculum: string;
  useCustomCurriculum: boolean;
}

const leetCodeLanguages = [
  { value: "python", label: "Python", icon: "🐍" },
  { value: "javascript", label: "JavaScript", icon: "⚡" },
  { value: "typescript", label: "TypeScript", icon: "💙" },
  { value: "java", label: "Java", icon: "☕" },
  { value: "cpp", label: "C++", icon: "⚙️" },
  { value: "csharp", label: "C#", icon: "🔷" },
  { value: "go", label: "Go", icon: "🐹" },
  { value: "rust", label: "Rust", icon: "🦀" },
];

const scheduleOptions = [
  { value: "weekdays", label: "5 Days", subtitle: "Monday to Friday", description: "Weekends off for rest & life" },
  { value: "fullweek", label: "7 Days", subtitle: "Full Week", description: "Maximum intensity, faster progress" },
];

const timeOptions = [
  { value: "30min-daily", label: "30 min/day", description: "Light but consistent", minutes: 30 },
  { value: "1hr-daily", label: "1 hour/day", description: "Balanced approach", minutes: 60 },
  { value: "2hr-daily", label: "2 hours/day", description: "Accelerated learning", minutes: 120 },
  { value: "3hr-daily", label: "3+ hours/day", description: "Intensive focus", minutes: 180 },
];

const experienceLevels = [
  { value: "beginner", label: "Beginner", description: "Just starting out" },
  { value: "intermediate", label: "Intermediate", description: "Some experience" },
  { value: "advanced", label: "Advanced", description: "Looking to master" },
];

export default function AIFirstWizard({ onComplete, authUser }: Readonly<{ onComplete: (data: WizardData) => void; authUser?: AuthUserInfo }>) {
  // Skip contact step if authUser is provided
  const [step, setStep] = useState<"goal" | "analyzing" | "questions" | "schedule" | "time" | "experience" | "leetcode" | "contact" | "review">("goal");
  const [data, setData] = useState<WizardData>(() => ({
    goal: "",
    analysis: null,
    answers: {},
    otherInputs: {},
    scheduleType: "weekdays",
    timeCommitment: "",
    experience: "beginner",
    constraints: [],
    firstName: authUser?.name || "",
    email: authUser?.email || "",
    phone: authUser?.phone || "",
    enableNotifications: true,
    includeLeetCode: false,
    leetCodeLanguage: "python",
    customCurriculum: "",
    useCustomCurriculum: false,
  }));

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Remove all non-digits except +
    const cleaned = phone.replaceAll(/[^\d+]/g, "");
    // Accept: +233XXXXXXXXX, 233XXXXXXXXX, 0XXXXXXXXX (9-15 digits)
    const phoneRegex = /^(\+233|233|0)\d{9,12}$/;
    return phoneRegex.test(cleaned);
  };

  const validateContactInfo = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!data.firstName.trim()) {
      errors.firstName = "First name is required";
    } else if (data.firstName.trim().length < 2) {
      errors.firstName = "First name must be at least 2 characters";
    }
    
    if (!data.email.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(data.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!data.phone.trim()) {
      errors.phone = "Phone number is required for SMS reminders";
    } else if (!validatePhone(data.phone)) {
      errors.phone = "Please enter a valid Ghana phone number (0XX XXX XXXX or +233...)";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinueFromContact = () => {
    if (validateContactInfo()) {
      setStep("review");
    }
  };

  // Event handlers to reduce nesting
  const handleGoalExampleClick = (example: string) => {
    setData((prev) => ({ ...prev, goal: example }));
  };

  const handleScheduleTypeSelect = (scheduleType: "weekdays" | "fullweek") => {
    setData((prev) => ({ ...prev, scheduleType }));
  };

  const handleTimeCommitmentSelect = (timeCommitment: string) => {
    setData((prev) => ({ ...prev, timeCommitment }));
  };

  const handleExperienceSelect = (experience: WizardData["experience"]) => {
    setData((prev) => ({ ...prev, experience }));
  };

  const handleLeetCodeLanguageSelect = (language: string) => {
    setData((prev) => ({ ...prev, leetCodeLanguage: language }));
  };

  const getQuestionAnswerLabel = (question: { id: string; options: Array<{ value: string; label: string }> }, answer: string | string[], otherInput?: string): string => {
    if (Array.isArray(answer)) {
      return answer.map((v) => {
        if (v === "other" && otherInput) return `Other: ${otherInput}`;
        return question.options.find((o) => o.value === v)?.label || v;
      }).join(", ");
    }
    if (answer === "other" && otherInput) {
      return `Other: ${otherInput}`;
    }
    return question.options.find((o) => o.value === answer)?.label || "";
  };

  const analyzeGoal = async () => {
    if (data.goal.length < 10) {
      setError("Please describe your goal in more detail");
      return;
    }
    
    setError("");
    setStep("analyzing");

    try {
      const response = await fetch("/api/analyze-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: data.goal }),
      });

      const result = await response.json();

      if (result.success) {
        setData((prev) => ({
          ...prev,
          analysis: result,
          timeCommitment: result.suggestedTimeCommitment || "1hr-daily",
        }));
        setStep("questions");
      } else {
        setError(result.error || "Failed to analyze goal");
        setStep("goal");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("goal");
    }
  };

  const handleAnswerSelect = (questionId: string, value: string, type: "single" | "multi") => {
    setData((prev) => {
      const currentAnswer = prev.answers[questionId];
      
      if (type === "single") {
        return { ...prev, answers: { ...prev.answers, [questionId]: value } };
      } else {
        // Multi-select
        const currentArray = Array.isArray(currentAnswer) ? currentAnswer : [];
        const newArray = currentArray.includes(value)
          ? currentArray.filter((v) => v !== value)
          : [...currentArray, value];
        return { ...prev, answers: { ...prev.answers, [questionId]: newArray } };
      }
    });
  };

  const isQuestionAnswered = (questionId: string) => {
    const answer = data.answers[questionId];
    if (!answer) return false;
    
    const hasAnswer = Array.isArray(answer) ? answer.length > 0 : !!answer;
    if (!hasAnswer) return false;
    
    // If "other" is selected, require the text input to have a value
    const hasOther = answer === "other" || (Array.isArray(answer) && answer.includes("other"));
    if (hasOther) {
      const otherText = data.otherInputs[questionId];
      return otherText && otherText.trim().length >= 2;
    }
    
    return true;
  };

  // Build the effective question list including conditional questions
  const getEffectiveQuestions = (): AIQuestion[] => {
    if (!data.analysis) return [];

    const effectiveQuestions: AIQuestion[] = [];

    for (const question of data.analysis.questions) {
      effectiveQuestions.push(question);

      // Check if this question has conditional questions and if any should be shown
      if (question.conditionalQuestions && question.conditionalQuestions.length > 0) {
        const answer = data.answers[question.id];
        const answerValue = Array.isArray(answer) ? answer[0] : answer;

        // Find conditional questions that match the current answer
        for (const conditionalQ of question.conditionalQuestions) {
          if (conditionalQ.showWhen === answerValue) {
            effectiveQuestions.push(conditionalQ as AIQuestion);
          }
        }
      }
    }

    return effectiveQuestions;
  };

  const nextQuestion = () => {
    if (!data.analysis) return;

    const effectiveQuestions = getEffectiveQuestions();

    if (currentQuestionIndex < effectiveQuestions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else {
      setStep("schedule");
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    } else {
      setStep("goal");
      setData((prev) => ({ ...prev, analysis: null, answers: {} }));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Small delay for UX
    await new Promise((r) => setTimeout(r, 500));
    onComplete(data);
  };

  const renderGoalStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
          <Target className="w-10 h-10 text-teal-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">
          What do you want to learn?
        </h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Describe your learning goal or paste your own curriculum to track.
        </p>
      </div>

      {/* Toggle between modes */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
        <button
          onClick={() => setData((prev) => ({ ...prev, useCustomCurriculum: false }))}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            data.useCustomCurriculum
              ? "text-gray-400 hover:text-white"
              : "bg-teal-500 text-white"
          }`}
        >
          🤖 AI-Generated Plan
        </button>
        <button
          onClick={() => setData((prev) => ({ ...prev, useCustomCurriculum: true }))}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            data.useCustomCurriculum
              ? "bg-teal-500 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          📋 My Own Curriculum
        </button>
      </div>

      {data.useCustomCurriculum ? (
        <>
          <div className="relative">
            <textarea
              value={data.customCurriculum}
              onChange={(e) => setData((prev) => ({ ...prev, customCurriculum: e.target.value }))}
              placeholder={`Paste your learning curriculum here. Example format:

🏗️ Core Foundations
- Python (OOP, async/await, decorators)
- Git & GitHub (version control, branching)
- Linux & CLI basics

🌐 Web & HTTP
- HTTP methods (GET, POST, PUT, DELETE)
- REST principles
- JSON & serialization

⚙️ Backend Frameworks
- Django (models, views, templates)
- FastAPI (path operations, Pydantic)
...`}
              className="w-full h-64 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 resize-none transition-all font-mono text-sm"
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-500">
              {data.customCurriculum.length} characters
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-blue-400 text-sm">
              💡 <strong>Tip:</strong> Use bullet points or checkboxes. We&apos;ll parse your curriculum and create daily tasks for you to track!
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                if (data.customCurriculum.length < 50) {
                  setError("Please paste a more detailed curriculum");
                  return;
                }
                setError("");
                // Set goal to a summary for plan generation
                setData((prev) => ({
                  ...prev,
                  goal: `Custom curriculum: ${prev.customCurriculum.substring(0, 200)}...`,
                }));
                setStep("schedule");
              }}
              disabled={data.customCurriculum.length < 50}
              className="flex-1 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
            >
              <Check className="w-5 h-5" />
              Use This Curriculum
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="relative">
            <textarea
              value={data.goal}
              onChange={(e) => setData((prev) => ({ ...prev, goal: e.target.value }))}
              placeholder="Example: I want to become a full-stack developer. I know some HTML and CSS, but I want to learn React, Node.js, and how to build complete web applications with databases..."
              className="w-full h-40 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 resize-none transition-all"
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-500">
              {data.goal.length} characters
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={analyzeGoal}
              disabled={data.goal.length < 10}
              className="flex-1 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Analyze My Goal
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="pt-6 border-t border-white/10">
            <p className="text-sm text-gray-500 text-center mb-3">Need inspiration? Try one of these:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "I want to learn backend development with Python",
                "I want to become a machine learning engineer",
                "I want to learn DevOps and cloud infrastructure",
                "I want to master data structures & algorithms",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => handleGoalExampleClick(example)}
                  className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white hover:border-teal-500/30 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 text-sm text-center"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );

  const renderAnalyzingStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-teal-400 animate-pulse" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-teal-500/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <h3 className="mt-8 text-xl font-semibold text-white">Analyzing Your Goal</h3>
      <p className="mt-2 text-gray-400 text-center max-w-sm">
        Our AI is understanding your goal and preparing personalized questions...
      </p>
      <div className="mt-6 flex items-center gap-2 text-teal-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">This usually takes a few seconds</span>
      </div>
    </motion.div>
  );

  const renderQuestionsStep = () => {
    if (!data.analysis) return null;

    const effectiveQuestions = getEffectiveQuestions();
    const question = effectiveQuestions[currentQuestionIndex];
    if (!question) return null;

    const answer = data.answers[question.id];
    const isAnswered = isQuestionAnswered(question.id);

    return (
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        {/* Analysis summary header */}
        <div className="p-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{data.analysis.categoryIcon}</span>
            <div>
              <p className="text-teal-400 font-medium">{data.analysis.categoryName}</p>
              <p className="text-sm text-gray-400">{data.analysis.summary}</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{
                width: `${((currentQuestionIndex + 1) / effectiveQuestions.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-sm text-gray-400">
            {currentQuestionIndex + 1} of {effectiveQuestions.length}
          </span>
        </div>

        {/* Question */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-white">{question.question}</h3>
            <p className="text-sm text-gray-500 mt-1 italic">{question.reason}</p>
          </div>

          <p className="text-xs text-gray-500">
            {question.type === "multi" ? "Select all that apply" : "Select one option"}
          </p>

          <div className="grid grid-cols-1 gap-3">
            {question.options.map((option) => {
              const isSelected = question.type === "multi"
                ? Array.isArray(answer) && answer.includes(option.value)
                : answer === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => handleAnswerSelect(question.id, option.value, question.type)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-teal-500/20 border-teal-500/50 text-white"
                      : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-${question.type === "multi" ? "md" : "full"} border-2 flex items-center justify-center transition-colors ${
                        isSelected ? "border-teal-500 bg-teal-500" : "border-gray-500"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      {option.description && (
                        <p className="text-sm text-gray-500">{option.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Show text input when "Other" is selected */}
          {(answer === "other" || (Array.isArray(answer) && answer.includes("other"))) && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="Please specify your choice..."
                value={data.otherInputs[question.id] || ""}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    otherInputs: { ...prev.otherInputs, [question.id]: e.target.value },
                  }))
                }
                className="w-full px-4 py-3 bg-white/5 border border-teal-500/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the specific framework, tool, or technology you want to learn
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={prevQuestion}
            className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={nextQuestion}
            disabled={!isAnswered}
            className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {currentQuestionIndex < effectiveQuestions.length - 1 ? "Next Question" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  };

  const renderScheduleStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
          <span className="text-3xl">📅</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Weekly Schedule</h2>
        <p className="text-gray-400 mt-2">
          How many days per week will you commit to learning?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {scheduleOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleScheduleTypeSelect(option.value as "weekdays" | "fullweek")}
            className={`p-6 rounded-xl border text-center transition-all ${
              data.scheduleType === option.value
                ? "bg-teal-500/20 border-teal-500/50"
                : "bg-white/5 border-white/10 hover:border-white/20"
            }`}
          >
            <p className="text-3xl font-bold text-white">{option.label}</p>
            <p className="text-teal-400 font-medium">{option.subtitle}</p>
            <p className="text-sm text-gray-400 mt-2">{option.description}</p>
          </button>
        ))}
      </div>

      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
        <p className="text-sm text-gray-400">
          {data.scheduleType === "weekdays" 
            ? "📊 5 days × 52 weeks = ~260 learning days in 2026"
            : "📊 7 days × 52 weeks = ~365 learning days in 2026"}
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => {
            // If using custom curriculum, go back to goal step (no questions)
            if (data.useCustomCurriculum) {
              setStep("goal");
            } else {
              setStep("questions");
              const effectiveQs = getEffectiveQuestions();
              setCurrentQuestionIndex(effectiveQs.length - 1);
            }
          }}
          className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setStep("time")}
          className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderTimeStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
          <Clock className="w-8 h-8 text-teal-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Daily Time Commitment</h2>
        <p className="text-gray-400 mt-2">
          How much time can you dedicate to learning each day?
        </p>
        {data.analysis?.suggestedTimeCommitment && (
          <p className="text-sm text-teal-400 mt-1">
            💡 Based on your goal, we suggest: {timeOptions.find((t) => t.value === data.analysis?.suggestedTimeCommitment)?.label || "1 hour/day"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {timeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleTimeCommitmentSelect(option.value)}
            className={`p-4 rounded-xl border text-center transition-all ${
              data.timeCommitment === option.value
                ? "bg-teal-500/20 border-teal-500/50"
                : "bg-white/5 border-white/10 hover:border-white/20"
            }`}
          >
            <p className="font-semibold text-white">{option.label}</p>
            <p className="text-sm text-gray-400">{option.description}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => setStep("schedule")}
          className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setStep("experience")}
          disabled={!data.timeCommitment}
          className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderExperienceStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Your Experience Level</h2>
        <p className="text-gray-400 mt-2">
          This helps us tailor the difficulty and pace of your plan
        </p>
      </div>

      <div className="space-y-3">
        {experienceLevels.map((level) => (
          <button
            key={level.value}
            onClick={() => handleExperienceSelect(level.value as WizardData["experience"])}
            className={`w-full p-4 rounded-xl border text-left transition-all ${
              data.experience === level.value
                ? "bg-teal-500/20 border-teal-500/50"
                : "bg-white/5 border-white/10 hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  data.experience === level.value ? "border-teal-500 bg-teal-500" : "border-gray-500"
                }`}
              >
                {data.experience === level.value && <Check className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className="font-medium text-white">{level.label}</p>
                <p className="text-sm text-gray-400">{level.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => setStep("time")}
          className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setStep("leetcode")}
          className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderLeetCodeStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center">
          <Code className="w-8 h-8 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Daily LeetCode Challenge</h2>
        <p className="text-gray-400 mt-2">
          Want to sharpen your problem-solving skills alongside your learning?
        </p>
      </div>

      <div className="space-y-4">
        {/* LeetCode Toggle */}
        <label className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
          <input
            type="checkbox"
            checked={data.includeLeetCode}
            onChange={(e) => setData((prev) => ({ ...prev, includeLeetCode: e.target.checked }))}
            className="w-6 h-6 rounded border-gray-500 text-orange-500 focus:ring-orange-500/20"
          />
          <div className="flex-1">
            <p className="text-white font-medium">Include Daily LeetCode</p>
            <p className="text-sm text-gray-400">One coding challenge per day to build problem-solving skills</p>
          </div>
          <span className="text-2xl">💻</span>
        </label>

        {/* Language Selection (only show if LeetCode enabled) */}
        {data.includeLeetCode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-3"
          >
            <p className="text-sm text-gray-400">Choose your preferred language:</p>
            <div className="grid grid-cols-2 gap-2">
              {leetCodeLanguages.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => handleLeetCodeLanguageSelect(lang.value)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    data.leetCodeLanguage === lang.value
                      ? "bg-orange-500/20 border-orange-500/50 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                  }`}
                >
                  <span className="text-xl">{lang.icon}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <p className="text-orange-400 text-sm">
                📝 How it works: Each day you&apos;ll get a LeetCode problem. Complete it, paste your code, and we&apos;ll verify your solution!
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => setStep("experience")}
          className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setStep(authUser ? "review" : "contact")}
          className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderContactStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Stay Accountable</h2>
        <p className="text-gray-400 mt-2">
          Get daily reminders to keep you on track
        </p>
      </div>

      <div className="space-y-4">
        {/* First Name */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            First Name
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => {
              setData((prev) => ({ ...prev, firstName: e.target.value }));
              if (validationErrors.firstName) {
                setValidationErrors((prev) => ({ ...prev, firstName: "" }));
              }
            }}
            placeholder="John"
            className={`w-full p-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/20 ${
              validationErrors.firstName ? "border-red-500" : "border-white/10 focus:border-teal-500/50"
            }`}
          />
          {validationErrors.firstName && (
            <p className="text-xs text-red-400 mt-1">{validationErrors.firstName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email Address
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => {
              setData((prev) => ({ ...prev, email: e.target.value }));
              if (validationErrors.email) {
                setValidationErrors((prev) => ({ ...prev, email: "" }));
              }
            }}
            placeholder="your@email.com"
            className={`w-full p-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/20 ${
              validationErrors.email ? "border-red-500" : "border-white/10 focus:border-teal-500/50"
            }`}
          />
          {validationErrors.email && (
            <p className="text-xs text-red-400 mt-1">{validationErrors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            Phone Number (for SMS)
          </label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => {
              setData((prev) => ({ ...prev, phone: e.target.value }));
              if (validationErrors.phone) {
                setValidationErrors((prev) => ({ ...prev, phone: "" }));
              }
            }}
            placeholder="0XX XXX XXXX or +233..."
            className={`w-full p-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/20 ${
              validationErrors.phone ? "border-red-500" : "border-white/10 focus:border-teal-500/50"
            }`}
          />
          {validationErrors.phone ? (
            <p className="text-xs text-red-400 mt-1">{validationErrors.phone}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">Accepts: +233, 233, 0XX formats (Ghana numbers)</p>
          )}
        </div>

        <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={data.enableNotifications}
            onChange={(e) => setData((prev) => ({ ...prev, enableNotifications: e.target.checked }))}
            className="w-5 h-5 rounded border-gray-500 text-teal-500 focus:ring-teal-500/20"
            aria-label="Enable daily reminders"
          />
          <div>
            <p className="text-white font-medium">Enable daily reminders</p>
            <p className="text-sm text-gray-400">Get notified about your daily tasks</p>
          </div>
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => setStep("leetcode")}
          className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleContinueFromContact}
          className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
        >
          Review Plan
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderReviewStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Review Your Plan</h2>
        <p className="text-gray-400 mt-2">Make sure everything looks good</p>
      </div>

      <div className="space-y-4">
        {/* Goal Summary */}
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white flex items-center gap-2">
              <span className="text-2xl">{data.analysis?.categoryIcon}</span>
              {data.analysis?.categoryName}
            </h3>
          </div>
          <p className="text-gray-400 text-sm mt-2">{data.goal}</p>
        </div>

        {/* AI Answers - Always visible */}
        {data.analysis?.questions.map((q) => {
          const answer = data.answers[q.id];
          const otherInput = data.otherInputs[q.id];
          
          // Build display labels, replacing "other" with custom input if available
          const answerLabels = getQuestionAnswerLabel(q, answer, otherInput);

          return (
            <div key={q.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm text-gray-400">{q.question}</p>
              <p className="text-white mt-1 font-medium">{answerLabels || "Not answered"}</p>
            </div>
          );
        })}

        {/* Quick Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs text-gray-500">Schedule</p>
            <p className="text-white font-medium">
              {data.scheduleType === "weekdays" ? "5 Days/Week" : "7 Days/Week"}
            </p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs text-gray-500">Time</p>
            <p className="text-white font-medium">
              {timeOptions.find((t) => t.value === data.timeCommitment)?.label}
            </p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs text-gray-500">Experience</p>
            <p className="text-white font-medium capitalize">{data.experience}</p>
          </div>
        </div>

        {/* LeetCode */}
        {data.includeLeetCode && (
          <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
            <p className="text-orange-400 text-sm flex items-center gap-2">
              <Code className="w-4 h-4" />
              Daily LeetCode in {leetCodeLanguages.find(l => l.value === data.leetCodeLanguage)?.label}
            </p>
          </div>
        )}

        {(data.email || data.phone) && (
          <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20">
            <p className="text-teal-400 text-sm">
              ✓ {data.firstName ? `Hi ${data.firstName}! ` : ""}Notifications will be sent to {[data.email, data.phone].filter(Boolean).join(" and ")}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => setStep(authUser ? "leetcode" : "contact")}
          className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Plan...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate My 12-Month Plan
            </>
          )}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {step === "goal" && renderGoalStep()}
          {step === "analyzing" && renderAnalyzingStep()}
          {step === "questions" && renderQuestionsStep()}
          {step === "schedule" && renderScheduleStep()}
          {step === "time" && renderTimeStep()}
          {step === "experience" && renderExperienceStep()}
          {step === "leetcode" && renderLeetCodeStep()}
          {step === "contact" && renderContactStep()}
          {step === "review" && renderReviewStep()}
        </AnimatePresence>
      </div>
    </div>
  );
}
