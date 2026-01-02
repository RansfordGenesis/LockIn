import { NextRequest, NextResponse } from "next/server";
import { generateWithBedrock } from "@/lib/bedrock";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goal, selectedCategory, categoryName } = body;

    if (!goal || goal.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please describe your goal in more detail" },
        { status: 400 }
      );
    }

    const categoryContext = categoryName 
      ? `\n\nIMPORTANT: The user has already selected their learning category as "${categoryName}" (ID: ${selectedCategory}). 
You MUST respect this category selection. Generate questions appropriate for this category, NOT a different one.
For example, if they selected "Academic Studies" and want AWS certification, treat it as academic/certification prep, not as Cloud Engineering career path.`
      : '';

    const prompt = `You are an expert technical curriculum architect and career coach specializing in creating personalized, industry-aligned learning roadmaps.

Your task is to analyze the user's learning goal and generate intelligent, contextual follow-up questions that will help create a highly structured, practical learning plan.

User's Goal: "${goal}"${categoryContext}

=== ANALYSIS FRAMEWORK ===

1. DETECT THE ROLE/CATEGORY
Identify which career path or skill area the user is pursuing:

TECH CATEGORIES:
- Backend Engineer (Python, JavaScript/Node, Go, Java, Rust, Ruby, C#, PHP)
- Frontend Engineer (React, Vue, Angular, Svelte, vanilla JS)
- Full-Stack Engineer (MERN, Next.js, Django+React, Rails+React, T3 Stack, Laravel)
- ML/AI Engineer (Deep Learning, NLP, Computer Vision, LLMs, MLOps)
- Data Engineer (Pipelines, ETL, Spark, Airflow, dbt, Kafka)
- Data Scientist (Analysis, Statistics, ML, Visualization)
- DevOps/SRE Engineer (Cloud, CI/CD, Kubernetes, Terraform, Monitoring)
- Mobile Developer (iOS, Android, React Native, Flutter)
- Cloud Engineer (AWS, GCP, Azure, Multi-cloud)
- Cybersecurity Analyst (AppSec, Network, Penetration Testing, SOC)
- QA Engineer (Manual, Automation, Performance, Security Testing)
- Game Developer (Unity, Unreal, Godot)
- Blockchain Developer (Solidity, Web3, Smart Contracts)
- DSA & Interview Prep (LeetCode, System Design)
- Product Manager (Technical PM skills)

NON-TECH CATEGORIES:
- Academic Studies (Certifications like AWS/Azure/GCP, exam prep, school subjects, standardized tests)
- Language Learning (Foreign languages, JLPT, DELE, TOEFL)
- Fitness & Health (Exercise, nutrition, wellness, sports)
- Music & Instruments (Guitar, piano, production, theory)
- Business & Entrepreneurship (Startups, marketing, finance, leadership)
- Creative Arts (Drawing, design, photography, writing)
- Personal Development (Habits, mindfulness, life skills)
- Professional Skills (Public speaking, project management)

2. GENERATE CONTEXTUAL QUESTIONS
Based on the detected category, generate 4-6 smart follow-up questions in a LOGICAL SEQUENCE:

QUESTION FLOW STRATEGY:
- Question 1: PRIMARY TECHNOLOGY CHOICE (language, platform, or main tool)
- Question 2: FRAMEWORK/SPECIALIZATION (dependent on Q1 answer - e.g., if Python → Django/Flask/FastAPI)
- Question 3: SUPPORTING TECHNOLOGIES (databases, cloud, tools that complement Q1/Q2)
- Question 4: FOCUS AREA (what aspect to emphasize - web, APIs, microservices, etc.)
- Question 5: CAREER GOAL (job type, company size, freelance, etc.)
- Question 6 (optional): ADDITIONAL SKILLS (testing, security, DevOps integration, etc.)

=== CATEGORY-SPECIFIC QUESTION TEMPLATES ===

FOR BACKEND ENGINEER:
1. "Which programming language do you want to master?" → Python, JavaScript/Node.js, Go, Java, Rust, C#, Ruby
2. IF Python → "Which Python framework?" → Django (full-featured), FastAPI (modern APIs), Flask (lightweight)
   IF JavaScript → "Which Node.js framework?" → Express.js (minimal), NestJS (enterprise), Fastify (performance)
   IF Java → "Which Java framework?" → Spring Boot (enterprise), Quarkus (cloud-native), Micronaut (microservices)
   IF Go → "Which Go framework/approach?" → Standard library, Gin, Fiber, Echo
   IF Ruby → "Which Ruby framework?" → Rails (full-stack), Sinatra (lightweight), Hanami (modern)
3. "Which databases do you want to work with?" → PostgreSQL, MongoDB, MySQL, Redis, DynamoDB (multi-select)
4. "What type of backend systems interest you?" → REST APIs, GraphQL, Microservices, Real-time/WebSockets, Event-driven
5. "What's your end goal?" → Full-time job, Freelancing, Building a startup, Personal projects
6. "Additional skills to include?" → Docker/Containers, AWS/Cloud, Testing/TDD, CI/CD, Security (multi-select)

FOR FRONTEND ENGINEER:
1. "Which frontend framework?" → React, Vue.js, Angular, Svelte, Vanilla JS/TypeScript
2. "Which styling approach?" → Tailwind CSS, CSS-in-JS (Styled Components), Sass/SCSS, CSS Modules
3. "State management preference?" → Redux, Zustand, Context API, Pinia (Vue), Signals
4. "What type of applications?" → SPAs, SSR/SSG (Next.js/Nuxt), PWAs, Component Libraries
5. "Additional skills?" → TypeScript, Testing (Jest/Vitest), Accessibility, Performance, Animation

FOR ML/AI ENGINEER:
1. "Which ML/AI focus area?" → Classical ML, Deep Learning, NLP, Computer Vision, LLMs/GenAI, MLOps
2. "Which framework?" → PyTorch, TensorFlow, scikit-learn, Hugging Face, LangChain (multi-select)
3. "Math foundation level?" → Need to learn basics, Some background, Strong foundation
4. "Deployment focus?" → Research/Experimentation, Production ML, Edge/Mobile AI, Cloud MLOps
5. "Which cloud platform for ML?" → AWS SageMaker, GCP Vertex AI, Azure ML, Self-hosted

FOR DEVOPS/CLOUD ENGINEER:
1. "Which cloud platform?" → AWS, Google Cloud, Azure, Multi-cloud approach
2. "Which infrastructure tools?" → Terraform, Ansible, Pulumi, CloudFormation (multi-select)
3. "Container orchestration?" → Kubernetes, Docker Swarm, ECS/Fargate, Nomad
4. "CI/CD platform?" → GitHub Actions, GitLab CI, Jenkins, ArgoCD, CircleCI
5. "Monitoring & Observability?" → Prometheus/Grafana, Datadog, New Relic, ELK Stack

FOR MOBILE DEVELOPER:
1. "Which platform?" → iOS only, Android only, Cross-platform (both)
2. IF Cross-platform → "Which framework?" → React Native, Flutter, Expo, Kotlin Multiplatform
   IF iOS → "Which approach?" → SwiftUI (modern), UIKit (traditional), Both
   IF Android → "Which approach?" → Jetpack Compose (modern), XML Views (traditional), Both
3. "Backend integration?" → Firebase, Custom API, Supabase, AWS Amplify
4. "App type focus?" → Consumer apps, Enterprise apps, Games, E-commerce

FOR ACADEMIC STUDIES / CERTIFICATIONS:
1. "Which certification or exam?" → AWS (Solutions Architect, Developer, etc.), Azure, GCP, CompTIA, PMP, CISSP, etc.
2. "What's your current experience level with this subject?" → Complete beginner, Some familiarity, Experienced but need certification
3. "What's your study timeline?" → 1 month, 2-3 months, 6 months, Flexible
4. "Preferred learning style?" → Video courses, Reading/documentation, Hands-on labs, Practice exams
5. "What's driving this certification?" → Career advancement, Job requirement, New career path, Personal goal

FOR LANGUAGE LEARNING:
1. "Which language?" → Spanish, French, German, Japanese, Mandarin, Korean, etc.
2. "What's your current level?" → Complete beginner, Elementary, Intermediate, Advanced
3. "Primary goal?" → Conversational fluency, Business/professional, Travel, Academic, Pass an exam (JLPT, DELE, etc.)
4. "Preferred learning methods?" → Speaking practice, Grammar study, Immersion, Apps/games (multi-select)
5. "How much time per day?" → 15-30 minutes, 1 hour, 2+ hours

FOR FITNESS & HEALTH:
1. "Primary fitness goal?" → Build muscle, Lose weight, Improve endurance, General health, Athletic performance
2. "Current fitness level?" → Beginner, Intermediate, Advanced
3. "Workout preference?" → Gym/weights, Home workouts, Running/cardio, Sports, Yoga/flexibility
4. "Any constraints?" → Limited equipment, Injuries, Time-limited, None
5. "Include nutrition planning?" → Yes (meal planning), Just basics, No (focus on exercise only)

FOR MUSIC & INSTRUMENTS:
1. "Which instrument or skill?" → Guitar, Piano, Drums, Voice, Music production, Music theory
2. "Current skill level?" → Complete beginner, Know the basics, Intermediate, Advanced
3. "Music genre focus?" → Rock/Pop, Classical, Jazz, Electronic, Multiple genres
4. "Learning goal?" → Play for fun, Perform live, Compose/write songs, Professional career

FOR BUSINESS & ENTREPRENEURSHIP:
1. "Which area?" → Starting a business, Marketing, Finance, Leadership, Sales
2. "Current stage?" → Idea phase, Just starting, Growing existing business, Career development
3. "Industry focus?" → Tech, E-commerce, Services, Consulting, General
4. "Primary goal?" → Launch a product, Increase revenue, Build a team, Personal brand

=== OUTPUT FORMAT ===

Return ONLY valid JSON (no markdown, no code blocks):

{
  "detectedCategory": "backend|frontend|fullstack|ml-ai|data-engineer|data-scientist|devops|mobile|cloud|cybersecurity|qa|game-dev|blockchain|dsa|product|academic|language|fitness|music|business|creative|personal|professional",
  "categoryName": "Human-readable category name (e.g., 'Backend Development', 'Academic Studies', 'AWS Certification')",
  "categoryIcon": "Single emoji representing this category",
  "summary": "One clear sentence summarizing their goal and what you'll help them achieve",
  "questions": [
    {
      "id": "primary-choice",
      "question": "Clear, specific question about their primary choice (technology, subject, focus area)",
      "type": "single",
      "reason": "Brief explanation of why this matters for their learning path",
      "options": [
        {"value": "tech1", "label": "Technology 1", "description": "Brief description of when to choose this"},
        {"value": "tech2", "label": "Technology 2", "description": "Brief description"},
        {"value": "tech3", "label": "Technology 3", "description": "Brief description"},
        {"value": "tech4", "label": "Technology 4", "description": "Brief description"}
      ],
      "conditionalQuestions": [
        {
          "showWhen": "tech1",
          "id": "framework-tech1",
          "question": "Follow-up question specific to tech1",
          "type": "single",
          "reason": "Why this matters",
          "options": [...]
        }
      ]
    },
    {
      "id": "databases",
      "question": "Which databases or data stores do you want to learn?",
      "type": "multi",
      "reason": "Databases are essential for most applications",
      "options": [...]
    }
  ],
  "suggestedTimeCommitment": "1hr-daily|2hr-daily|3hr-daily (based on goal complexity)"
}

=== CRITICAL RULES ===

1. Generate 4-6 questions that BUILD ON EACH OTHER logically
2. Include at least ONE conditional question that depends on a previous answer
3. Mix of "single" (one choice) and "multi" (multiple choices) question types
4. Each option MUST have a helpful description explaining when/why to choose it
5. ALWAYS include an "Other" option as the LAST option for each question with value "other" and label "Other (I'll specify)" so users can enter their own choice if not listed
6. DO NOT ask about experience level (handled separately in the wizard)
7. You MAY ask about timeline/study duration if relevant to the goal (certifications, language learning, etc.). If you do, set suggestedTimeCommitment to null.
8. You MAY ask about daily time commitment if relevant. If you do, set suggestedTimeCommitment to null.
9. If you DON'T ask about time commitment, provide a suggestedTimeCommitment value based on goal complexity.
10. Questions should flow naturally: Primary choice → Specialization → Supporting tools → Goals
11. Make options industry-relevant and up-to-date (2024-2025 technologies)
12. Each question's "reason" should be encouraging and explain the value
13. Provide 5-8 good options per question covering most common choices, PLUS the "Other" option

Generate questions that will help create a comprehensive, practical, industry-aligned learning roadmap.`;

    const bedrockResponse = await generateWithBedrock(prompt);
    const text = bedrockResponse.content;

    // Clean the response
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
    else if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
    if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);
    cleanedText = cleanedText.trim();

    const aiResponse = JSON.parse(cleanedText);

    return NextResponse.json({
      success: true,
      ...aiResponse,
    });
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze your goal. Please try again." },
      { status: 500 }
    );
  }
}
