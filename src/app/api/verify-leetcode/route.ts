import { NextRequest, NextResponse } from "next/server";
import { generateWithBedrock } from "@/lib/bedrock";
import {
  fetchProblemDetails,
  parseProblemContent,
  getDifficultyPoints,
  type LeetCodeProblemDetail,
} from "@/lib/leetcode";

interface VerifyRequest {
  problemSlug: string;
  code: string;
  language: string;
  userTimeComplexity: string;
  userSpaceComplexity: string;
}

interface VerifyResponse {
  success: boolean;
  isCorrect: boolean;
  complexityAnalysis: {
    userTimeComplexity: string;
    userSpaceComplexity: string;
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
    correctness: "correct" | "partial" | "incorrect";
    issues: string[];
  };
  pointsEarned: number;
  problem?: {
    title: string;
    difficulty: string;
    tags: string[];
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifyResponse | { success: false; error: string }>> {
  try {
    const body: VerifyRequest = await request.json();
    const { problemSlug, code, language, userTimeComplexity, userSpaceComplexity } = body;

    if (!problemSlug || !code || !language) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: problemSlug, code, language" },
        { status: 400 }
      );
    }

    // Fetch the problem details from LeetCode
    const problem = await fetchProblemDetails(problemSlug);

    if (!problem) {
      return NextResponse.json(
        { success: false, error: "Could not fetch problem details. Please try again." },
        { status: 404 }
      );
    }

    // Parse the problem content for AI analysis
    const { description, examples, constraints } = parseProblemContent(problem.content);

    // Build the verification prompt
    const prompt = buildVerificationPrompt(
      problem,
      description,
      examples,
      constraints,
      code,
      language,
      userTimeComplexity,
      userSpaceComplexity
    );

    // Call AI to verify the solution
    const aiResponse = await generateWithBedrock(prompt);
    const analysisText = aiResponse.content.trim();

    // Parse the AI response
    let analysis;
    try {
      let cleanedText = analysisText;
      if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
      else if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
      if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);
      analysis = JSON.parse(cleanedText.trim());
    } catch {
      console.error("Failed to parse AI response:", analysisText);
      return NextResponse.json(
        { success: false, error: "Failed to analyze solution. Please try again." },
        { status: 500 }
      );
    }

    // Calculate points - fixed 10 points for correct solutions
    const { base } = getDifficultyPoints(problem.difficulty);
    let pointsEarned = 0;

    if (analysis.correctness === "correct") {
      pointsEarned = base;
    } else if (analysis.correctness === "partial") {
      pointsEarned = Math.floor(base / 2);
    }

    return NextResponse.json({
      success: true,
      isCorrect: analysis.correctness === "correct",
      complexityAnalysis: {
        userTimeComplexity,
        userSpaceComplexity,
        isTimeCorrect: analysis.isTimeCorrect,
        isSpaceCorrect: analysis.isSpaceCorrect,
        actualTimeComplexity: analysis.actualTimeComplexity,
        actualSpaceComplexity: analysis.actualSpaceComplexity,
        explanation: analysis.complexityExplanation,
      },
      codeReview: {
        score: analysis.codeScore,
        feedback: analysis.feedback,
        improvements: analysis.improvements || [],
        correctness: analysis.correctness,
        issues: analysis.issues || [],
      },
      pointsEarned,
      problem: {
        title: problem.title,
        difficulty: problem.difficulty,
        tags: problem.topicTags.map((t) => t.name),
      },
    });
  } catch (error) {
    console.error("Error verifying LeetCode solution:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while verifying your solution." },
      { status: 500 }
    );
  }
}

function buildVerificationPrompt(
  problem: LeetCodeProblemDetail,
  description: string,
  examples: string[],
  constraints: string[],
  code: string,
  language: string,
  userTimeComplexity: string,
  userSpaceComplexity: string
): string {
  return `You are an expert coding interview evaluator and algorithm specialist. Analyze the following LeetCode solution submission.

=== PROBLEM DETAILS ===
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Topics: ${problem.topicTags.map((t) => t.name).join(", ")}

Description:
${description}

Examples:
${examples.join("\n\n")}

Constraints:
${constraints.join("\n")}

=== USER'S SOLUTION ===
Language: ${language}

\`\`\`${language}
${code}
\`\`\`

=== USER'S COMPLEXITY ANALYSIS ===
Time Complexity: ${userTimeComplexity}
Space Complexity: ${userSpaceComplexity}

=== YOUR TASK ===

Analyze this solution and provide:

1. CORRECTNESS EVALUATION
- Does the solution correctly solve the problem?
- Does it handle all edge cases from the constraints?
- Will it pass all test cases?

2. COMPLEXITY ANALYSIS
- What is the ACTUAL time complexity of this solution?
- What is the ACTUAL space complexity of this solution?
- Is the user's complexity analysis correct?

3. CODE QUALITY REVIEW
- Is the code clean and readable?
- Are there any improvements that could be made?
- Any potential bugs or issues?

Return ONLY valid JSON (no markdown, no code blocks):

{
  "correctness": "correct|partial|incorrect",
  "issues": ["List any bugs or issues that would cause test failures"],
  "actualTimeComplexity": "O(...)",
  "actualSpaceComplexity": "O(...)",
  "isTimeCorrect": true/false,
  "isSpaceCorrect": true/false,
  "complexityExplanation": "Detailed explanation of why the complexity is what it is, and whether the user's analysis was correct",
  "codeScore": 0-100,
  "feedback": "Overall feedback on the solution - be encouraging but honest",
  "improvements": ["List 1-3 specific improvements that could be made"]
}

IMPORTANT EVALUATION CRITERIA:

For CORRECTNESS:
- "correct": Solution will pass all test cases, handles all edge cases
- "partial": Solution works for some cases but has bugs or misses edge cases
- "incorrect": Solution has fundamental logic errors or doesn't solve the problem

For COMPLEXITY:
- Be precise with the complexity notation
- Consider worst-case scenarios
- For space complexity, only count extra space (not input)
- Accept equivalent notations (O(n) == O(N), O(n^2) == O(n²))

For CODE SCORE (0-100):
- 90-100: Excellent, optimal solution with clean code
- 70-89: Good solution, minor improvements possible
- 50-69: Working solution but could be better
- Below 50: Needs significant improvement

Be encouraging but honest. The goal is to help the learner improve.`;
}

// Also support GET for fetching problem details
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { success: false, error: "Missing problem slug" },
      { status: 400 }
    );
  }

  const problem = await fetchProblemDetails(slug);

  if (!problem) {
    return NextResponse.json(
      { success: false, error: "Problem not found" },
      { status: 404 }
    );
  }

  const { description, examples, constraints } = parseProblemContent(problem.content);

  return NextResponse.json({
    success: true,
    problem: {
      ...problem,
      parsedContent: {
        description,
        examples,
        constraints,
      },
    },
  });
}
