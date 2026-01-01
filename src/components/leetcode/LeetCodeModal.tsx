"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Code,
  Clock,
  Cpu,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Copy,
  Check,
} from "lucide-react";
import type { Task } from "@/types/plan";
import type { LeetCodeProblemDetail } from "@/lib/leetcode";
import { getDifficultyColor, getStarterCode } from "@/lib/leetcode";

// Helper: Get score color based on code review score
const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
};

interface LeetCodeModalProps {
  task: Task;
  language: string;
  onComplete: (passed: boolean, points: number, details: LeetCodeCompletionDetails) => void;
  onClose: () => void;
}

export interface LeetCodeCompletionDetails {
  problemSlug: string;
  problemTitle: string;
  difficulty: string;
  timeComplexity: string;
  spaceComplexity: string;
  isTimeCorrect: boolean;
  isSpaceCorrect: boolean;
  codeScore: number;
  feedback: string;
  // Note: We don't save the code to the database
}

type ModalStep = "loading" | "problem" | "code" | "complexity" | "verifying" | "result";

const COMPLEXITY_OPTIONS = [
  "O(1)",
  "O(log n)",
  "O(n)",
  "O(n log n)",
  "O(n²)",
  "O(n³)",
  "O(2^n)",
  "O(n!)",
];

export default function LeetCodeModal({
  task,
  language,
  onComplete,
  onClose,
}: Readonly<LeetCodeModalProps>) {
  const [step, setStep] = useState<ModalStep>("loading");
  const [problem, setProblem] = useState<LeetCodeProblemDetail | null>(null);
  const [code, setCode] = useState("");
  const [timeComplexity, setTimeComplexity] = useState("");
  const [spaceComplexity, setSpaceComplexity] = useState("");
  const [showHints, setShowHints] = useState(false);
  const [copiedStarter, setCopiedStarter] = useState(false);
  const [error, setError] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    isCorrect: boolean;
    complexityAnalysis: {
      isTimeCorrect: boolean;
      isSpaceCorrect: boolean;
      actualTimeComplexity: string;
      actualSpaceComplexity: string;
      explanation: string;
    };
    codeReview: {
      score: number;
      feedback: string;
      improvements: string[];
      correctness: string;
      issues: string[];
    };
    pointsEarned: number;
  } | null>(null);

  // Fetch problem details on mount - always get today's daily challenge
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        // First, fetch today's actual daily challenge from LeetCode
        const dailyResponse = await fetch("/api/leetcode-daily");
        const dailyData = await dailyResponse.json();

        if (dailyData.success && dailyData.problem) {
          setProblem(dailyData.problem);
          setCode(getStarterCode(dailyData.problem, language));
          setStep("problem");
          return;
        }

        // Fallback: If daily challenge fetch fails, show error
        setError("Could not fetch today's LeetCode Daily Challenge. Please try again or visit leetcode.com directly.");
      } catch (err) {
        console.error("Failed to fetch LeetCode daily:", err);
        setError("Failed to connect to LeetCode. Please check your connection and try again.");
      }
    };

    fetchProblem();
  }, [language]);

  // Legacy: Extract problem slug from task description (kept for backwards compatibility)
  const extractProblemSlug = (): string | null => {
    // Look for LeetCode URL pattern in description
    const urlPattern = /leetcode\.com\/problems\/([a-z0-9-]+)/i;
    const urlMatch = urlPattern.exec(task.description);
    if (urlMatch) return urlMatch[1];

    // Try to extract from title (e.g., "Two Sum" -> "two-sum")
    const titlePattern = /LeetCode.*?:\s*(.+)/i;
    const titleMatch = titlePattern.exec(task.title);
    if (titleMatch) {
      return titleMatch[1]
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/(^-)|(-$)/g, "");
    }

    return null;
  };


  const handleCopyStarter = () => {
    if (problem) {
      navigator.clipboard.writeText(getStarterCode(problem, language));
      setCopiedStarter(true);
      setTimeout(() => setCopiedStarter(false), 2000);
    }
  };

  const handleSubmitCode = () => {
    if (!code.trim() || code.trim().length < 20) {
      setError("Please paste your complete solution code.");
      return;
    }
    setError("");
    setStep("complexity");
  };

  const handleSubmitComplexity = async () => {
    if (!timeComplexity || !spaceComplexity) {
      setError("Please select both time and space complexity.");
      return;
    }

    setError("");
    setStep("verifying");

    try {
      const response = await fetch("/api/verify-leetcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemSlug: problem?.titleSlug || extractProblemSlug(),
          code,
          language,
          userTimeComplexity: timeComplexity,
          userSpaceComplexity: spaceComplexity,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationResult(data);
        setStep("result");
      } else {
        setError(data.error || "Verification failed. Please try again.");
        setStep("complexity");
      }
    } catch {
      setError("An error occurred during verification.");
      setStep("complexity");
    }
  };

  const handleComplete = () => {
    if (!verificationResult) return;

    onComplete(verificationResult.isCorrect, verificationResult.pointsEarned, {
      problemSlug: problem?.titleSlug || "",
      problemTitle: problem?.title || "",
      difficulty: problem?.difficulty || "",
      timeComplexity,
      spaceComplexity,
      isTimeCorrect: verificationResult.complexityAnalysis.isTimeCorrect,
      isSpaceCorrect: verificationResult.complexityAnalysis.isSpaceCorrect,
      codeScore: verificationResult.codeReview.score,
      feedback: verificationResult.codeReview.feedback,
    });
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
      <p className="text-gray-400">Loading problem details...</p>
    </div>
  );

  const renderProblem = () => (
    <div className="space-y-6">
      {/* Problem Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-white">{problem?.title}</h2>
            <span className={`px-2 py-1 rounded text-sm font-medium ${getDifficultyColor(problem?.difficulty || "")}`}>
              {problem?.difficulty}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {problem?.topicTags.map((tag) => (
              <span key={tag.slug} className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded">
                {tag.name}
              </span>
            ))}
          </div>
        </div>
        <a
          href={`https://leetcode.com/problems/${problem?.titleSlug}/description/?envType=daily-question&envId=${new Date().toISOString().split('T')[0]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open in LeetCode
        </a>
      </div>

      {/* Problem Description */}
      <div className="bg-white/5 rounded-xl p-6 max-h-[400px] overflow-y-auto">
        <div
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: problem?.content || "" }}
        />
      </div>

      {/* Hints */}
      {problem?.hints && problem.hints.length > 0 && (
        <div>
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            {showHints ? "Hide Hints" : `Show ${problem.hints.length} Hints`}
            {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {showHints && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2">
                  {problem.hints.map((hint, i) => (
                    <div key={`hint-${hint.substring(0, 20)}-${i}`} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-amber-200 text-sm" dangerouslySetInnerHTML={{ __html: hint }} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => setStep("code")}
          className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-lg hover:from-teal-400 hover:to-emerald-400 transition-colors"
        >
          I&apos;ve Solved It - Submit Code
        </button>
      </div>
    </div>
  );

  const renderCodeInput = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Submit Your Solution</h2>
        <p className="text-gray-400">
          Paste your {language} solution code below. Make sure it&apos;s the complete, working solution.
        </p>
      </div>

      {/* Starter Code */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Starter Code for {language}</span>
          <button
            onClick={handleCopyStarter}
            className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            {copiedStarter ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedStarter ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-xs text-gray-500 overflow-x-auto">
          {problem && getStarterCode(problem, language)}
        </pre>
      </div>

      {/* Code Input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          <Code className="w-4 h-4 inline mr-2" />
          Your Solution Code
        </label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={`Paste your ${language} solution here...`}
          className="w-full h-64 p-4 bg-[#1e1e1e] border border-white/10 rounded-xl text-green-400 font-mono text-sm placeholder-gray-600 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 resize-none"
          spellCheck={false}
        />
        <p className="text-xs text-gray-500 mt-1">{code.length} characters</p>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep("problem")}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Back to Problem
        </button>
        <button
          onClick={handleSubmitCode}
          disabled={code.trim().length < 20}
          className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-lg hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue to Complexity Analysis
        </button>
      </div>
    </div>
  );

  const renderComplexityInput = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Complexity Analysis</h2>
        <p className="text-gray-400">
          What&apos;s the time and space complexity of your solution? This helps reinforce your understanding.
        </p>
      </div>

      {/* Time Complexity */}
      <div>
        <label className="block text-sm text-gray-400 mb-3">
          <Clock className="w-4 h-4 inline mr-2" />
          Time Complexity
        </label>
        <div className="grid grid-cols-4 gap-2">
          {COMPLEXITY_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setTimeComplexity(option)}
              className={`p-3 rounded-lg border text-sm font-mono transition-all ${
                timeComplexity === option
                  ? "bg-teal-500/20 border-teal-500/50 text-teal-400"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Space Complexity */}
      <div>
        <label className="block text-sm text-gray-400 mb-3">
          <Cpu className="w-4 h-4 inline mr-2" />
          Space Complexity
        </label>
        <div className="grid grid-cols-4 gap-2">
          {COMPLEXITY_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setSpaceComplexity(option)}
              className={`p-3 rounded-lg border text-sm font-mono transition-all ${
                spaceComplexity === option
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep("code")}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Back to Code
        </button>
        <button
          onClick={handleSubmitComplexity}
          disabled={!timeComplexity || !spaceComplexity}
          className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-lg hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Verify My Solution
        </button>
      </div>
    </div>
  );

  const renderVerifying = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <Loader2 className="w-16 h-16 text-teal-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Code className="w-6 h-6 text-teal-300" />
        </div>
      </div>
      <p className="text-white text-lg mt-6">Analyzing your solution...</p>
      <p className="text-gray-400 text-sm mt-2">
        Checking correctness, complexity, and code quality
      </p>
    </div>
  );

  const renderResult = () => {
    if (!verificationResult) return null;

    const { isCorrect, complexityAnalysis, codeReview, pointsEarned } = verificationResult;

    return (
      <div className="space-y-6">
        {/* Result Header */}
        <div className={`p-6 rounded-xl ${isCorrect ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"}`}>
          <div className="flex items-center gap-4">
            {isCorrect ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500" />
            )}
            <div>
              <h2 className={`text-2xl font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                {isCorrect ? "Solution Accepted!" : "Needs Improvement"}
              </h2>
              <p className="text-gray-400">
                {isCorrect
                  ? `Great job! You earned ${pointsEarned} points.`
                  : "Review the feedback below and try again."}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-3xl font-bold text-white">+{pointsEarned}</p>
              <p className="text-sm text-gray-400">points</p>
            </div>
          </div>
        </div>

        {/* Complexity Analysis */}
        <div className="bg-white/5 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Complexity Analysis</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`p-4 rounded-lg ${complexityAnalysis.isTimeCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Time Complexity</span>
                {complexityAnalysis.isTimeCorrect ? (
                  <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                )}
              </div>
              <p className="font-mono">
                <span className="text-gray-500">Your answer: </span>
                <span className={complexityAnalysis.isTimeCorrect ? "text-green-400" : "text-red-400"}>
                  {timeComplexity}
                </span>
              </p>
              {!complexityAnalysis.isTimeCorrect && (
                <p className="font-mono mt-1">
                  <span className="text-gray-500">Correct: </span>
                  <span className="text-teal-400">{complexityAnalysis.actualTimeComplexity}</span>
                </p>
              )}
            </div>

            <div className={`p-4 rounded-lg ${complexityAnalysis.isSpaceCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Space Complexity</span>
                {complexityAnalysis.isSpaceCorrect ? (
                  <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                )}
              </div>
              <p className="font-mono">
                <span className="text-gray-500">Your answer: </span>
                <span className={complexityAnalysis.isSpaceCorrect ? "text-green-400" : "text-red-400"}>
                  {spaceComplexity}
                </span>
              </p>
              {!complexityAnalysis.isSpaceCorrect && (
                <p className="font-mono mt-1">
                  <span className="text-gray-500">Correct: </span>
                  <span className="text-purple-400">{complexityAnalysis.actualSpaceComplexity}</span>
                </p>
              )}
            </div>
          </div>
          <p className="text-gray-400 text-sm">{complexityAnalysis.explanation}</p>
        </div>

        {/* Code Review */}
        <div className="bg-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Code Review</h3>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Score:</span>
              <span className={`text-xl font-bold ${getScoreColor(codeReview.score)}`}>
                {codeReview.score}/100
              </span>
            </div>
          </div>
          <p className="text-gray-300 mb-4">{codeReview.feedback}</p>

          {codeReview.issues && codeReview.issues.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-red-400 font-medium mb-2">Issues Found:</p>
              <ul className="space-y-1">
                {codeReview.issues.map((issue) => (
                  <li key={`issue-${issue.substring(0, 30)}`} className="text-sm text-red-300 flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {codeReview.improvements && codeReview.improvements.length > 0 && (
            <div>
              <p className="text-sm text-teal-400 font-medium mb-2">Suggestions for Improvement:</p>
              <ul className="space-y-1">
                {codeReview.improvements.map((improvement) => (
                  <li key={`improvement-${improvement.substring(0, 30)}`} className="text-sm text-gray-400 flex items-start gap-2">
                    <span className="text-teal-500">•</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {!isCorrect && (
            <button
              onClick={() => {
                setStep("code");
                setVerificationResult(null);
              }}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Try Again
            </button>
          )}
          <button
            onClick={handleComplete}
            className={`px-6 py-2 font-medium rounded-lg transition-colors ${
              isCorrect
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isCorrect ? "Complete Task" : "Close"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl max-h-[90vh] bg-[#121214] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <span className="text-xl">🧩</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">LeetCode Challenge</h3>
              <p className="text-sm text-gray-400">{task.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {step === "loading" && renderLoading()}
          {step === "problem" && renderProblem()}
          {step === "code" && renderCodeInput()}
          {step === "complexity" && renderComplexityInput()}
          {step === "verifying" && renderVerifying()}
          {step === "result" && renderResult()}

          {error && step === "loading" && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
