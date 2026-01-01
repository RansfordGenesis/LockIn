"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, BookOpen, RefreshCw } from "lucide-react";
import type { Task, Resource } from "@/types/plan";

interface ResourcesModalProps {
  task: Task;
  category: string;
  onClose: () => void;
}

// Resource type styling
const resourceStyles: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  documentation: { icon: "📖", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  video: { icon: "🎥", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  course: { icon: "🎓", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  article: { icon: "📄", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  tutorial: { icon: "📝", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  exercise: { icon: "💪", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  book: { icon: "📚", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
  podcast: { icon: "🎙️", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30" },
  tool: { icon: "🔧", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  project: { icon: "🚀", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30" },
};

export default function ResourcesModal({ task, category, onClose }: Readonly<ResourcesModalProps>) {
  const [resources, setResources] = useState<Resource[]>(task.resources || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch AI-generated resources if none exist
  const fetchResources = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/generate-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description,
          taskType: task.type,
          category,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.resources) {
        setResources(data.resources);
      } else {
        setError(data.error || "Failed to generate resources");
      }
    } catch (err) {
      console.error("Error fetching resources:", err);
      setError("Failed to connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch if no resources
  useEffect(() => {
    if (resources.length === 0) {
      fetchResources();
    }
  }, []);

  const getStyle = (type: string) => resourceStyles[type] || resourceStyles.article;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Learning Resources</h2>
                <p className="text-sm text-gray-400 line-clamp-1">{task.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-4" />
                <p className="text-gray-400">Finding the best resources for you...</p>
                <p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <span className="text-3xl">😕</span>
                </div>
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={fetchResources}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            ) : resources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-500/20 flex items-center justify-center mb-4">
                  <span className="text-3xl">📭</span>
                </div>
                <p className="text-gray-400 mb-4">No resources found</p>
                <button
                  onClick={fetchResources}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate Resources
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Resource count */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-400">
                    {resources.length} resource{resources.length !== 1 ? "s" : ""} found
                  </p>
                  <button
                    onClick={fetchResources}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>

                {/* Resources list */}
                {resources.map((resource, index) => {
                  const style = getStyle(resource.type);
                  
                  return (
                    <motion.a
                      key={`${resource.url}-${index}`}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`block p-4 rounded-xl ${style.bg} border ${style.border} hover:scale-[1.02] transition-all duration-200 group`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-2xl mt-0.5">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-medium ${style.color} group-hover:underline`}>
                                {resource.title}
                              </h3>
                              {resource.description && (
                                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                                  {resource.description}
                                </p>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white flex-shrink-0 mt-1" />
                          </div>
                          
                          {/* Meta info */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {resource.source && (
                              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">
                                {resource.source}
                              </span>
                            )}
                            <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400 capitalize">
                              {resource.type}
                            </span>
                            {resource.difficulty && (
                              <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                                resource.difficulty === "beginner" ? "bg-green-500/20 text-green-400" :
                                resource.difficulty === "intermediate" ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-red-500/20 text-red-400"
                              }`}>
                                {resource.difficulty}
                              </span>
                            )}
                            {resource.isFree && (
                              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                                Free
                              </span>
                            )}
                            {resource.estimatedMinutes && (
                              <span className="text-xs text-gray-500">
                                ~{resource.estimatedMinutes} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <p className="text-xs text-gray-500 text-center">
              💡 Resources are curated to help you master this task. Click any to open in a new tab.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
