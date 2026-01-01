"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Circle,
  Target,
  Calendar,
  Award,
  ArrowLeft,
  Search,
  Clock,
} from "lucide-react";

// Helper functions for DRY
const getFilterLabel = (filter: "all" | "completed" | "pending") => {
  if (filter === "all") return "All";
  if (filter === "completed") return "✓ Done";
  return "○ To Do";
};

const getTaskTypeColor = (type: string) => {
  if (type === "learn") return "bg-blue-500/20 text-blue-400";
  if (type === "practice") return "bg-purple-500/20 text-purple-400";
  if (type === "build") return "bg-orange-500/20 text-orange-400";
  return "bg-green-500/20 text-green-400";
};

// Type guard function
const isNewPlanFormat = (plan: NewPlan | OldPlan): plan is NewPlan => {
  return "dailyTasks" in plan && Array.isArray(plan.dailyTasks);
};

// New plan structure with flat dailyTasks array
interface DailyTask {
  taskId: string;
  day: number;
  date: string;
  title: string;
  description: string;
  type: "learn" | "practice" | "build" | "review";
  estimatedMinutes: number;
  points: number;
  month: number;
  week: number;
}

interface NewPlan {
  planId: string;
  planTitle: string;
  planDescription: string;
  planCategory: string;
  scheduleType: "weekdays" | "fullweek";
  timeCommitment: string;
  includeLeetCode: boolean;
  totalDays: number;
  dailyTasks: DailyTask[];
  monthlyThemes: { month: number; theme: string; focus: string }[];
}

// Support for old plan structure (backwards compatibility)
interface OldPlan {
  planId: string;
  title: string;
  description: string;
  quarters: Array<{
    months: Array<{
      month: number;
      name: string;
      theme: string;
      weeks: Array<{
        days: Array<{
          id: string;
          date: string;
          isWorkDay: boolean;
          tasks: Array<{
            taskId: string;
            title: string;
            description: string;
            type: string;
            estimatedMinutes: number;
            points: number;
          }>;
          estimatedMinutes: number;
        }>;
      }>;
    }>;
  }>;
}

type Plan = NewPlan | OldPlan;

interface CompletedTaskInfo {
  points: number;
  completedAt: string;
  quizScore?: number;
}

interface FullYearPlanViewProps {
  plan: Plan;
  completedTasks: Record<string, boolean | CompletedTaskInfo>;
  onBack: () => void;
  onTaskClick?: (task: DailyTask) => void;
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Task Button Component to reduce nesting
interface TaskButtonProps {
  task: DailyTask;
  isCompleted: boolean;
  onTaskClick: (task: DailyTask) => void;
}

function TaskButton({ task, isCompleted, onTaskClick }: Readonly<TaskButtonProps>) {
  const handleClick = () => onTaskClick(task);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTaskClick(task);
    }
  };

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`w-full text-left flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
        isCompleted
          ? "bg-green-500/10 hover:bg-green-500/20"
          : "bg-white/5 hover:bg-white/10"
      }`}
    >
      {isCompleted ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-gray-500 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${
          isCompleted ? "text-gray-400 line-through" : "text-white"
        }`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {task.description}
          </p>
        )}
      </div>

      <span className={`text-xs px-2 py-1 rounded-full ${getTaskTypeColor(task.type)}`}>
        {task.type}
      </span>

      <span className="text-xs text-gray-500">
        +{task.points} pts
      </span>
    </button>
  );
}

export default function FullYearPlanView({
  plan,
  completedTasks,
  onBack,
  onTaskClick,
}: Readonly<FullYearPlanViewProps>) {
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set([1]));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompleted, setFilterCompleted] = useState<"all" | "completed" | "pending">("all");

  // Event handlers for task interaction
  const handleTaskClickWrapper = (task: DailyTask) => {
    onTaskClick?.(task);
  };

  // Helper: Process new format tasks into monthly structure
  const processNewFormatTasks = (tasks: DailyTask[]) => {
    const tasksByMonth = new Map<number, Map<string, DailyTask[]>>();
    
    for (const task of tasks) {
      if (!tasksByMonth.has(task.month)) {
        tasksByMonth.set(task.month, new Map());
      }
      const monthTasks = tasksByMonth.get(task.month)!;
      
      if (!monthTasks.has(task.date)) {
        monthTasks.set(task.date, []);
      }
      monthTasks.get(task.date)!.push(task);
    }
    
    return tasksByMonth;
  };

  // Helper: Build month data from task map
  const buildMonthData = (
    monthNum: number,
    monthTasks: Map<string, DailyTask[]>,
    monthlyTheme?: string
  ) => {
    const days: { date: string; dayNumber: number; tasks: DailyTask[]; totalMinutes: number }[] = [];
    let totalTasks = 0;
    let completedCount = 0;

    for (const [date, tasks] of Array.from(monthTasks.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const dayNumber = days.length + 1;
      const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
      
      days.push({ date, dayNumber, tasks, totalMinutes });
      totalTasks += tasks.length;
      completedCount += tasks.filter(t => completedTasks[t.taskId]).length;
    }

    return {
      month: monthNum,
      name: MONTH_NAMES[monthNum],
      theme: monthlyTheme || "",
      days,
      totalTasks,
      completedTasks: completedCount,
    };
  };

  // Helper: Convert old format day to new format
  interface OldFormatDay {
    date: string;
    estimatedMinutes: number;
    tasks: Array<{
      taskId: string;
      title: string;
      description?: string;
      type?: string;
      estimatedMinutes: number;
      points: number;
    }>;
  }
  const convertOldDay = (day: OldFormatDay, dayCounter: number, monthNum: number) => {
    const convertedTasks: DailyTask[] = day.tasks.map(t => ({
      taskId: t.taskId,
      day: dayCounter,
      date: day.date,
      title: t.title,
      description: t.description || "",
      type: (t.type || "learn") as DailyTask["type"],
      estimatedMinutes: t.estimatedMinutes,
      points: t.points,
      month: monthNum,
      week: Math.ceil(dayCounter / 5),
    }));

    return {
      date: day.date,
      dayNumber: dayCounter,
      tasks: convertedTasks,
      totalMinutes: day.estimatedMinutes,
      completedCount: day.tasks.filter(t => completedTasks[t.taskId]).length,
    };
  };

  // Helper: Process month from old format
  interface OldFormatMonth {
    month: number;
    name: string;
    theme?: string;
    weeks?: Array<{
      days?: Array<OldFormatDay & { isWorkDay?: boolean }>;
    }>;
  }
  const processOldMonth = (month: OldFormatMonth) => {
    const days: { date: string; dayNumber: number; tasks: DailyTask[]; totalMinutes: number }[] = [];
    let totalTasks = 0;
    let completedCount = 0;
    let dayCounter = 0;

    for (const week of month.weeks || []) {
      for (const day of week.days || []) {
        if (day.isWorkDay && day.tasks && day.tasks.length > 0) {
          dayCounter++;
          const convertedDay = convertOldDay(day, dayCounter, month.month);
          days.push(convertedDay);
          totalTasks += day.tasks.length;
          completedCount += convertedDay.completedCount;
        }
      }
    }

    return { days, totalTasks, completedTasks: completedCount };
  };

  // Helper: Process old format plan into monthly structure
  const processOldFormatPlan = (quarters: OldPlan["quarters"]) => {
    const months: {
      month: number;
      name: string;
      theme: string;
      days: { date: string; dayNumber: number; tasks: DailyTask[]; totalMinutes: number }[];
      totalTasks: number;
      completedTasks: number;
    }[] = [];

    for (const quarter of quarters || []) {
      for (const month of quarter.months || []) {
        const monthData = processOldMonth(month);
        
        if (monthData.days.length > 0) {
          months.push({
            month: month.month,
            name: month.name,
            theme: month.theme || `Month ${month.month}`,
            ...monthData,
          });
        }
      }
    }

    return months;
  };

  // Get all tasks organized by month
  const monthlyData = useMemo(() => {
    if (isNewPlanFormat(plan)) {
      const months: {
        month: number;
        name: string;
        theme: string;
        days: { date: string; dayNumber: number; tasks: DailyTask[]; totalMinutes: number }[];
        totalTasks: number;
        completedTasks: number;
      }[] = [];

      // NEW FORMAT: flat dailyTasks array
      const tasksByMonth = processNewFormatTasks(plan.dailyTasks);

      // Build monthly data
      for (let m = 1; m <= 12; m++) {
        const monthTasks = tasksByMonth.get(m);
        const monthTheme = plan.monthlyThemes?.find(t => t.month === m);
        
        if (!monthTasks || monthTasks.size === 0) continue;

        const monthData = buildMonthData(m, monthTasks, monthTheme?.theme || `Month ${m} Focus`);
        months.push(monthData);
      }

      return months;
    }

    // OLD FORMAT: nested quarters structure
    return processOldFormatPlan(plan.quarters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, completedTasks]);

  // Filter tasks based on search
  const filterDays = (days: typeof monthlyData[0]["days"]) => {
    return days.map(day => {
      const filteredTasks = day.tasks.filter((task) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(query);
          const matchesDesc = task.description?.toLowerCase().includes(query);
          if (!matchesTitle && !matchesDesc) return false;
        }

        // Completion filter
        if (filterCompleted === "completed" && !completedTasks[task.taskId]) return false;
        if (filterCompleted === "pending" && completedTasks[task.taskId]) return false;

        return true;
      });

      return { ...day, tasks: filteredTasks };
    }).filter(day => day.tasks.length > 0);
  };

  const toggleMonth = (monthNum: number) => {
    const newSet = new Set(expandedMonths);
    if (newSet.has(monthNum)) {
      newSet.delete(monthNum);
    } else {
      newSet.add(monthNum);
    }
    setExpandedMonths(newSet);
  };

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const total = monthlyData.reduce((sum, m) => sum + m.totalTasks, 0);
    const completed = monthlyData.reduce((sum, m) => sum + m.completedTasks, 0);
    return {
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [monthlyData]);

  // Get plan title
  const planTitle = isNewPlanFormat(plan)
    ? plan.planTitle 
    : plan.title;

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0c]/95 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Daily
            </button>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500">
                <Target className="w-5 h-5 text-[#0a0a0c]" />
              </div>
              <span className="text-xl font-bold text-white">
                Lock<span className="text-teal-400">In</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Title & Progress */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Full Year Curriculum</h1>
          <p className="text-gray-400 mb-4">{planTitle}</p>
          
          {/* Overall Progress Bar */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Overall Progress</span>
              <span className="text-lg font-bold text-teal-400">{overallStats.percent}%</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallStats.percent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  overallStats.percent === 100
                    ? "bg-green-500"
                    : "bg-gradient-to-r from-teal-500 to-emerald-500"
                }`}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {overallStats.completed} of {overallStats.total} tasks completed
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="flex gap-2">
            {(["all", "completed", "pending"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterCompleted(filter)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterCompleted === filter
                    ? "bg-teal-500 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {getFilterLabel(filter)}
              </button>
            ))}
          </div>
        </div>

        {/* Month-by-Month Timeline */}
        <div className="space-y-4">
          {monthlyData.map((monthData) => {
            const isExpanded = expandedMonths.has(monthData.month);
            const percent = monthData.totalTasks > 0 
              ? Math.round((monthData.completedTasks / monthData.totalTasks) * 100) 
              : 0;

            // Filter days for this month
            const filteredDays = filterDays(monthData.days);

            return (
              <motion.div
                key={monthData.month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: monthData.month * 0.03 }}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
              >
                {/* Month Header */}
                <button
                  onClick={() => toggleMonth(monthData.month)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/30 to-emerald-500/30 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-teal-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-white">
                        {monthData.name} - {monthData.theme}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {monthData.days.length} learning days • {monthData.totalTasks} tasks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3">
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percent === 100
                              ? "bg-green-500"
                              : "bg-gradient-to-r from-teal-500 to-emerald-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white w-12">
                        {percent}%
                      </span>
                    </div>

                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Days & Tasks */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-white/10"
                    >
                      <div className="p-4 space-y-3">
                        {filteredDays.length === 0 ? (
                          <p className="text-center text-gray-500 py-4">
                            No tasks match your filter
                          </p>
                        ) : (
                          filteredDays.map((day) => {
                            const dayDate = parseISO(day.date);
                            const dayCompleted = day.tasks.filter(t => completedTasks[t.taskId]).length;
                            const dayTotal = day.tasks.length;
                            const isDayComplete = dayCompleted === dayTotal;

                            return (
                              <div
                                key={day.date}
                                className={`p-4 rounded-xl border transition-all ${
                                  isDayComplete
                                    ? "bg-green-500/10 border-green-500/30"
                                    : "bg-white/5 border-white/10"
                                }`}
                              >
                                {/* Day Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                      isDayComplete
                                        ? "bg-green-500 text-white"
                                        : "bg-teal-500/20 text-teal-400"
                                    }`}>
                                      {day.dayNumber}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-white">
                                        {format(dayDate, "EEEE, MMM d")}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Day {day.dayNumber} of {monthData.days.length}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {day.totalMinutes} min
                                  </div>
                                </div>

                                {/* Tasks */}
                                <div className="space-y-2">
                                  {day.tasks.map((task) => (
                                    <TaskButton
                                      key={task.taskId}
                                      task={task}
                                      isCompleted={!!completedTasks[task.taskId]}
                                      onTaskClick={handleTaskClickWrapper}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-12 p-6 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-2xl border border-teal-500/30">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-8 h-8 text-teal-400" />
            <h3 className="text-xl font-bold text-white">Year at a Glance</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Tasks", value: overallStats.total },
              { label: "Completed", value: overallStats.completed },
              { label: "Months", value: monthlyData.length },
              { label: "Progress", value: `${overallStats.percent}%` },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-teal-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
