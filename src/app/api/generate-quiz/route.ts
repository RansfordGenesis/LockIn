import { NextRequest, NextResponse } from "next/server";
import { generateWithBedrock } from "@/lib/bedrock";
import type { Quiz, QuizQuestion } from "@/types/plan";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, taskTitle, taskDescription, quizTopics, tags } = body;

    if (!taskId || !taskTitle) {
      return NextResponse.json(
        { success: false, error: "Missing task information" },
        { status: 400 }
      );
    }

    const topicsContext = quizTopics?.length > 0 
      ? `Quiz Topics: ${quizTopics.join(", ")}`
      : `Tags: ${tags?.join(", ") || "general"}`;

    const prompt = `Generate a 5-question multiple choice quiz to verify understanding of the following learning task.

Task: ${taskTitle}
Description: ${taskDescription || "Complete the learning task"}
${topicsContext}

REQUIREMENTS:
1. Create exactly 5 questions
2. Each question should have exactly 4 options (A, B, C, D)
3. Questions should test practical understanding, not just memorization
4. Mix difficulty: 2 easy, 2 medium, 1 challenging
5. Include brief explanations for correct answers
6. Questions should be specific to the topic, not generic

Return ONLY valid JSON (no markdown, no code blocks):

{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Generate questions that truly test if someone completed and understood the task.`;

    const bedrockResponse = await generateWithBedrock(prompt);
    const text = bedrockResponse.content;

    // Clean the response
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
    else if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
    if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);
    cleanedText = cleanedText.trim();

    const aiQuiz = JSON.parse(cleanedText);

    // Build quiz object
    const questions: QuizQuestion[] = aiQuiz.questions.map((q: {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }, index: number) => ({
      id: `${taskId}-q${index + 1}`,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    }));

    const quiz: Quiz = {
      taskId,
      questions,
      passScore: 3, // 3 out of 5 to pass
      totalQuestions: 5,
    };

    return NextResponse.json({
      success: true,
      quiz,
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
