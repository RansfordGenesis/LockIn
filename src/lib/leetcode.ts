/**
 * LeetCode API Utilities
 * Fetch daily challenges, problem details, and support solution verification
 */

const LEETCODE_GRAPHQL_API = "https://leetcode.com/graphql";

export interface LeetCodeDailyChallenge {
  date: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  link: string;
}

export interface LeetCodeProblemDetail {
  questionId: string;
  title: string;
  titleSlug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  content: string; // HTML content of the problem
  hints: string[];
  exampleTestcases: string;
  topicTags: { name: string; slug: string }[];
  codeSnippets: { lang: string; langSlug: string; code: string }[];
  sampleTestCase: string;
  constraints: string;
}

export interface LeetCodeSubmissionResult {
  isCorrect: boolean;
  complexityAnalysis: {
    userTimeComplexity: string;
    userSpaceComplexity: string;
    isTimeCorrect: boolean;
    isSpaceCorrect: boolean;
    expectedTimeComplexity: string;
    expectedSpaceComplexity: string;
    explanation: string;
  };
  codeReview: {
    score: number; // 0-100
    feedback: string;
    improvements: string[];
  };
  pointsEarned: number;
}

/**
 * Fetch today's LeetCode daily challenge
 */
export async function fetchLeetCodeDaily(): Promise<LeetCodeDailyChallenge | null> {
  try {
    const response = await fetch(LEETCODE_GRAPHQL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query questionOfToday {
            activeDailyCodingChallengeQuestion {
              date
              link
              question {
                title
                titleSlug
                difficulty
              }
            }
          }
        `,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const challenge = data?.data?.activeDailyCodingChallengeQuestion;

    if (!challenge) return null;

    return {
      date: challenge.date,
      title: challenge.question.title,
      slug: challenge.question.titleSlug,
      difficulty: challenge.question.difficulty,
      link: `https://leetcode.com${challenge.link}`,
    };
  } catch (error) {
    console.error("Failed to fetch LeetCode daily:", error);
    return null;
  }
}

/**
 * Fetch full problem details including description, examples, and code snippets
 */
export async function fetchProblemDetails(titleSlug: string): Promise<LeetCodeProblemDetail | null> {
  try {
    const response = await fetch(LEETCODE_GRAPHQL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              questionId
              title
              titleSlug
              difficulty
              content
              hints
              exampleTestcases
              topicTags {
                name
                slug
              }
              codeSnippets {
                lang
                langSlug
                code
              }
              sampleTestCase
            }
          }
        `,
        variables: { titleSlug },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const question = data?.data?.question;

    if (!question) return null;

    // Extract constraints from content (usually in a <p><strong>Constraints:</strong></p> section)
    let constraints = "";
    const constraintsMatch = question.content?.match(/<strong>Constraints:<\/strong><\/p>\s*<ul>([\s\S]*?)<\/ul>/i);
    if (constraintsMatch) {
      constraints = constraintsMatch[1]
        .replaceAll("<li>", "• ")
        .replaceAll("</li>", "\n")
        .replaceAll(/<[^>]*>/g, "")
        .trim();
    }

    return {
      questionId: question.questionId,
      title: question.title,
      titleSlug: question.titleSlug,
      difficulty: question.difficulty,
      content: question.content,
      hints: question.hints || [],
      exampleTestcases: question.exampleTestcases || "",
      topicTags: question.topicTags || [],
      codeSnippets: question.codeSnippets || [],
      sampleTestCase: question.sampleTestCase || "",
      constraints,
    };
  } catch (error) {
    console.error("Failed to fetch problem details:", error);
    return null;
  }
}

/**
 * Get the starter code for a specific language
 */
export function getStarterCode(problem: LeetCodeProblemDetail, language: string): string {
  const langMapping: Record<string, string> = {
    python: "python3",
    javascript: "javascript",
    typescript: "typescript",
    java: "java",
    cpp: "cpp",
    csharp: "csharp",
    go: "golang",
    rust: "rust",
  };

  const langSlug = langMapping[language.toLowerCase()] || language.toLowerCase();
  const snippet = problem.codeSnippets.find(
    (s) => s.langSlug === langSlug || s.langSlug === language.toLowerCase()
  );

  return snippet?.code || `// Starter code not available for ${language}`;
}

/**
 * Parse problem content to extract clean text for AI analysis
 */
export function parseProblemContent(htmlContent: string): {
  description: string;
  examples: string[];
  constraints: string[];
} {
  // Remove HTML tags but preserve structure
  const cleanText = htmlContent
    .replaceAll("<pre>", "\n```\n")
    .replaceAll("</pre>", "\n```\n")
    .replaceAll("<strong>", "**")
    .replaceAll("</strong>", "**")
    .replaceAll("<em>", "_")
    .replaceAll("</em>", "_")
    .replaceAll("<code>", "`")
    .replaceAll("</code>", "`")
    .replaceAll("<p>", "\n")
    .replaceAll("</p>", "\n")
    .replaceAll("<li>", "• ")
    .replaceAll("</li>", "\n")
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();

  // Extract examples
  const examplePattern = /\*\*Example \d+:\*\*[\s\S]*?(?=\*\*Example|\*\*Constraints|$)/gi;
  const exampleMatches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = examplePattern.exec(cleanText)) !== null) {
    exampleMatches.push(match[0].trim());
  }
  const examples = exampleMatches;

  // Extract constraints
  const constraintsPattern = /\*\*Constraints:\*\*([\s\S]*?)(?=\*\*|$)/i;
  const constraintsMatch = constraintsPattern.exec(cleanText);
  const constraints = constraintsMatch
    ? constraintsMatch[1]
        .split("•")
        .filter((c) => c.trim())
        .map((c) => c.trim())
    : [];

  // Extract description (before examples)
  const descriptionEnd = cleanText.indexOf("**Example");
  const description = descriptionEnd > 0 ? cleanText.substring(0, descriptionEnd).trim() : cleanText;

  return { description, examples, constraints };
}

/**
 * Get expected complexity based on problem patterns and constraints
 * This is a heuristic - the AI will provide more accurate analysis
 */
export function estimateExpectedComplexity(problem: LeetCodeProblemDetail): {
  timeComplexity: string;
  spaceComplexity: string;
  reasoning: string;
} {
  const tags = new Set(problem.topicTags.map((t) => t.slug));
  const difficulty = problem.difficulty;

  // Common patterns based on topic tags
  if (tags.has("binary-search")) {
    return {
      timeComplexity: "O(log n)",
      spaceComplexity: "O(1)",
      reasoning: "Binary search problems typically require O(log n) time",
    };
  }
  if (tags.has("dynamic-programming")) {
    return {
      timeComplexity: "O(n²) or O(n*m)",
      spaceComplexity: "O(n) or O(n*m)",
      reasoning: "DP problems usually require polynomial time and space",
    };
  }
  if (tags.has("two-pointers") || tags.has("sliding-window")) {
    return {
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      reasoning: "Two-pointer/sliding window achieve linear time with constant space",
    };
  }
  if (tags.has("tree") || tags.has("binary-tree")) {
    return {
      timeComplexity: "O(n)",
      spaceComplexity: "O(h) where h is tree height",
      reasoning: "Tree traversal visits each node once, stack space for recursion",
    };
  }
  if (tags.has("graph") || tags.has("bfs") || tags.has("dfs")) {
    return {
      timeComplexity: "O(V + E)",
      spaceComplexity: "O(V)",
      reasoning: "Graph traversal visits vertices and edges",
    };
  }
  if (tags.has("sorting")) {
    return {
      timeComplexity: "O(n log n)",
      spaceComplexity: "O(n) or O(1)",
      reasoning: "Optimal sorting is O(n log n)",
    };
  }
  if (tags.has("hash-table")) {
    return {
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      reasoning: "Hash table provides O(1) lookups, O(n) for iteration",
    };
  }

  // Default based on difficulty
  if (difficulty === "Easy") {
    return {
      timeComplexity: "O(n)",
      spaceComplexity: "O(1) or O(n)",
      reasoning: "Easy problems typically have linear solutions",
    };
  }
  if (difficulty === "Medium") {
    return {
      timeComplexity: "O(n log n) or O(n²)",
      spaceComplexity: "O(n)",
      reasoning: "Medium problems often require more complex solutions",
    };
  }

  return {
    timeComplexity: "O(n²) or better",
    spaceComplexity: "O(n)",
    reasoning: "Hard problems may require optimized solutions",
  };
}

/**
 * Get the link for a specific date's daily challenge
 * Format: https://leetcode.com/problems/problem-slug/description/?envType=daily-question&envId=YYYY-MM-DD
 */
export function getLeetCodeDailyLink(date: string, problemSlug?: string): string {
  if (problemSlug) {
    return `https://leetcode.com/problems/${problemSlug}/description/?envType=daily-question&envId=${date}`;
  }
  // Fallback to the daily challenge page
  return `https://leetcode.com/problemset/?envType=daily-question&envId=${date}`;
}

/**
 * Get difficulty color for UI
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "text-green-500";
    case "medium":
      return "text-yellow-500";
    case "hard":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

/**
 * Get difficulty points
 */
export function getDifficultyPoints(difficulty: string): { base: number; bonus: number } {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return { base: 10, bonus: 5 }; // +5 for correct complexity
    case "medium":
      return { base: 20, bonus: 10 };
    case "hard":
      return { base: 30, bonus: 15 };
    default:
      return { base: 10, bonus: 5 };
  }
}
