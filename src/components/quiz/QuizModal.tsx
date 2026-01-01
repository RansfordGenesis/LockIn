"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  Trophy,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import type { Quiz, Task } from "@/types/plan";

interface QuizModalProps {
  task: Task;
  onComplete: (passed: boolean, score: number) => void;
  onClose: () => void;
}

export default function QuizModal({ task, onComplete, onClose }: Readonly<QuizModalProps>) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState("");

  // Helper function to get next button text
  const getNextButtonText = () => {
    if (!showExplanation) return "Check Answer";
    const isLastQuestion = currentQuestionIndex >= (quiz?.questions.length || 0) - 1;
    return isLastQuestion ? "See Results" : "Next Question";
  };

  // Helper functions for DRY
  const getOptionColor = (isCorrect: boolean, isSelected: boolean, showingExplanation: boolean) => {
    if (showingExplanation && isCorrect) return "bg-green-500 text-white";
    if (showingExplanation && isSelected && !isCorrect) return "bg-red-500 text-white";
    if (isSelected) return "bg-teal-500 text-white";
    return "bg-white/10 text-gray-400";
  };

  // Helper: Calculate quiz score
  const calculateScore = useCallback((): number => {
    if (!quiz) return 0;
    return quiz.questions.reduce((score, q, index) => {
      return score + (selectedAnswers[index] === q.correctIndex ? 1 : 0);
    }, 0);
  }, [quiz, selectedAnswers]);

  // Helper: Handle navigation to next question or results
  const navigateToNext = useCallback(() => {
    if (!quiz) return;

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowExplanation(false);
    } else {
      setShowResults(true);
    }
  }, [quiz, currentQuestionIndex]);

  // Helper: Process quiz response data
  interface QuizResponse {
    success: boolean;
    quiz?: Quiz;
    error?: string;
  }
  const processQuizResponse = useCallback((data: QuizResponse) => {
    if (data.success && data.quiz) {
      setQuiz(data.quiz);
      setSelectedAnswers(new Array(data.quiz.questions.length).fill(null));
    } else {
      setError(data.error || "Failed to load quiz");
    }
  }, []);

  // Define fetchQuiz with useCallback so it can be used in useEffect
  const fetchQuiz = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.taskId,
          taskTitle: task.title,
          taskDescription: task.description,
          quizTopics: task.quizTopics,
          tags: task.tags,
        }),
      });

      const data = await response.json();
      processQuizResponse(data);
    } catch {
      setError("Failed to generate quiz. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [task.taskId, task.title, task.description, task.quizTopics, task.tags, processQuizResponse]);

  // Fetch quiz on mount
  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const handleSelectAnswer = (optionIndex: number) => {
    if (showExplanation) return; // Can't change answer after seeing explanation
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (!quiz) return;

    if (showExplanation) {
      navigateToNext();
    } else {
      setShowExplanation(true);
    }
  };

  const handleFinish = () => {
    const score = calculateScore();
    const passed = score >= (quiz?.passScore || 3);
    onComplete(passed, score);
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers(new Array(quiz?.questions.length || 5).fill(null));
    setShowResults(false);
    setShowExplanation(false);
  };

  // Helper: Render loading state
  const renderLoadingState = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-8 max-w-lg w-full mx-4 text-center"
      >
        <Loader2 className="w-12 h-12 text-teal-400 animate-spin mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Generating Quiz...</h3>
        <p className="text-gray-400">
          Creating 5 questions to verify your understanding
        </p>
      </motion.div>
    </div>
  );

  // Helper: Render error state
  const renderErrorState = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-8 max-w-lg w-full mx-4 text-center"
      >
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Quiz Error</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            onClick={fetchQuiz}
            className="px-6 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-400 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </motion.div>
    </div>
  );

  if (isLoading) return renderLoadingState();
  if (error) return renderErrorState();

  // Helper: Render results screen content
  const renderResultsContent = (score: number, passed: boolean) => (
    <>
      {passed ? (
        <>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-teal-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">🎉 Quiz Passed!</h3>
          <p className="text-gray-400 mb-4">
            You scored <span className="text-teal-400 font-bold">{score}/{quiz?.totalQuestions}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Great job! You&apos;ve demonstrated understanding of this topic.
          </p>
        </>
      ) : (
        <>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-orange-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Keep Learning!</h3>
          <p className="text-gray-400 mb-4">
            You scored <span className="text-orange-400 font-bold">{score}/{quiz?.totalQuestions}</span>
            <br />
            <span className="text-sm">Need {quiz?.passScore} to pass</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Review the material and try again when ready.
          </p>
        </>
      )}
    </>
  );

  if (showResults && quiz) {
    const score = calculateScore();
    const passed = score >= quiz.passScore;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-8 max-w-lg w-full mx-4"
        >
          <div className="text-center">
            {renderResultsContent(score, passed)}

            <div className="flex gap-3 justify-center">
              {!passed && (
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}
              <button
                onClick={handleFinish}
                className={`px-6 py-3 ${
                  passed
                    ? "bg-gradient-to-r from-teal-500 to-emerald-500"
                    : "bg-white/10"
                } text-white rounded-xl hover:opacity-90 flex items-center gap-2`}
              >
                {passed ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete Task
                  </>
                ) : (
                  "Close"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!quiz) return null;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const hasAnswered = selectedAnswers[currentQuestionIndex] !== null;
  const isCorrect = selectedAnswers[currentQuestionIndex] === currentQuestion.correctIndex;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Knowledge Check</h3>
            <p className="text-sm text-gray-400">{task.title}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-teal-400">
              {currentQuestionIndex + 1}/{quiz.totalQuestions}
            </p>
            <p className="text-xs text-gray-500">Pass: {quiz.passScore}+ correct</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentQuestionIndex + 1) / quiz.totalQuestions) * 100}%`,
            }}
          />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className="text-lg text-white mb-6">{currentQuestion.question}</p>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === index;
                const isCorrectOption = index === currentQuestion.correctIndex;
                
                let optionClass = "bg-white/5 border-white/10 hover:border-white/20";
                if (showExplanation) {
                  if (isCorrectOption) {
                    optionClass = "bg-teal-500/20 border-teal-500/50";
                  } else if (isSelected && !isCorrectOption) {
                    optionClass = "bg-red-500/20 border-red-500/50";
                  }
                } else if (isSelected) {
                  optionClass = "bg-teal-500/20 border-teal-500/50";
                }

                return (
                  <button
                    key={`${currentQuestionIndex}-${option}-${index}`}
                    onClick={() => handleSelectAnswer(index)}
                    disabled={showExplanation}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${optionClass} ${
                      showExplanation ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${getOptionColor(isCorrectOption, isSelected, showExplanation)}`}
                      >
                        {String.fromCodePoint(65 + index)}
                      </div>
                      <span className={showExplanation && isCorrectOption ? "text-teal-400" : "text-white"}>
                        {option}
                      </span>
                      {showExplanation && isCorrectOption && (
                        <CheckCircle className="w-5 h-5 text-teal-400 ml-auto" />
                      )}
                      {showExplanation && isSelected && !isCorrectOption && (
                        <XCircle className="w-5 h-5 text-red-400 ml-auto" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-xl ${
                  isCorrect ? "bg-teal-500/10 border border-teal-500/20" : "bg-orange-500/10 border border-orange-500/20"
                }`}
              >
                <p className={`text-sm font-medium ${isCorrect ? "text-teal-400" : "text-orange-400"}`}>
                  {isCorrect ? "✓ Correct!" : "✗ Not quite"}
                </p>
                <p className="text-sm text-gray-300 mt-1">{currentQuestion.explanation}</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleNext}
            disabled={!hasAnswered}
            className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {showExplanation && currentQuestionIndex < quiz.questions.length - 1 ? (
              <>
                Next Question
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              getNextButtonText()
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
