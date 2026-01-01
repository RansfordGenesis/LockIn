import {
  format,
  eachDayOfInterval,
  isWeekend,
  getWeek,
  getMonth,
  parseISO,
  differenceInDays,
} from "date-fns";

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  dayName: string;
  weekNumber: number;
  monthNumber: number;
  monthName: string;
  isWeekend: boolean;
  isRecoveryWeek: boolean;
  isFlexDay: boolean;
  quarterNumber: number;
}

export interface GeneratedTask {
  taskId: string;
  date: string;
  dayOfWeek: string;
  weekNumber: number;
  monthNumber: number;
  quarterNumber: number;
  coreTask: {
    description: string;
    duration: string;
    completed: boolean;
  };
  extendedWork: {
    description: string;
    duration: string;
    completed: boolean;
  };
  quickWin: {
    description: string;
    duration: string;
    completed: boolean;
  };
  pointsEarned: number;
  checkedIn: boolean;
  isRecoveryDay: boolean;
  isFlexDay: boolean;
}

// Recovery weeks (every 13 weeks, representing quarter boundaries)
const RECOVERY_WEEKS = new Set([13, 26, 39, 52]);

export function generate2026Calendar(
  scheduleType: "weekdays" | "fullweek" = "weekdays",
  flexDaysPerMonth: number = 2
): CalendarDay[] {
  const startDate = new Date(2026, 0, 1); // January 1, 2026
  const endDate = new Date(2026, 11, 31); // December 31, 2026

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const calendar: CalendarDay[] = [];

  // Track flex days per month
  const flexDaysUsed: Record<number, number> = {};

  allDays.forEach((date) => {
    const dayOfWeek = format(date, "EEEE");
    const weekNum = getWeek(date, { weekStartsOn: 1 });
    const monthNum = getMonth(date) + 1;
    const isWeekendDay = isWeekend(date);
    const isRecoveryWeek = RECOVERY_WEEKS.has(weekNum);
    const quarterNumber = Math.ceil(monthNum / 3);

    // Skip weekends if weekdays only
    if (scheduleType === "weekdays" && isWeekendDay) {
      return;
    }

    // Determine if this is a flex day (last 2 Fridays of each month)
    let isFlexDay = false;
    if (dayOfWeek === "Friday") {
      if (!flexDaysUsed[monthNum]) {
        flexDaysUsed[monthNum] = 0;
      }
      if (flexDaysUsed[monthNum] < flexDaysPerMonth) {
        // Mark every other Friday as potential flex day
        if (weekNum % 2 === 0) {
          isFlexDay = true;
          flexDaysUsed[monthNum]++;
        }
      }
    }

    calendar.push({
      date: format(date, "yyyy-MM-dd"),
      dayOfWeek: dayOfWeek,
      dayName: format(date, "EEE"),
      weekNumber: weekNum,
      monthNumber: monthNum,
      monthName: format(date, "MMMM"),
      isWeekend: isWeekendDay,
      isRecoveryWeek: isRecoveryWeek,
      isFlexDay: isFlexDay,
      quarterNumber: quarterNumber,
    });
  });

  return calendar;
}

// Get days for a specific week
export function getWeekDays(calendar: CalendarDay[], weekNumber: number): CalendarDay[] {
  return calendar.filter((day) => day.weekNumber === weekNumber);
}

// Get days for a specific month
export function getMonthDays(calendar: CalendarDay[], monthNumber: number): CalendarDay[] {
  return calendar.filter((day) => day.monthNumber === monthNumber);
}

// Get today's calendar day
export function getTodayCalendarDay(calendar: CalendarDay[]): CalendarDay | undefined {
  const today = format(new Date(), "yyyy-MM-dd");
  return calendar.find((day) => day.date === today);
}

// Calculate streak
export function calculateStreak(completedDates: string[], calendar: CalendarDay[]): number {
  if (completedDates.length === 0) return 0;

  const today = format(new Date(), "yyyy-MM-dd");
  
  // Get working days from calendar
  const workingDays = calendar.map((d) => d.date).sort((a, b) => b.localeCompare(a));
  
  let streak = 0;
  let currentIndex = workingDays.indexOf(today);
  
  if (currentIndex === -1) {
    // Today might be a weekend/holiday, check yesterday
    currentIndex = 0;
  }

  for (let i = currentIndex; i < workingDays.length; i++) {
    const workingDay = workingDays[i];
    if (completedDates.includes(workingDay)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Get week progress summary
export function getWeekProgress(
  tasks: GeneratedTask[],
  weekNumber: number
): { completed: number; total: number; percentage: number } {
  const weekTasks = tasks.filter((t) => t.weekNumber === weekNumber);
  const totalPossible = weekTasks.length * 3; // 3 task types per day
  const completed = weekTasks.reduce((sum, t) => {
    let count = 0;
    if (t.coreTask.completed) count++;
    if (t.extendedWork.completed) count++;
    if (t.quickWin.completed) count++;
    return sum + count;
  }, 0);

  return {
    completed,
    total: totalPossible,
    percentage: totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0,
  };
}

// Get month progress summary
export function getMonthProgress(
  tasks: GeneratedTask[],
  monthNumber: number
): { completed: number; total: number; percentage: number } {
  const monthTasks = tasks.filter((t) => t.monthNumber === monthNumber);
  const totalPossible = monthTasks.length * 3;
  const completed = monthTasks.reduce((sum, t) => {
    let count = 0;
    if (t.coreTask.completed) count++;
    if (t.extendedWork.completed) count++;
    if (t.quickWin.completed) count++;
    return sum + count;
  }, 0);

  return {
    completed,
    total: totalPossible,
    percentage: totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0,
  };
}

// Format date for display
export function formatDisplayDate(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, "EEEE, MMMM d, yyyy");
}

// Get relative date description
export function getRelativeDateDescription(dateString: string): string {
  const date = parseISO(dateString);
  const today = new Date();
  const diff = differenceInDays(date, today);

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0 && diff <= 7) return `In ${diff} days`;
  if (diff < 0 && diff >= -7) return `${Math.abs(diff)} days ago`;
  
  return format(date, "MMM d");
}

// Get current period info
export function getCurrentPeriodInfo(calendar: CalendarDay[]) {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntry = calendar.find((d) => d.date === today);

  if (!todayEntry) {
    // Find the next working day
    const nextWorkingDay = calendar.find((d) => d.date > today);
    return {
      currentDate: nextWorkingDay?.date || today,
      currentWeek: nextWorkingDay?.weekNumber || 1,
      currentMonth: nextWorkingDay?.monthNumber || 1,
      currentQuarter: nextWorkingDay?.quarterNumber || 1,
      isRecoveryWeek: nextWorkingDay?.isRecoveryWeek || false,
    };
  }

  return {
    currentDate: todayEntry.date,
    currentWeek: todayEntry.weekNumber,
    currentMonth: todayEntry.monthNumber,
    currentQuarter: todayEntry.quarterNumber,
    isRecoveryWeek: todayEntry.isRecoveryWeek,
  };
}
