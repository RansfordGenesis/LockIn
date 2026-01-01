import { NextRequest, NextResponse } from "next/server";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

interface ResourceRequest {
  taskTitle: string;
  taskDescription: string;
  taskType: string;
  category: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResourceRequest = await request.json();
    const { taskTitle, taskDescription, taskType, category } = body;

    if (!taskTitle || !category) {
      return NextResponse.json(
        { success: false, error: "Missing task title or category" },
        { status: 400 }
      );
    }

    const prompt = `You are a learning resource curator. Generate 4-6 high-quality learning resources for the following task.

Task: ${taskTitle}
Description: ${taskDescription || "N/A"}
Task Type: ${taskType || "learning"}
Category: ${category}

Return ONLY a valid JSON array with resources. Each resource must have:
- title: Name of the resource
- url: Real, working URL (use well-known platforms like YouTube, Coursera, MDN, freeCodeCamp, Khan Academy, Udemy, official docs, etc.)
- type: One of: documentation, video, course, article, tutorial, exercise, book, podcast, tool, project
- description: Brief 1-sentence description
- source: Platform name (e.g., "YouTube", "MDN", "freeCodeCamp")
- difficulty: beginner, intermediate, or advanced
- isFree: true or false
- estimatedMinutes: estimated time to complete (number)

Focus on:
- Real, accessible resources from reputable platforms
- Mix of free and paid options (prefer free)
- Variety of formats (videos, articles, interactive)
- Progressive difficulty levels

JSON array only, no markdown, no explanation:`;

    const invokeCommand = new InvokeModelCommand({
      modelId: "anthropic.claude-3-haiku-20240307-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const response = await bedrock.send(invokeCommand);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    let content = responseBody.content[0].text.trim();

    // Clean up the response
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Parse the JSON
    let resources;
    try {
      resources = JSON.parse(content);
    } catch {
      // Try to find JSON array in the response
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        resources = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse resources JSON");
      }
    }

    // Validate resources array
    if (!Array.isArray(resources)) {
      resources = [resources];
    }

    // Ensure each resource has required fields
    resources = resources.map((r: Record<string, unknown>) => ({
      title: r.title || "Learning Resource",
      url: r.url || "#",
      type: r.type || "article",
      description: r.description || "",
      source: r.source || "Web",
      difficulty: r.difficulty || "intermediate",
      isFree: r.isFree !== false,
      estimatedMinutes: r.estimatedMinutes || 30,
    }));

    return NextResponse.json({
      success: true,
      resources,
    });
  } catch (error) {
    console.error("Error generating resources:", error);
    
    // Return fallback resources based on category
    const fallbackResources = getFallbackResources();
    
    return NextResponse.json({
      success: true,
      resources: fallbackResources,
      fallback: true,
    });
  }
}

function getFallbackResources() {
  return [
    {
      title: "Google Search for Topic",
      url: "https://www.google.com",
      type: "tool",
      description: "Search for learning resources on this topic",
      source: "Google",
      difficulty: "beginner",
      isFree: true,
      estimatedMinutes: 10,
    },
    {
      title: "YouTube Tutorials",
      url: "https://www.youtube.com",
      type: "video",
      description: "Find video tutorials on this subject",
      source: "YouTube",
      difficulty: "beginner",
      isFree: true,
      estimatedMinutes: 30,
    },
    {
      title: "Coursera Courses",
      url: "https://www.coursera.org",
      type: "course",
      description: "Structured courses from top universities",
      source: "Coursera",
      difficulty: "intermediate",
      isFree: false,
      estimatedMinutes: 60,
    },
    {
      title: "freeCodeCamp",
      url: "https://www.freecodecamp.org",
      type: "tutorial",
      description: "Free coding tutorials and certifications",
      source: "freeCodeCamp",
      difficulty: "beginner",
      isFree: true,
      estimatedMinutes: 45,
    },
  ];
}
