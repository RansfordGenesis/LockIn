import { NextRequest, NextResponse } from "next/server";
import { generateWithBedrock } from "@/lib/bedrock";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goal, experience, stack, timeAvailable, constraints } = body;

    if (!goal || !experience || !stack || !timeAvailable) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = `You are an AI planning architect specializing in sustainable long-term goal achievement.

Given the following user input, generate a detailed 12-month execution plan:

## User Input
- Goal: ${goal}
- Experience Level: ${experience}
- Stack/Domain: ${stack}
- Time Available: ${timeAvailable}
- Constraints: ${constraints || "None specified"}

## Requirements

Generate a comprehensive plan following this EXACT JSON structure. Be specific, practical, and honest about difficulty. Assume the user is intelligent but human. No toxic positivity.

Return ONLY valid JSON (no markdown, no code blocks, just the raw JSON object):

{
  "meta": {
    "goal_statement": "Restate goal in measurable terms",
    "realistic_timeline": "Assessment of whether 12 months is realistic, with adjustments if needed",
    "critical_success_factors": ["Factor 1", "Factor 2", "Factor 3"],
    "common_failure_points": ["Failure point 1", "Failure point 2", "Failure point 3"]
  },
  "quarterly_map": {
    "Q1": {
      "name": "Foundation",
      "primary_objective": "Specific objective for Q1",
      "success_criteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
      "expected_skill_level": "Description of expected level",
      "stretch_goal": "Optional stretch goal"
    },
    "Q2": {
      "name": "Momentum",
      "primary_objective": "Specific objective for Q2",
      "success_criteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
      "expected_skill_level": "Description of expected level",
      "stretch_goal": "Optional stretch goal"
    },
    "Q3": {
      "name": "Application",
      "primary_objective": "Specific objective for Q3",
      "success_criteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
      "expected_skill_level": "Description of expected level",
      "stretch_goal": "Optional stretch goal"
    },
    "Q4": {
      "name": "Mastery & Portfolio",
      "primary_objective": "Specific objective for Q4",
      "success_criteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
      "expected_skill_level": "Description of expected level",
      "stretch_goal": "Optional stretch goal"
    }
  },
  "monthly_detail": [
    {
      "month": 1,
      "learning_focus": ["Topic 1", "Topic 2"],
      "practice_mode": "What they'll build or solve",
      "review_checkpoint": "What to revisit",
      "recovery_buffer": "Planned light period"
    }
  ],
  "weekly_template": {
    "structure": {
      "monday_wednesday": "Primary skill building focus",
      "thursday_friday": "Secondary skill or practice focus",
      "weekend": "Project work or review focus"
    },
    "multi_track_notes": "Notes for multi-track goals with alternating focus"
  },
  "daily_task_examples": [
    {
      "day": "Week 1 Monday",
      "core_task": {
        "description": "Specific task description",
        "duration": "20-40 min"
      },
      "extended_work": {
        "description": "Optional extended task",
        "duration": "30-60 min"
      },
      "quick_win": {
        "description": "Easy proof of showing up",
        "duration": "5-10 min"
      }
    }
  ],
  "sustainability": {
    "recovery_weeks": ["Week 6", "Week 12", "Week 18", "Week 24", "Week 30", "Week 36", "Week 42", "Week 48"],
    "flex_days_policy": "2 flex days per month, no penalties for skipping",
    "adjustment_checkpoints": ["End of Month 1", "End of Month 3", "End of Month 6", "End of Month 9"]
  },
  "metrics": {
    "daily": {
      "target": "80% completion rate",
      "tracking": "How to track daily progress"
    },
    "weekly": {
      "target": "Streak maintenance + key concept mastery",
      "tracking": "How to track weekly progress"
    },
    "monthly": {
      "target": "Milestone achievement + skill self-assessment",
      "tracking": "How to track monthly progress"
    },
    "quarterly": {
      "target": "Portfolio pieces + real-world capability",
      "tracking": "How to track quarterly progress"
    }
  },
  "recovery_protocol": {
    "days_1_to_3": "Resume immediately, no catch-up needed",
    "week_1": "Light re-entry week, then resume normal pace",
    "weeks_2_plus": "Reassess plan, potentially restart current month",
    "mindset": "Pause and resume, not failed. Consistency matters more than intensity."
  }
}

Generate ALL 12 months in the monthly_detail array. Include at least 4 daily task examples covering different days and weeks. Be specific to the user's goal, stack, and experience level.`;

    const bedrockResponse = await generateWithBedrock(prompt);
    const text = bedrockResponse.content;

    // Clean the response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    const plan = JSON.parse(cleanedText);

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json(
      { error: "Failed to generate plan. Please try again." },
      { status: 500 }
    );
  }
}
