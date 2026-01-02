"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Target,
  Code,
  Calendar,
  Home,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { PLAN_CATEGORIES, TIMELINE_PRESETS, type PlanCategory } from "@/types/multiplan";

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
  // New fields for category and timeline
  selectedCategory: PlanCategory | null;
  startDate: string;
  timelineDays: number;
}

const leetCodeLanguages = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
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

export default function AIFirstWizard({ onComplete, onCancel, authUser }: Readonly<{ onComplete: (data: WizardData) => void; onCancel?: () => void; authUser: AuthUserInfo }>) {
  // authUser is always provided - contact info comes from auth screen
  const [step, setStep] = useState<"category" | "goal" | "analyzing" | "questions" | "timeline" | "schedule" | "hours" | "leetcode" | "review">("category");
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
    // New defaults
    selectedCategory: null,
    startDate: new Date().toISOString().split('T')[0],
    timelineDays: 365,
  }));

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  // Track dynamically generated follow-up questions for "Other" inputs
  const [dynamicQuestions, setDynamicQuestions] = useState<Record<string, AIQuestion>>({});
  // Track if user went through the hours step manually
  const [wentThroughHoursStep, setWentThroughHoursStep] = useState(false); 

  // Event handlers to reduce nesting
  const handleGoalExampleClick = (example: string) => {
    setData((prev) => ({ ...prev, goal: example }));
  };

  const handleScheduleTypeSelect = (scheduleType: "weekdays" | "fullweek") => {
    setData((prev) => ({ ...prev, scheduleType }));
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
    setAnalyzeError(null);
    setStep("analyzing");

    try {
      const response = await fetch("/api/analyze-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          goal: data.goal, 
          selectedCategory: data.selectedCategory,
          categoryName: selectedCategoryConfig?.name 
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData((prev) => ({
          ...prev,
          analysis: result,
          timeCommitment: result.suggestedTimeCommitment || "1hr-daily",
        }));
        setStep("questions");
      } else {
        setAnalyzeError(result.error || "We couldn't analyze your goal. Please try again.");
      }
    } catch (err) {
      console.error("Goal analysis error:", err);
      setAnalyzeError("Our AI is taking a break. Please try again in a moment.");
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

  // Build the effective question list including conditional questions and dynamic "Other" follow-ups
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

      // Check if there's a dynamically generated follow-up for "Other" input
      const dynamicFollowUp = dynamicQuestions[`${question.id}-other`];
      if (dynamicFollowUp) {
        const answer = data.answers[question.id];
        const hasOther = answer === "other" || (Array.isArray(answer) && answer.includes("other"));
        if (hasOther) {
          effectiveQuestions.push(dynamicFollowUp);
        }
      }
    }

    return effectiveQuestions;
  };

  const nextQuestion = async () => {
    if (!data.analysis) return;

    const effectiveQuestions = getEffectiveQuestions();
    const currentQuestion = effectiveQuestions[currentQuestionIndex];
    const answer = data.answers[currentQuestion.id];
    const otherInput = data.otherInputs[currentQuestion.id];

    // Check if user selected "other" and typed a custom value
    const hasOtherWithInput = (answer === "other" || (Array.isArray(answer) && answer.includes("other"))) && otherInput;
    
    // If "other" is selected and we haven't already generated a follow-up for this question
    if (hasOtherWithInput && !dynamicQuestions[`${currentQuestion.id}-other`]) {
      setIsLoadingFollowUp(true);
      try {
        const response = await fetch("/api/generate-followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: data.goal,
            categoryName: selectedCategoryConfig?.name,
            parentQuestion: currentQuestion.question,
            customAnswer: otherInput,
            previousAnswers: data.answers,
          }),
        });
        const result = await response.json();
        if (result.success && result.question) {
          // Store the dynamically generated question
          setDynamicQuestions(prev => ({
            ...prev,
            [`${currentQuestion.id}-other`]: {
              ...result.question,
              id: `${currentQuestion.id}-followup`,
            }
          }));
        }
      } catch (err) {
        console.error("Failed to generate follow-up question:", err);
      }
      setIsLoadingFollowUp(false);
    }

    if (currentQuestionIndex < effectiveQuestions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else {
      // If AI asked about timeline, extract and apply the user's answer
      if (aiAskedAboutTimeline()) {
        const extractedTimeline = extractTimelineFromAIAnswer();
        setData((prev) => ({ ...prev, timelineDays: extractedTimeline }));
      }
      setStep("timeline");
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

  // Get selected category config
  const selectedCategoryConfig = data.selectedCategory 
    ? PLAN_CATEGORIES.find(c => c.id === data.selectedCategory) 
    : null;

  // Helper: Check if AI asked about timeline in questions
  const aiAskedAboutTimeline = (): boolean => {
    if (!data.analysis?.questions) return false;
    const timelineKeywords = ["timeline", "how long", "duration", "months", "weeks", "time frame", "study period"];
    return data.analysis.questions.some(q => 
      timelineKeywords.some(keyword => q.question.toLowerCase().includes(keyword))
    );
  };

  // Helper: Check if AI asked about daily hours/time commitment
  const aiAskedAboutHours = (): boolean => {
    if (!data.analysis?.questions) return false;
    const hoursKeywords = ["how much time", "hours per day", "time per day", "daily commitment", "time commitment", "hours daily"];
    return data.analysis.questions.some(q => 
      hoursKeywords.some(keyword => q.question.toLowerCase().includes(keyword))
    );
  };

  // Helper: Check if user was explicitly asked about hours (either by AI or wizard)
  // Returns true if:
  // 1. AI asked about hours in questions, OR
  // 2. User went through the hours step manually
  const userWasAskedAboutHours = (): boolean => {
    // If AI asked about hours in questions
    if (aiAskedAboutHours()) return true;
    // If user went through the hours step manually
    if (wentThroughHoursStep) return true;
    // Otherwise, AI suggested without asking
    return false;
  };

  // Helper: Extract time commitment from AI question answer and map to standard format
  const extractTimeCommitmentFromAIAnswer = (): string => {
    if (!data.analysis?.questions) return "1hr-daily";
    
    const hoursKeywords = ["how much time", "hours per day", "time per day", "daily commitment", "time commitment", "hours daily"];
    const hoursQuestion = data.analysis.questions.find(q => 
      hoursKeywords.some(keyword => q.question.toLowerCase().includes(keyword))
    );
    
    if (!hoursQuestion) return "1hr-daily";
    
    const answer = data.answers[hoursQuestion.id];
    const answerStr = (Array.isArray(answer) ? answer[0] : answer)?.toLowerCase() || "";
    const otherInput = data.otherInputs[hoursQuestion.id]?.toLowerCase() || "";
    const combined = answerStr + " " + otherInput;
    
    // Map common answer patterns to standard time commitment values
    if (combined.includes("3") || combined.includes("three") || combined.includes("intensive") || combined.includes("full")) {
      return "3hr-daily";
    }
    if (combined.includes("2") || combined.includes("two") || combined.includes("accelerat")) {
      return "2hr-daily";
    }
    if (combined.includes("30") || combined.includes("half") || combined.includes("light") || combined.includes("minimal")) {
      return "30min-daily";
    }
    // Default to 1 hour
    return "1hr-daily";
  };

  // Helper: Extract timeline (days) from AI question answer
  const extractTimelineFromAIAnswer = (): number => {
    if (!data.analysis?.questions) return 365;
    
    const timelineKeywords = ["timeline", "how long", "duration", "months", "weeks", "time frame", "study period"];
    const timelineQuestion = data.analysis.questions.find(q => 
      timelineKeywords.some(keyword => q.question.toLowerCase().includes(keyword))
    );
    
    if (!timelineQuestion) return 365;
    
    const answer = data.answers[timelineQuestion.id];
    const answerStr = (Array.isArray(answer) ? answer[0] : answer)?.toLowerCase() || "";
    const otherInput = data.otherInputs[timelineQuestion.id]?.toLowerCase() || "";
    const combined = answerStr + " " + otherInput;
    
    // Map common answer patterns to timeline days
    // 1-3 months / short / quick / intensive
    if (combined.includes("1 month") || combined.includes("1-month") || combined.includes("30 day")) {
      return 30;
    }
    if (combined.includes("2 month") || combined.includes("2-month") || combined.includes("60 day")) {
      return 60;
    }
    if (combined.includes("3 month") || combined.includes("3-month") || combined.includes("90 day") || combined.includes("quarter")) {
      return 90;
    }
    // 3-6 months / medium / moderate
    if (combined.includes("3-6") || combined.includes("4 month") || combined.includes("5 month") || combined.includes("6 month") || combined.includes("half year") || combined.includes("semester")) {
      return 180;
    }
    // 6-12 months / long / comprehensive
    if (combined.includes("6-12") || combined.includes("9 month") || combined.includes("year") || combined.includes("12 month") || combined.includes("365")) {
      return 365;
    }
    // Specific week patterns
    if (combined.includes("week")) {
      const weekMatch = combined.match(/(\d+)\s*week/);
      if (weekMatch) {
        const weeks = parseInt(weekMatch[1]);
        return weeks * 7;
      }
    }
    // Specific month patterns
    if (combined.includes("month")) {
      const monthMatch = combined.match(/(\d+)\s*month/);
      if (monthMatch) {
        const months = parseInt(monthMatch[1]);
        return months * 30;
      }
    }
    
    // Default to 6 months if AI asked but we can't parse
    return 180;
  };

  const renderCategoryStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Back to Dashboard button */}
      {onCancel && (
        <div className="flex justify-start">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm">Back to Dashboard</span>
          </button>
        </div>
      )}

      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
          <Target className="w-10 h-10 text-teal-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">
          What do you want to master?
        </h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Choose a category that best fits your learning goal
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PLAN_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setData((prev) => ({ 
              ...prev, 
              selectedCategory: category.id,
              // Auto-enable LeetCode for software category
              includeLeetCode: category.showLeetCode ? prev.includeLeetCode : false
            }))}
            className={`p-4 rounded-xl border text-left transition-all ${
              data.selectedCategory === category.id
                ? "bg-teal-500/20 border-teal-500/50"
                : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{category.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm sm:text-base">{category.name}</p>
                <p className="text-xs text-gray-400 mt-1">{category.description}</p>
              </div>
              {data.selectedCategory === category.id && (
                <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Sample goals for selected category */}
      {selectedCategoryConfig && selectedCategoryConfig.sampleGoals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-4 bg-white/5 rounded-xl border border-white/10"
        >
          <p className="text-xs text-gray-500 mb-2">Popular goals in {selectedCategoryConfig.name}:</p>
          <div className="flex flex-wrap gap-2">
            {selectedCategoryConfig.sampleGoals.map((goal) => (
              <span
                key={goal}
                className="px-2 py-1 text-xs bg-teal-500/10 text-teal-400 rounded-lg"
              >
                {goal}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => setStep("goal")}
          disabled={!data.selectedCategory}
          className="flex-1 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
        >
          Continue
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );

  const renderGoalStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Category indicator */}
      {selectedCategoryConfig && (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
          <span className="text-2xl">{selectedCategoryConfig.icon}</span>
          <div className="flex-1">
            <p className="text-sm text-gray-400">Category</p>
            <p className="font-medium text-white">{selectedCategoryConfig.name}</p>
          </div>
          <button
            onClick={() => setStep("category")}
            className="text-xs text-teal-400 hover:text-teal-300"
          >
            Change
          </button>
        </div>
      )}

      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Describe your goal
        </h2>
        <p className="text-gray-400 text-sm">
          Be specific about what you want to achieve
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
          AI-Generated Plan
        </button>
        <button
          onClick={() => setData((prev) => ({ ...prev, useCustomCurriculum: true }))}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            data.useCustomCurriculum
              ? "bg-teal-500 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          My Own Curriculum
        </button>
      </div>

      {data.useCustomCurriculum ? (
        <>
          <div className="relative">
            <textarea
              value={data.customCurriculum}
              onChange={(e) => setData((prev) => ({ ...prev, customCurriculum: e.target.value }))}
              placeholder={`Paste your learning curriculum here. Example format:

Core Foundations
- Python (OOP, async/await, decorators)
- Git & GitHub (version control, branching)
- Linux & CLI basics

Web & HTTP
- HTTP methods (GET, POST, PUT, DELETE)
- REST principles
- JSON & serialization

Backend Frameworks
- Django (models, views, templates)
- FastAPI (path operations, Pydantic)
...`}
              className="w-full h-48 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 resize-none transition-all font-mono text-sm"
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-500">
              {data.customCurriculum.length} characters
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-blue-400 text-sm">
              <strong>Tip:</strong> Use bullet points or checkboxes. We&apos;ll parse your curriculum and create daily tasks for you to track!
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("category")}
              className="px-6 py-4 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
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
                setStep("timeline");
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
              placeholder={selectedCategoryConfig 
                ? `Example: I want to ${selectedCategoryConfig.sampleGoals[0]?.toLowerCase() || "learn something new"}...`
                : "Example: I want to become a full-stack developer..."
              }
              className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 resize-none transition-all"
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-500">
              {data.goal.length} characters
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("category")}
              className="px-6 py-4 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
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

          {/* Sample goals for selected category */}
          {selectedCategoryConfig && selectedCategoryConfig.sampleGoals.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-sm text-gray-500 text-center mb-3">Quick start examples:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedCategoryConfig.sampleGoals.map((example) => (
                  <button
                    key={example}
                    onClick={() => handleGoalExampleClick(`I want to ${example.toLowerCase()}`)}
                    className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white hover:border-teal-500/30 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
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
      {analyzeError ? (
        // Error state with friendly message and retry
        <>
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
          </div>
          <h3 className="mt-8 text-xl font-semibold text-white">Oops! Something went wrong</h3>
          <p className="mt-2 text-gray-400 text-center max-w-sm">
            {analyzeError}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                setAnalyzeError(null);
                setStep("goal");
              }}
              className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button
              onClick={() => {
                setAnalyzeError(null);
                analyzeGoal();
              }}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </>
      ) : (
        // Loading state
        <>
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
        </>
      )}
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
            disabled={!isAnswered || isLoadingFollowUp}
            className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoadingFollowUp ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {currentQuestionIndex < effectiveQuestions.length - 1 ? "Next Question" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  };

  const renderTimelineStep = () => {
    const selectedPreset = TIMELINE_PRESETS.find(p => p.days === data.timelineDays);
    const skipDurationSelection = aiAskedAboutTimeline();
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {skipDurationSelection ? "When do you want to start?" : "Plan Timeline"}
          </h2>
          <p className="text-gray-400 mt-2">
            {skipDurationSelection 
              ? "Choose your start date for the learning journey"
              : "How long do you want your learning journey to be?"
            }
          </p>
        </div>

        {/* Timeline presets - only show if AI didn't ask about timeline */}
        {!skipDurationSelection && (
          <div className="grid grid-cols-3 gap-3">
            {TIMELINE_PRESETS.map((preset) => (
              <button
                key={preset.days}
                onClick={() => setData((prev) => ({ ...prev, timelineDays: preset.days }))}
                className={`p-4 rounded-xl border text-center transition-all ${
                  data.timelineDays === preset.days
                    ? "bg-teal-500/20 border-teal-500/50"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                <p className="font-bold text-white">{preset.label}</p>
                <p className="text-xs text-gray-400 mt-1">{preset.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Start Date */}
        <div className="space-y-2">
          <label htmlFor="start-date-input" className="block text-sm text-gray-400">Start Date</label>
          <div className="flex gap-3">
            <input
              id="start-date-input"
              type="date"
              value={data.startDate}
              onChange={(e) => setData((prev) => ({ ...prev, startDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
            />
            <button
              onClick={() => setData((prev) => ({ ...prev, startDate: new Date().toISOString().split('T')[0] }))}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20"
            >
              Today
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-teal-500/10 rounded-xl border border-teal-500/20">
          {!skipDurationSelection && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Duration:</span>
              <span className="text-teal-400 font-medium">{selectedPreset?.label || `${data.timelineDays} days`}</span>
            </div>
          )}
          <div className={`flex items-center justify-between text-sm ${!skipDurationSelection ? 'mt-2' : ''}`}>
            <span className="text-gray-400">Start:</span>
            <span className="text-teal-400 font-medium">
              {new Date(data.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          {!skipDurationSelection && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-400">End:</span>
              <span className="text-teal-400 font-medium">
                {new Date(new Date(data.startDate).getTime() + data.timelineDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => {
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
            onClick={() => setStep("schedule")}
            className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
          >
            Continue
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
          <Calendar className="w-8 h-8 text-teal-400" />
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
            ? `5 days/week for ${data.timelineDays} days = ~${Math.round(data.timelineDays * 5 / 7)} learning days`
            : `7 days/week for ${data.timelineDays} days = ${data.timelineDays} learning days`}
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => setStep("timeline")}
          className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => {
            // Only skip hours step if AI explicitly asked about time commitment in questions
            // If AI suggested a time without asking, still let user confirm/change in hours step
            const skipHoursStep = aiAskedAboutHours();
            
            // Auto-set experience based on the goal context (intermediate by default)
            if (!data.experience) {
              setData((prev) => ({ ...prev, experience: "intermediate" }));
            }
            
            if (skipHoursStep) {
              // AI asked about hours - extract the answer and map to timeCommitment
              const extractedTime = extractTimeCommitmentFromAIAnswer();
              setData((prev) => ({ ...prev, timeCommitment: extractedTime }));
              
              // Only show LeetCode step for Software Development category
              if (data.selectedCategory === "software") {
                setStep("leetcode");
              } else {
                setStep("review");
              }
            } else {
              // AI didn't ask about hours - ask user manually
              setWentThroughHoursStep(true);
              setStep("hours");
            }
          }}
          className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderHoursStep = () => (
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        {timeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setData((prev) => ({ ...prev, timeCommitment: option.value }))}
            className={`p-4 rounded-xl border text-center transition-all ${
              data.timeCommitment === option.value
                ? "bg-teal-500/20 border-teal-500/50"
                : "bg-white/5 border-white/10 hover:border-white/20"
            }`}
          >
            <p className="text-xl font-bold text-white">{option.label}</p>
            <p className="text-sm text-gray-400 mt-1">{option.description}</p>
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
          onClick={() => {
            // Set default if not selected
            if (!data.timeCommitment) {
              setData((prev) => ({ ...prev, timeCommitment: "1hr-daily" }));
            }
            // Auto-set experience based on the goal context (intermediate by default)
            if (!data.experience) {
              setData((prev) => ({ ...prev, experience: "intermediate" }));
            }
            // Only show LeetCode step for Software Development category
            if (data.selectedCategory === "software") {
              setStep("leetcode");
            } else {
              setStep("review");
            }
          }}
          disabled={!data.timeCommitment}
          className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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
          <Code className="w-6 h-6 text-orange-400" />
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
                  className={`p-3 rounded-xl border text-center transition-all ${
                    data.leetCodeLanguage === lang.value
                      ? "bg-orange-500/20 border-orange-500/50 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                  }`}
                >
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <p className="text-orange-400 text-sm">
                How it works: Each day you&apos;ll get a LeetCode problem. Complete it, paste your code, and we&apos;ll verify your solution!
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => {
            // Go back to hours step if user went through it, otherwise schedule
            if (aiAskedAboutHours()) {
              setStep("schedule");
            } else {
              setStep("hours");
            }
          }}
          className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setStep("review")}
          className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderReviewStep = () => {
    const timelinePreset = TIMELINE_PRESETS.find(p => p.days === data.timelineDays);
    const endDate = new Date(new Date(data.startDate).getTime() + data.timelineDays * 24 * 60 * 60 * 1000);
    
    return (
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
          {/* Category & Goal Summary */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white flex items-center gap-2">
                <span className="text-2xl">{selectedCategoryConfig?.icon || data.analysis?.categoryIcon}</span>
                {selectedCategoryConfig?.name || data.analysis?.categoryName}
              </h3>
            </div>
            <p className="text-gray-400 text-sm mt-2">{data.goal}</p>
          </div>

          {/* Timeline Summary */}
          <div className="p-4 bg-teal-500/10 rounded-xl border border-teal-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span className="text-teal-400 font-medium">Timeline</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Duration</p>
                <p className="text-white font-medium">{timelinePreset?.label || `${data.timelineDays} days`}</p>
              </div>
              <div>
                <p className="text-gray-500">Start</p>
                <p className="text-white font-medium">{new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-gray-500">End</p>
                <p className="text-white font-medium">{endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
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

          {/* Quick Summary - only show items user was asked about */}
          <div className={`grid gap-3 ${userWasAskedAboutHours() ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-gray-500">Schedule</p>
              <p className="text-white font-medium">
                {data.scheduleType === "weekdays" ? "5 Days/Week" : "7 Days/Week"}
              </p>
            </div>
            {/* Only show time if user was explicitly asked (not auto-suggested by AI) */}
            {userWasAskedAboutHours() && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-gray-500">Time</p>
                <p className="text-white font-medium">
                  {timeOptions.find((t) => t.value === data.timeCommitment)?.label || "Flexible"}
                </p>
              </div>
            )}
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
            onClick={() => {
              // Go back based on category and whether hours step was shown
              if (data.selectedCategory === "software") {
                setStep("leetcode");
              } else if (aiAskedAboutHours()) {
                // AI asked about hours, so we skipped hours step - go back to schedule
                setStep("schedule");
              } else {
                // User went through hours step
                setStep("hours");
              }
            }}
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
                Generate My Plan
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {step === "category" && renderCategoryStep()}
          {step === "goal" && renderGoalStep()}
          {step === "analyzing" && renderAnalyzingStep()}
          {step === "questions" && renderQuestionsStep()}
          {step === "timeline" && renderTimelineStep()}
          {step === "schedule" && renderScheduleStep()}
          {step === "hours" && renderHoursStep()}
          {step === "leetcode" && renderLeetCodeStep()}
          {step === "review" && renderReviewStep()}
        </AnimatePresence>
      </div>
    </div>
  );
}
