import { NextRequest, NextResponse } from "next/server";
import { generateWithBedrock } from "@/lib/bedrock";

interface FollowUpRequest {
  goal: string;
  categoryName?: string;
  parentQuestion: string;
  customAnswer: string;
  previousAnswers: Record<string, string | string[]>;
}

export async function POST(request: NextRequest) {
  try {
    const body: FollowUpRequest = await request.json();
    const { goal, categoryName, parentQuestion, customAnswer, previousAnswers } = body;

    if (!customAnswer || !parentQuestion) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert curriculum architect helping a user create a personalized learning plan.

The user is working on: "${goal}"
${categoryName ? `Category: ${categoryName}` : ""}

They were asked: "${parentQuestion}"
They selected "Other" and typed: "${customAnswer}"

Previous answers context: ${JSON.stringify(previousAnswers)}

Your task: Generate ONE smart follow-up question that:
1. Validates or clarifies their custom input ("${customAnswer}")
2. Helps understand their specific needs for this choice
3. Is relevant to their overall goal

For example:
- If they typed a certification name, ask about their experience level or target exam date
- If they typed a tool/framework, ask about what they want to build with it
- If they typed a language, ask about their proficiency goals

Return ONLY valid JSON (no markdown, no code blocks):

{
  "question": "Your follow-up question here",
  "type": "single",
  "reason": "Brief explanation of why this matters",
  "options": [
    {"value": "option1", "label": "Option 1", "description": "When to choose this"},
    {"value": "option2", "label": "Option 2", "description": "When to choose this"},
    {"value": "option3", "label": "Option 3", "description": "When to choose this"},
    {"value": "option4", "label": "Option 4", "description": "When to choose this"},
    {"value": "other", "label": "Other (I'll specify)", "description": "If none of the above fit"}
  ]
}

Generate 4-6 relevant options based on their custom input "${customAnswer}". Always include "Other" as the last option.`;

    const bedrockResponse = await generateWithBedrock(prompt);
    const text = bedrockResponse.content;

    // Clean the response
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
    else if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
    if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);
    cleanedText = cleanedText.trim();

    const question = JSON.parse(cleanedText);

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error("Error generating follow-up question:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate follow-up question" },
      { status: 500 }
    );
  }
}
