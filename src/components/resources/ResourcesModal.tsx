"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, RefreshCw, AlertCircle, Sparkles, BookOpen } from "lucide-react";
import type { Task, Resource } from "@/types/plan";

interface ResourcesModalProps {
  task: Task;
  category: string;
  onClose: () => void;
}

// Resource type styling
const resourceStyles: Record<string, { abbrev: string; color: string; bg: string; border: string }> = {
  documentation: { abbrev: "DOC", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  video: { abbrev: "VID", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  course: { abbrev: "CRS", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  article: { abbrev: "ART", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  tutorial: { abbrev: "TUT", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  exercise: { abbrev: "EXC", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  book: { abbrev: "BK", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
  podcast: { abbrev: "POD", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30" },
  tool: { abbrev: "TL", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  project: { abbrev: "PRJ", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30" },
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
          {/* Header - compact */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-teal-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Resources</h2>
                <p className="text-xs text-gray-400 line-clamp-1">{task.title}</p>
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
          <div className="p-4 overflow-y-auto max-h-[calc(85vh-120px)]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
                </div>
                <p className="text-gray-300 mt-4 font-medium">Hunting for the best resources...</p>
                <p className="text-sm text-gray-500 mt-1">Our AI is searching far and wide</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Oops! Hit a snag</h3>
                <p className="text-gray-400 text-center max-w-sm mb-4">
                  Our resource finder got a little lost. Don&apos;t worry, let&apos;s try again!
                </p>
                <button
                  onClick={fetchResources}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            ) : resources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Ready to explore?</h3>
                <p className="text-gray-400 text-center max-w-sm mb-4">
                  Click below to discover curated learning resources!
                </p>
                <button
                  onClick={fetchResources}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-xl hover:from-teal-400 hover:to-emerald-400 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Find Resources
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Resources list - compact cards */}
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
                      transition={{ delay: index * 0.03 }}
                      className={`flex items-center gap-3 p-3 rounded-xl ${style.bg} border ${style.border} hover:scale-[1.01] transition-all duration-150 group`}
                    >
                      <span className="text-xs font-bold uppercase ${style.color}">{style.abbrev}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-sm ${style.color} group-hover:underline truncate`}>
                          {resource.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{resource.source}</span>
                          {resource.isFree ? (
                            <span className="text-xs text-emerald-400">Free</span>
                          ) : (
                            <span className="text-xs text-amber-400">Paid</span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white flex-shrink-0" />
                    </motion.a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer - minimal */}
          <div className="px-4 py-2 border-t border-white/10 bg-black/20">
            <p className="text-xs text-gray-500 text-center">
              Click any resource to open in a new tab
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
