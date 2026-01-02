import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  PlanDocument,
  PlanSummary,
  UserDocumentV2,
  MAX_PLANS_PER_USER,
  planDocumentToSummary,
  TaskResource,
} from "@/types/multiplan";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Configure document client to remove undefined values
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Single table - email as primary key
export const TABLE_NAME = "lockin";
// Separate table for tasks to avoid 400KB limit
export const TASKS_TABLE_NAME = "lockin-tasks";

// Current schema version
export const CURRENT_SCHEMA_VERSION = 2;

// ==========================================
// USER DATA TYPE - Everything in one document
// ==========================================

export interface DailyTask {
  taskId: string;
  day: number; // 1-365 or 1-260
  date: string; // yyyy-MM-dd
  title: string;
  description: string;
  type: "learn" | "practice" | "build" | "review";
  estimatedMinutes: number;
  points: number;
  month: number;
  week: number;
  isLeetCode?: boolean;
  resources?: TaskResource[]; // AI-generated resources
  tags?: string[];
}

export interface UserDocument {
  email: string; // Primary Key
  
  // User Info
  name: string;
  phoneNumber: string;
  createdAt: string;
  
  // Settings
  scheduleType: "weekdays" | "fullweek";
  timeCommitment: string;
  includeLeetCode: boolean;
  leetCodeLanguage?: string;
  
  // Plan Info
  planId: string;
  planTitle: string;
  planDescription: string;
  planCategory: string;
  planStartDate: string; // 2026-01-01
  planEndDate: string;
  totalDays: number; // 260 or 365
  
  // All daily tasks for the entire year (260 or 365 items)
  dailyTasks: DailyTask[];
  
  // Monthly themes
  monthlyThemes: { month: number; theme: string; focus: string }[];
  
  // Progress
  completedTasks: Record<string, { completedAt: string; points: number; quizScore?: number }>;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string | null;
  dailyCheckIns: Record<string, boolean>;
}

// ==========================================
// CHECK EMAIL EXISTS
// ==========================================

export async function checkEmailExists(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
    ProjectionExpression: "email",
  });
  const result = await docClient.send(command);
  return !!result.Item;
}

// ==========================================
// GET USER BY EMAIL
// ==========================================

export async function getUserByEmail(email: string): Promise<UserDocument | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
  });
  const result = await docClient.send(command);
  return (result.Item as UserDocument) || null;
}

// ==========================================
// CREATE/SAVE USER (complete document)
// ==========================================

export async function saveUser(user: UserDocument): Promise<void> {
  const normalizedUser = {
    ...user,
    email: user.email.toLowerCase().trim(),
  };
  
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: normalizedUser,
  });
  await docClient.send(command);
}

// ==========================================
// UPDATE USER PROGRESS
// ==========================================

export async function updateUserProgress(
  email: string,
  updates: {
    completedTasks?: Record<string, { completedAt: string; points: number; quizScore?: number }>;
    totalPoints?: number;
    currentStreak?: number;
    longestStreak?: number;
    lastCheckIn?: string | null;
    dailyCheckIns?: Record<string, boolean>;
  }
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value], index) => {
    if (value !== undefined) {
      updateExpressions.push(`#attr${index} = :val${index}`);
      expressionAttributeNames[`#attr${index}`] = key;
      expressionAttributeValues[`:val${index}`] = value;
    }
  });

  if (updateExpressions.length === 0) return;

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  });
  
  await docClient.send(command);
}

// ==========================================
// DELETE USER
// ==========================================

export async function deleteUser(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const command = new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
  });
  await docClient.send(command);
}

// ==========================================
// SCAN ALL USERS (for notifications)
// ==========================================

export async function scanAllUsers(): Promise<UserDocument[]> {
  const command = new ScanCommand({
    TableName: TABLE_NAME,
  });
  const result = await docClient.send(command);
  return (result.Items as UserDocument[]) || [];
}

// ==========================================
// LOGIN: Verify email + phone match
// ==========================================

// Helper function to normalize and format phone numbers for comparison
function normalizePhoneNumber(phone: string): string {
  const normalized = phone.replaceAll(/[^0-9+]/g, "");
  if (normalized.startsWith("+233")) return normalized;
  if (normalized.startsWith("233")) return "+" + normalized;
  if (normalized.startsWith("0")) return "+233" + normalized.slice(1);
  return normalized;
}

export async function verifyLogin(email: string, phone: string): Promise<UserDocument | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;

  if (normalizePhoneNumber(user.phoneNumber) !== normalizePhoneNumber(phone)) {
    return null;
  }

  return user;
}

// ==========================================
// V2 SCHEMA FUNCTIONS (Multi-Plan Support)
// ==========================================

// Type guard to check if user is V2
export function isUserDocumentV2(user: UserDocument | UserDocumentV2): user is UserDocumentV2 {
  return "schemaVersion" in user && user.schemaVersion === 2 && "plans" in user;
}

// Get user with automatic V2 detection
export async function getUserByEmailV2(email: string): Promise<UserDocumentV2 | UserDocument | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { email: normalizedEmail },
  });
  const result = await docClient.send(command);
  return result.Item as (UserDocumentV2 | UserDocument) || null;
}

// Save V2 user document
export async function saveUserV2(user: UserDocumentV2): Promise<void> {
  const normalizedUser = {
    ...user,
    email: user.email.toLowerCase().trim(),
    updatedAt: new Date().toISOString(),
  };

  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: normalizedUser,
  });
  await docClient.send(command);
}

// ==========================================
// PLAN CRUD OPERATIONS
// ==========================================

// Get all plan summaries for a user
export async function getUserPlanSummaries(email: string): Promise<PlanSummary[]> {
  const user = await getUserByEmailV2(email);
  if (!user) return [];

  if (!isUserDocumentV2(user)) {
    // V1 user - return single plan as summary
    if (!user.planId) return [];
    return [{
      planId: user.planId,
      planTitle: user.planTitle,
      planDescription: user.planDescription,
      planCategory: user.planCategory as PlanSummary["planCategory"],
      planIcon: "💻",
      totalDays: user.totalDays,
      totalTasks: user.dailyTasks?.length || 0,
      completedTasksCount: Object.keys(user.completedTasks || {}).length,
      totalPoints: user.totalPoints || 0,
      earnedPoints: user.totalPoints || 0,
      currentStreak: user.currentStreak || 0,
      startDate: user.planStartDate,
      endDate: user.planEndDate,
      isActive: true,
      createdAt: user.createdAt,
      progressPercent: user.dailyTasks?.length
        ? Math.round((Object.keys(user.completedTasks || {}).length / user.dailyTasks.length) * 100)
        : 0,
    }];
  }

  // V2 user - return plan summaries
  return user.plans.map((plan) => ({
    ...planDocumentToSummary(plan),
    isActive: plan.planId === user.activePlanId,
  }));
}

// Get full plan data by plan ID
export async function getPlanById(email: string, planId: string): Promise<PlanDocument | null> {
  const user = await getUserByEmailV2(email);
  if (!user) return null;

  if (!isUserDocumentV2(user)) {
    // V1 user - check if planId matches
    if (user.planId !== planId) return null;
    // Convert V1 to PlanDocument format
    return {
      planId: user.planId,
      planTitle: user.planTitle,
      planDescription: user.planDescription,
      planCategory: user.planCategory as PlanDocument["planCategory"],
      planIcon: "💻",
      startDate: user.planStartDate,
      endDate: user.planEndDate,
      totalDays: user.totalDays,
      totalTasks: user.dailyTasks?.length || 0,
      scheduleType: user.scheduleType,
      timeCommitment: user.timeCommitment,
      experienceLevel: "intermediate",
      includeLeetCode: user.includeLeetCode,
      leetCodeLanguage: user.leetCodeLanguage,
      dailyTasks: user.dailyTasks,
      monthlyThemes: user.monthlyThemes,
      completedTasks: user.completedTasks,
      totalPoints: user.totalPoints || 0,
      earnedPoints: user.totalPoints || 0,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      lastCheckIn: user.lastCheckIn,
      dailyCheckIns: user.dailyCheckIns || {},
      quizAttempts: [],
      leetCodeSubmissions: [],
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
    };
  }

  // V2 user - find plan by ID
  return user.plans.find((p) => p.planId === planId) || null;
}

// Get active plan for a user
export async function getActivePlan(email: string): Promise<PlanDocument | null> {
  const user = await getUserByEmailV2(email);
  if (!user) return null;

  if (!isUserDocumentV2(user)) {
    // V1 user - single plan is active
    return getPlanById(email, user.planId);
  }

  if (!user.activePlanId) return null;
  return user.plans.find((p) => p.planId === user.activePlanId) || null;
}

// Add a new plan for a user (max 3)
export async function addPlanToUser(email: string, plan: PlanDocument): Promise<{ success: boolean; error?: string }> {
  const user = await getUserByEmailV2(email);
  if (!user) return { success: false, error: "User not found" };

  if (!isUserDocumentV2(user)) {
    return { success: false, error: "Please migrate to V2 schema first" };
  }

  if (user.plans.length >= MAX_PLANS_PER_USER) {
    return { success: false, error: `Maximum ${MAX_PLANS_PER_USER} plans allowed` };
  }

  // Add the plan
  user.plans.push(plan);

  // If this is the first plan or no active plan, set it as active
  if (!user.activePlanId) {
    user.activePlanId = plan.planId;
  }

  await saveUserV2(user);
  return { success: true };
}

// Update an existing plan
export async function updatePlan(email: string, planId: string, updates: Partial<PlanDocument>): Promise<{ success: boolean; error?: string }> {
  const user = await getUserByEmailV2(email);
  if (!user) return { success: false, error: "User not found" };

  if (!isUserDocumentV2(user)) {
    return { success: false, error: "Please migrate to V2 schema first" };
  }

  const planIndex = user.plans.findIndex((p) => p.planId === planId);
  if (planIndex === -1) {
    return { success: false, error: "Plan not found" };
  }

  // Update the plan
  user.plans[planIndex] = {
    ...user.plans[planIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveUserV2(user);
  return { success: true };
}

// Delete a plan
export async function deletePlan(email: string, planId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getUserByEmailV2(email);
  if (!user) return { success: false, error: "User not found" };

  if (!isUserDocumentV2(user)) {
    return { success: false, error: "Please migrate to V2 schema first" };
  }

  const planIndex = user.plans.findIndex((p) => p.planId === planId);
  if (planIndex === -1) {
    return { success: false, error: "Plan not found" };
  }

  // Remove the plan
  user.plans.splice(planIndex, 1);

  // If deleted plan was active, set another plan as active
  if (user.activePlanId === planId) {
    user.activePlanId = user.plans.length > 0 ? user.plans[0].planId : null;
  }

  await saveUserV2(user);
  return { success: true };
}

// Switch active plan
export async function switchActivePlan(email: string, planId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getUserByEmailV2(email);
  if (!user) return { success: false, error: "User not found" };

  if (!isUserDocumentV2(user)) {
    return { success: false, error: "Please migrate to V2 schema first" };
  }

  const planExists = user.plans.some((p) => p.planId === planId);
  if (!planExists) {
    return { success: false, error: "Plan not found" };
  }

  user.activePlanId = planId;
  await saveUserV2(user);
  return { success: true };
}

// Update plan progress (task completion, streaks, etc.)
export async function updatePlanProgress(
  email: string,
  planId: string,
  updates: {
    completedTasks?: Record<string, { completedAt: string; points: number; quizScore?: number }>;
    earnedPoints?: number;
    currentStreak?: number;
    longestStreak?: number;
    lastCheckIn?: string | null;
    dailyCheckIns?: Record<string, boolean>;
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await getUserByEmailV2(email);
  if (!user) return { success: false, error: "User not found" };

  if (!isUserDocumentV2(user)) {
    // V1 user - use old update method
    await updateUserProgress(email, {
      completedTasks: updates.completedTasks,
      totalPoints: updates.earnedPoints,
      currentStreak: updates.currentStreak,
      longestStreak: updates.longestStreak,
      lastCheckIn: updates.lastCheckIn,
      dailyCheckIns: updates.dailyCheckIns,
    });
    return { success: true };
  }

  const planIndex = user.plans.findIndex((p) => p.planId === planId);
  if (planIndex === -1) {
    return { success: false, error: "Plan not found" };
  }

  const plan = user.plans[planIndex];

  // Apply updates
  if (updates.completedTasks) {
    plan.completedTasks = { ...plan.completedTasks, ...updates.completedTasks };
  }
  if (updates.earnedPoints !== undefined) {
    plan.earnedPoints = updates.earnedPoints;
  }
  if (updates.currentStreak !== undefined) {
    plan.currentStreak = updates.currentStreak;
  }
  if (updates.longestStreak !== undefined) {
    plan.longestStreak = updates.longestStreak;
  }
  if (updates.lastCheckIn !== undefined) {
    plan.lastCheckIn = updates.lastCheckIn;
  }
  if (updates.dailyCheckIns) {
    plan.dailyCheckIns = { ...plan.dailyCheckIns, ...updates.dailyCheckIns };
  }

  plan.updatedAt = new Date().toISOString();

  // Update global stats
  user.globalTotalPoints = user.plans.reduce((sum, p) => sum + (p.earnedPoints || 0), 0);
  user.globalCurrentStreak = Math.max(...user.plans.map((p) => p.currentStreak || 0));
  user.globalLongestStreak = Math.max(
    user.globalLongestStreak || 0,
    ...user.plans.map((p) => p.longestStreak || 0)
  );

  await saveUserV2(user);
  return { success: true };
}

// Verify login and return V2 user
export async function verifyLoginV2(email: string, phone: string): Promise<UserDocumentV2 | UserDocument | null> {
  const user = await getUserByEmailV2(email);
  if (!user) return null;

  if (normalizePhoneNumber(user.phoneNumber) !== normalizePhoneNumber(phone)) {
    return null;
  }

  return user;
}

// ==========================================
// SEPARATE TASKS STORAGE (to avoid 400KB limit)
// ==========================================

export interface TasksDocument {
  planId: string; // Primary key
  tasks: DailyTask[];
  createdAt: string;
  updatedAt: string;
}

// Save tasks separately
export async function savePlanTasks(planId: string, tasks: DailyTask[]): Promise<void> {
  const doc: TasksDocument = {
    planId,
    tasks,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const command = new PutCommand({
    TableName: TASKS_TABLE_NAME,
    Item: doc,
  });
  
  await docClient.send(command);
}

// Get tasks for a plan
export async function getPlanTasks(planId: string): Promise<DailyTask[]> {
  const command = new GetCommand({
    TableName: TASKS_TABLE_NAME,
    Key: { planId },
  });
  
  const result = await docClient.send(command);
  return (result.Item as TasksDocument)?.tasks || [];
}

// Delete tasks when plan is deleted
export async function deletePlanTasks(planId: string): Promise<void> {
  const command = new DeleteCommand({
    TableName: TASKS_TABLE_NAME,
    Key: { planId },
  });
  
  await docClient.send(command);
}

// Re-export types
export type { PlanDocument, PlanSummary, UserDocumentV2, UserSettings, TaskResource } from "@/types/multiplan";
