// Goal categories with AI-driven follow-up questions
// This file provides structured fallback questions if AI generation fails
// and serves as a reference for the AI prompt

export interface GoalCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  followUpQuestions: FollowUpQuestion[];
}

export interface FollowUpOption {
  value: string;
  label: string;
  description?: string;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  type: "single" | "multi" | "text";
  reason?: string;
  options?: FollowUpOption[];
  dependsOn?: { questionId: string; value: string }; // Show only if previous question has this value
  conditionalQuestions?: ConditionalFollowUp[];
}

export interface ConditionalFollowUp {
  showWhen: string;
  id: string;
  question: string;
  type: "single" | "multi";
  reason?: string;
  options: FollowUpOption[];
}

export const GOAL_CATEGORIES: GoalCategory[] = [
  {
    id: "backend-engineer",
    name: "Backend Engineer",
    icon: "🔧",
    description: "Build server-side applications, APIs, and databases",
    followUpQuestions: [
      {
        id: "language",
        question: "Which programming language do you want to master?",
        type: "single",
        reason: "Your primary language determines your framework choices and job opportunities",
        options: [
          { value: "python", label: "Python", description: "Versatile, great for APIs and data" },
          { value: "javascript", label: "JavaScript/Node.js", description: "Full-stack potential, huge ecosystem" },
          { value: "go", label: "Go", description: "High performance, cloud-native, simple syntax" },
          { value: "java", label: "Java", description: "Enterprise-grade, Spring ecosystem" },
          { value: "rust", label: "Rust", description: "Systems programming, memory safety" },
          { value: "ruby", label: "Ruby", description: "Developer happiness, Rails framework" },
          { value: "csharp", label: "C#", description: ".NET ecosystem, enterprise apps" },
        ],
        conditionalQuestions: [
          {
            showWhen: "python",
            id: "framework-python",
            question: "Which Python web framework do you want to learn?",
            type: "single",
            reason: "Each framework has different strengths for different project types",
            options: [
              { value: "fastapi", label: "FastAPI", description: "Modern, async, automatic OpenAPI docs" },
              { value: "django", label: "Django", description: "Batteries-included, ORM, admin panel" },
              { value: "flask", label: "Flask", description: "Lightweight, flexible, microservices" },
            ],
          },
          {
            showWhen: "javascript",
            id: "framework-javascript",
            question: "Which Node.js framework do you prefer?",
            type: "single",
            reason: "Your framework choice affects project structure and TypeScript support",
            options: [
              { value: "express", label: "Express.js", description: "Minimal, flexible, most popular" },
              { value: "nestjs", label: "NestJS", description: "Enterprise, TypeScript-first, Angular-inspired" },
              { value: "fastify", label: "Fastify", description: "High performance, plugin architecture" },
              { value: "hono", label: "Hono", description: "Ultrafast, edge-ready, modern" },
            ],
          },
          {
            showWhen: "go",
            id: "framework-go",
            question: "Which Go web framework or approach?",
            type: "single",
            reason: "Go can be used with minimal frameworks or full-featured ones",
            options: [
              { value: "stdlib", label: "Standard Library", description: "Pure Go, no dependencies" },
              { value: "gin", label: "Gin", description: "Fast, popular, middleware support" },
              { value: "fiber", label: "Fiber", description: "Express-inspired, high performance" },
              { value: "echo", label: "Echo", description: "Minimalist, extensible" },
            ],
          },
          {
            showWhen: "java",
            id: "framework-java",
            question: "Which Java framework do you want to learn?",
            type: "single",
            reason: "Java frameworks range from heavyweight enterprise to cloud-native",
            options: [
              { value: "spring-boot", label: "Spring Boot", description: "Industry standard, enterprise-ready" },
              { value: "quarkus", label: "Quarkus", description: "Kubernetes-native, fast startup" },
              { value: "micronaut", label: "Micronaut", description: "Low memory, compile-time DI" },
            ],
          },
          {
            showWhen: "ruby",
            id: "framework-ruby",
            question: "Which Ruby framework?",
            type: "single",
            reason: "Ruby frameworks offer different levels of abstraction",
            options: [
              { value: "rails", label: "Ruby on Rails", description: "Full-featured MVC, convention over config" },
              { value: "sinatra", label: "Sinatra", description: "Lightweight DSL, microservices" },
              { value: "hanami", label: "Hanami", description: "Modern, clean architecture" },
            ],
          },
          {
            showWhen: "csharp",
            id: "framework-csharp",
            question: "Which .NET approach?",
            type: "single",
            reason: ".NET offers different project templates and patterns",
            options: [
              { value: "aspnet-core", label: "ASP.NET Core", description: "Full-featured web API framework" },
              { value: "minimal-apis", label: "Minimal APIs", description: "Lightweight, modern .NET 6+" },
              { value: "blazor", label: "Blazor", description: "Full-stack with C#" },
            ],
          },
        ],
      },
      {
        id: "database",
        question: "Which databases do you want to work with?",
        type: "multi",
        reason: "Most backend roles require both SQL and NoSQL knowledge",
        options: [
          { value: "postgresql", label: "PostgreSQL", description: "Feature-rich relational, industry favorite" },
          { value: "mongodb", label: "MongoDB", description: "Document-based, flexible schema" },
          { value: "redis", label: "Redis", description: "In-memory, caching, pub/sub" },
          { value: "mysql", label: "MySQL", description: "Popular relational, widely deployed" },
          { value: "dynamodb", label: "DynamoDB", description: "AWS serverless NoSQL" },
        ],
      },
      {
        id: "api-style",
        question: "What type of APIs do you want to build?",
        type: "multi",
        reason: "Different API styles serve different use cases",
        options: [
          { value: "rest", label: "REST APIs", description: "Standard HTTP endpoints, most common" },
          { value: "graphql", label: "GraphQL", description: "Flexible queries, single endpoint" },
          { value: "grpc", label: "gRPC", description: "High-performance, microservices" },
          { value: "websockets", label: "WebSockets", description: "Real-time, bidirectional" },
        ],
      },
      {
        id: "career-goal",
        question: "What's your primary career goal?",
        type: "single",
        reason: "Your goal shapes which topics we emphasize",
        options: [
          { value: "fulltime", label: "Full-time Job", description: "Employment at a company" },
          { value: "freelance", label: "Freelancing", description: "Contract work, independence" },
          { value: "startup", label: "Build a Startup", description: "Launch your own product" },
          { value: "upskill", label: "Upskill Current Role", description: "Advance in current position" },
        ],
      },
      {
        id: "additional-skills",
        question: "Which additional skills do you want to include?",
        type: "multi",
        reason: "These skills complement your backend knowledge",
        options: [
          { value: "docker", label: "Docker & Containers", description: "Containerization, deployment" },
          { value: "aws", label: "AWS/Cloud", description: "Cloud services, serverless" },
          { value: "testing", label: "Testing & TDD", description: "Unit, integration, e2e testing" },
          { value: "cicd", label: "CI/CD Pipelines", description: "Automated deployment" },
          { value: "security", label: "Security Basics", description: "OWASP, secure coding" },
        ],
      },
    ],
  },
  {
    id: "frontend-engineer",
    name: "Frontend Engineer",
    icon: "🎨",
    description: "Build beautiful, interactive user interfaces",
    followUpQuestions: [
      {
        id: "framework",
        question: "Which frontend framework do you want to master?",
        type: "single",
        reason: "Your framework choice determines your development workflow and job market",
        options: [
          { value: "react", label: "React", description: "Most popular, component-based, huge ecosystem" },
          { value: "vue", label: "Vue.js", description: "Progressive, approachable, great docs" },
          { value: "angular", label: "Angular", description: "Enterprise-ready, full framework, TypeScript" },
          { value: "svelte", label: "Svelte", description: "Compile-time, fast, minimal boilerplate" },
        ],
        conditionalQuestions: [
          {
            showWhen: "react",
            id: "react-meta-framework",
            question: "Which React meta-framework or approach?",
            type: "single",
            reason: "Meta-frameworks provide additional features like routing and SSR",
            options: [
              { value: "nextjs", label: "Next.js", description: "Full-featured, SSR/SSG, most popular" },
              { value: "remix", label: "Remix", description: "Full-stack, nested routes, web standards" },
              { value: "vite-react", label: "Vite + React", description: "SPA focused, fast development" },
              { value: "gatsby", label: "Gatsby", description: "Static sites, content-focused" },
            ],
          },
          {
            showWhen: "vue",
            id: "vue-meta-framework",
            question: "Which Vue setup or framework?",
            type: "single",
            reason: "Vue has great meta-frameworks for different use cases",
            options: [
              { value: "nuxt", label: "Nuxt.js", description: "Full-featured, SSR/SSG, Vue's Next.js" },
              { value: "vite-vue", label: "Vite + Vue", description: "SPA focused, lightning fast" },
              { value: "quasar", label: "Quasar", description: "Component library + framework" },
            ],
          },
          {
            showWhen: "angular",
            id: "angular-focus",
            question: "What type of Angular applications?",
            type: "single",
            reason: "Angular excels in different domains",
            options: [
              { value: "enterprise", label: "Enterprise Apps", description: "Complex business applications" },
              { value: "pwa", label: "Progressive Web Apps", description: "Offline-first, installable" },
              { value: "universal", label: "Angular Universal", description: "SSR, SEO-focused" },
            ],
          },
          {
            showWhen: "svelte",
            id: "svelte-framework",
            question: "Which Svelte setup?",
            type: "single",
            reason: "SvelteKit is the official full-stack framework",
            options: [
              { value: "sveltekit", label: "SvelteKit", description: "Full-featured, SSR, official" },
              { value: "vite-svelte", label: "Vite + Svelte", description: "Simple SPA setup" },
            ],
          },
        ],
      },
      {
        id: "styling",
        question: "Which styling approach do you prefer?",
        type: "single",
        reason: "Your styling choice affects maintainability and developer experience",
        options: [
          { value: "tailwind", label: "Tailwind CSS", description: "Utility-first, rapid development" },
          { value: "css-in-js", label: "CSS-in-JS", description: "Styled-components, Emotion" },
          { value: "sass", label: "Sass/SCSS", description: "CSS preprocessor, mature tooling" },
          { value: "css-modules", label: "CSS Modules", description: "Scoped CSS, simple setup" },
        ],
      },
      {
        id: "state-management",
        question: "Which state management approach?",
        type: "single",
        reason: "State management is crucial for complex applications",
        options: [
          { value: "built-in", label: "Built-in (Context/Signals)", description: "Framework's native solution" },
          { value: "zustand", label: "Zustand", description: "Simple, lightweight, React" },
          { value: "redux", label: "Redux Toolkit", description: "Enterprise-standard, predictable" },
          { value: "tanstack", label: "TanStack Query", description: "Server state management" },
        ],
      },
      {
        id: "additional-skills",
        question: "Which additional skills do you want to include?",
        type: "multi",
        reason: "These skills make you a more complete frontend developer",
        options: [
          { value: "typescript", label: "TypeScript", description: "Type safety, better DX" },
          { value: "testing", label: "Testing (Vitest/Playwright)", description: "Unit and E2E testing" },
          { value: "accessibility", label: "Accessibility (a11y)", description: "Inclusive design, WCAG" },
          { value: "performance", label: "Performance", description: "Core Web Vitals, optimization" },
          { value: "animation", label: "Animation (Framer Motion)", description: "Motion design, transitions" },
        ],
      },
    ],
  },
  {
    id: "fullstack-engineer",
    name: "Full-Stack Engineer",
    icon: "⚡",
    description: "Build complete applications from front to back",
    followUpQuestions: [
      {
        id: "stack",
        question: "Which full-stack combination?",
        type: "single",
        options: [
          { value: "mern", label: "MERN Stack", description: "MongoDB, Express, React, Node" },
          { value: "nextjs-fullstack", label: "Next.js Full-Stack", description: "React + API routes" },
          { value: "django-react", label: "Django + React", description: "Python backend" },
          { value: "rails-react", label: "Rails + React", description: "Ruby backend" },
          { value: "t3", label: "T3 Stack", description: "Next.js, tRPC, Prisma, Tailwind" },
        ],
      },
      {
        id: "database",
        question: "Primary database?",
        type: "single",
        options: [
          { value: "postgresql", label: "PostgreSQL", description: "Relational, robust" },
          { value: "mongodb", label: "MongoDB", description: "Document-based" },
          { value: "mysql", label: "MySQL", description: "Traditional relational" },
          { value: "supabase", label: "Supabase", description: "Postgres + realtime" },
        ],
      },
      {
        id: "deployment",
        question: "Deployment platform?",
        type: "single",
        options: [
          { value: "vercel", label: "Vercel", description: "Frontend-focused" },
          { value: "aws", label: "AWS", description: "Full cloud suite" },
          { value: "railway", label: "Railway", description: "Simple deployment" },
          { value: "docker", label: "Docker + VPS", description: "Self-managed" },
        ],
      },
    ],
  },
  {
    id: "ml-engineer",
    name: "ML/AI Engineer",
    icon: "🤖",
    description: "Build machine learning models and AI systems",
    followUpQuestions: [
      {
        id: "focus",
        question: "Which ML focus area?",
        type: "single",
        options: [
          { value: "ml-fundamentals", label: "ML Fundamentals", description: "Core algorithms" },
          { value: "deep-learning", label: "Deep Learning", description: "Neural networks" },
          { value: "nlp", label: "NLP", description: "Text and language" },
          { value: "computer-vision", label: "Computer Vision", description: "Image/video" },
          { value: "llm", label: "LLM/GenAI", description: "Large language models" },
        ],
      },
      {
        id: "framework",
        question: "Which ML framework?",
        type: "multi",
        options: [
          { value: "pytorch", label: "PyTorch", description: "Research-friendly" },
          { value: "tensorflow", label: "TensorFlow", description: "Production-ready" },
          { value: "scikit-learn", label: "Scikit-learn", description: "Traditional ML" },
          { value: "huggingface", label: "Hugging Face", description: "Transformers" },
          { value: "langchain", label: "LangChain", description: "LLM applications" },
        ],
      },
      {
        id: "math",
        question: "Math background?",
        type: "single",
        options: [
          { value: "beginner", label: "Need to learn", description: "Start from basics" },
          { value: "some", label: "Some background", description: "Know basics" },
          { value: "strong", label: "Strong background", description: "Ready for advanced" },
        ],
      },
    ],
  },
  {
    id: "devops-engineer",
    name: "DevOps Engineer",
    icon: "🚀",
    description: "Automate, deploy, and manage infrastructure",
    followUpQuestions: [
      {
        id: "cloud",
        question: "Which cloud platform?",
        type: "single",
        options: [
          { value: "aws", label: "AWS", description: "Market leader" },
          { value: "gcp", label: "Google Cloud", description: "ML-focused" },
          { value: "azure", label: "Azure", description: "Enterprise, Microsoft" },
          { value: "multi-cloud", label: "Multi-cloud", description: "Cloud-agnostic" },
        ],
      },
      {
        id: "tools",
        question: "Which tools to focus on?",
        type: "multi",
        options: [
          { value: "docker", label: "Docker", description: "Containerization" },
          { value: "kubernetes", label: "Kubernetes", description: "Orchestration" },
          { value: "terraform", label: "Terraform", description: "IaC" },
          { value: "ansible", label: "Ansible", description: "Configuration" },
          { value: "github-actions", label: "GitHub Actions", description: "CI/CD" },
          { value: "jenkins", label: "Jenkins", description: "CI/CD server" },
        ],
      },
      {
        id: "scripting",
        question: "Scripting language?",
        type: "single",
        options: [
          { value: "bash", label: "Bash", description: "Shell scripting" },
          { value: "python", label: "Python", description: "Automation" },
          { value: "go", label: "Go", description: "Cloud tooling" },
        ],
      },
    ],
  },
  {
    id: "mobile-developer",
    name: "Mobile Developer",
    icon: "📱",
    description: "Build iOS and Android applications",
    followUpQuestions: [
      {
        id: "platform",
        question: "Which platform?",
        type: "single",
        options: [
          { value: "cross-platform", label: "Cross-platform", description: "iOS & Android" },
          { value: "ios", label: "iOS Only", description: "Apple ecosystem" },
          { value: "android", label: "Android Only", description: "Google ecosystem" },
        ],
      },
      {
        id: "framework-cross",
        question: "Which cross-platform framework?",
        type: "single",
        dependsOn: { questionId: "platform", value: "cross-platform" },
        options: [
          { value: "react-native", label: "React Native", description: "JavaScript" },
          { value: "flutter", label: "Flutter", description: "Dart, Google" },
          { value: "expo", label: "Expo", description: "React Native simplified" },
        ],
      },
      {
        id: "framework-ios",
        question: "Which iOS approach?",
        type: "single",
        dependsOn: { questionId: "platform", value: "ios" },
        options: [
          { value: "swiftui", label: "SwiftUI", description: "Modern, declarative" },
          { value: "uikit", label: "UIKit", description: "Traditional, mature" },
        ],
      },
    ],
  },
  {
    id: "data-engineer",
    name: "Data Engineer",
    icon: "📊",
    description: "Build data pipelines and infrastructure",
    followUpQuestions: [
      {
        id: "tools",
        question: "Which data tools?",
        type: "multi",
        options: [
          { value: "spark", label: "Apache Spark", description: "Big data processing" },
          { value: "airflow", label: "Apache Airflow", description: "Workflow orchestration" },
          { value: "kafka", label: "Apache Kafka", description: "Streaming" },
          { value: "dbt", label: "dbt", description: "Data transformation" },
          { value: "snowflake", label: "Snowflake", description: "Cloud data warehouse" },
        ],
      },
      {
        id: "cloud",
        question: "Cloud platform?",
        type: "single",
        options: [
          { value: "aws", label: "AWS", description: "S3, Redshift, Glue" },
          { value: "gcp", label: "GCP", description: "BigQuery, Dataflow" },
          { value: "azure", label: "Azure", description: "Synapse, Data Factory" },
        ],
      },
    ],
  },
  {
    id: "dsa-leetcode",
    name: "DSA & LeetCode",
    icon: "🧩",
    description: "Master data structures, algorithms, and coding interviews",
    followUpQuestions: [
      {
        id: "language",
        question: "Which language for solving?",
        type: "single",
        options: [
          { value: "python", label: "Python", description: "Clean, fast to write" },
          { value: "javascript", label: "JavaScript", description: "Web interviews" },
          { value: "java", label: "Java", description: "Enterprise interviews" },
          { value: "cpp", label: "C++", description: "Competitive programming" },
        ],
      },
      {
        id: "target",
        question: "What's your target?",
        type: "single",
        options: [
          { value: "faang", label: "FAANG/Big Tech", description: "Top companies" },
          { value: "startup", label: "Startups", description: "Practical problems" },
          { value: "general", label: "General Prep", description: "All-around" },
          { value: "competitive", label: "Competitive Programming", description: "Contests" },
        ],
      },
      {
        id: "current-level",
        question: "Current LeetCode level?",
        type: "single",
        options: [
          { value: "beginner", label: "Beginner", description: "Just starting" },
          { value: "easy", label: "Can solve Easy", description: "Basic proficiency" },
          { value: "medium", label: "Can solve Medium", description: "Good foundation" },
          { value: "hard", label: "Working on Hard", description: "Advanced" },
        ],
      },
    ],
  },
  {
    id: "custom",
    name: "Custom Goal",
    icon: "✨",
    description: "Define your own learning path",
    followUpQuestions: [
      {
        id: "custom-goal",
        question: "Describe your specific goal",
        type: "text",
      },
      {
        id: "custom-skills",
        question: "What specific skills or technologies?",
        type: "text",
      },
    ],
  },
];

// Time commitment options
export const TIME_COMMITMENT_OPTIONS = [
  { value: "30min-daily", label: "30 minutes daily", description: "Light commitment" },
  { value: "1hr-daily", label: "1 hour daily", description: "Moderate pace" },
  { value: "2hr-daily", label: "2 hours daily", description: "Serious commitment" },
  { value: "3hr-daily", label: "3+ hours daily", description: "Intensive" },
  { value: "weekends-only", label: "Weekends only (4-6 hours)", description: "Weekend warrior" },
  { value: "flexible", label: "Flexible (varies)", description: "Adjust as needed" },
];

// Schedule type options
export const SCHEDULE_TYPE_OPTIONS = [
  { value: "weekdays", label: "Monday - Friday", description: "5 days/week" },
  { value: "fullweek", label: "Full Week", description: "7 days/week" },
];

// Experience level options
export const EXPERIENCE_LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner", description: "New to programming or this field" },
  { value: "some-experience", label: "Some Experience", description: "Know basics, built small projects" },
  { value: "intermediate", label: "Intermediate", description: "Comfortable building, want to level up" },
  { value: "advanced", label: "Advanced", description: "Strong foundation, targeting mastery" },
];

// Constraint options
export const CONSTRAINT_OPTIONS = [
  { value: "fulltime-job", label: "Full-time job", icon: "💼" },
  { value: "student", label: "Student", icon: "📚" },
  { value: "family", label: "Family commitments", icon: "👨‍👩‍👧" },
  { value: "health", label: "Health considerations", icon: "🏥" },
  { value: "timezone", label: "Timezone challenges", icon: "🌍" },
  { value: "motivation", label: "Motivation struggles", icon: "😔" },
  { value: "burnout-history", label: "Past burnout", icon: "🔥" },
  { value: "none", label: "No major constraints", icon: "✅" },
];
