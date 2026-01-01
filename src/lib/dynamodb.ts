import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const docClient = DynamoDBDocumentClient.from(client);

// Single table - email as primary key
export const TABLE_NAME = "lockin";

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

export async function verifyLogin(email: string, phone: string): Promise<UserDocument | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  
  // Normalize phone numbers for comparison
  const normalizePhone = (p: string) => p.replaceAll(/[^0-9+]/g, "");
  const storedPhone = normalizePhone(user.phoneNumber);
  const inputPhone = normalizePhone(phone);
  
  // Convert both to same format for comparison
  const formatToInternational = (p: string) => {
    if (p.startsWith("+233")) return p;
    if (p.startsWith("233")) return "+" + p;
    if (p.startsWith("0")) return "+233" + p.slice(1);
    return p;
  };
  
  if (formatToInternational(storedPhone) !== formatToInternational(inputPhone)) {
    return null;
  }
  
  return user;
}
