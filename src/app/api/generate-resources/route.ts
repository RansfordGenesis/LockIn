import { NextRequest, NextResponse } from "next/server";

interface ResourceRequest {
  taskTitle: string;
  taskDescription: string;
  taskType: string;
  category: string;
}

// Known documentation sites that are guaranteed to work
const DOC_SITES: Record<string, { url: string; name: string }> = {
  python: { url: "https://docs.python.org/3/", name: "Python Docs" },
  javascript: { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript", name: "MDN JavaScript" },
  typescript: { url: "https://www.typescriptlang.org/docs/", name: "TypeScript Docs" },
  react: { url: "https://react.dev/", name: "React Docs" },
  nextjs: { url: "https://nextjs.org/docs", name: "Next.js Docs" },
  nodejs: { url: "https://nodejs.org/docs/latest/api/", name: "Node.js Docs" },
  django: { url: "https://docs.djangoproject.com/", name: "Django Docs" },
  fastapi: { url: "https://fastapi.tiangolo.com/", name: "FastAPI Docs" },
  flask: { url: "https://flask.palletsprojects.com/", name: "Flask Docs" },
  postgresql: { url: "https://www.postgresql.org/docs/", name: "PostgreSQL Docs" },
  mongodb: { url: "https://www.mongodb.com/docs/", name: "MongoDB Docs" },
  docker: { url: "https://docs.docker.com/", name: "Docker Docs" },
  kubernetes: { url: "https://kubernetes.io/docs/", name: "Kubernetes Docs" },
  git: { url: "https://git-scm.com/doc", name: "Git Documentation" },
  github: { url: "https://docs.github.com/", name: "GitHub Docs" },
  aws: { url: "https://docs.aws.amazon.com/", name: "AWS Docs" },
  css: { url: "https://developer.mozilla.org/en-US/docs/Web/CSS", name: "MDN CSS" },
  html: { url: "https://developer.mozilla.org/en-US/docs/Web/HTML", name: "MDN HTML" },
  sql: { url: "https://www.w3schools.com/sql/", name: "W3Schools SQL" },
  vue: { url: "https://vuejs.org/guide/", name: "Vue.js Guide" },
  angular: { url: "https://angular.io/docs", name: "Angular Docs" },
  tailwind: { url: "https://tailwindcss.com/docs", name: "Tailwind CSS Docs" },
  redis: { url: "https://redis.io/docs/", name: "Redis Docs" },
  graphql: { url: "https://graphql.org/learn/", name: "GraphQL Learn" },
  rust: { url: "https://doc.rust-lang.org/book/", name: "Rust Book" },
  go: { url: "https://go.dev/doc/", name: "Go Documentation" },
  java: { url: "https://docs.oracle.com/en/java/", name: "Java Docs" },
  kotlin: { url: "https://kotlinlang.org/docs/", name: "Kotlin Docs" },
  swift: { url: "https://docs.swift.org/", name: "Swift Docs" },
  machine_learning: { url: "https://scikit-learn.org/stable/user_guide.html", name: "Scikit-learn Guide" },
  tensorflow: { url: "https://www.tensorflow.org/learn", name: "TensorFlow Learn" },
  pytorch: { url: "https://pytorch.org/tutorials/", name: "PyTorch Tutorials" },
};

// Generate search URLs that always work
function generateSearchUrl(platform: string, query: string): string {
  const encodedQuery = encodeURIComponent(query);
  const searchUrls: Record<string, string> = {
    youtube: `https://www.youtube.com/results?search_query=${encodedQuery}+tutorial`,
    google: `https://www.google.com/search?q=${encodedQuery}+tutorial`,
    stackoverflow: `https://stackoverflow.com/search?q=${encodedQuery}`,
    github: `https://github.com/search?q=${encodedQuery}&type=repositories`,
    devto: `https://dev.to/search?q=${encodedQuery}`,
    medium: `https://medium.com/search?q=${encodedQuery}`,
    freecodecamp: `https://www.freecodecamp.org/news/search/?query=${encodedQuery}`,
    coursera: `https://www.coursera.org/search?query=${encodedQuery}`,
    udemy: `https://www.udemy.com/courses/search/?q=${encodedQuery}`,
    w3schools: `https://www.w3schools.com/search/search.asp?q=${encodedQuery}`,
  };
  return searchUrls[platform] || searchUrls.google;
}

// Detect technologies from task title and description
function detectTechnologies(text: string): string[] {
  const textLower = text.toLowerCase();
  const detected: string[] = [];
  
  for (const tech of Object.keys(DOC_SITES)) {
    // Handle variations
    const variations = [tech, tech.replace("_", " "), tech.replace("_", "-")];
    if (tech === "nextjs") variations.push("next.js", "next js");
    if (tech === "nodejs") variations.push("node.js", "node js", "node");
    if (tech === "machine_learning") variations.push("ml", "machine learning");
    
    if (variations.some(v => textLower.includes(v))) {
      detected.push(tech);
    }
  }
  
  return detected;
}

// Generate curated resources with guaranteed working links
function generateResources(taskTitle: string, taskDescription: string, taskType: string, category: string) {
  const resources: Array<{
    title: string;
    url: string;
    type: string;
    description: string;
    source: string;
    difficulty: string;
    isFree: boolean;
    estimatedMinutes: number;
  }> = [];
  
  const searchQuery = taskTitle.split(/[\s\-:,]+/).filter(w => w.length > 2).slice(0, 4).join(" ");
  const fullText = `${taskTitle} ${taskDescription} ${category}`;
  const detectedTechs = detectTechnologies(fullText);
  
  // 1. Add official documentation for detected technologies
  for (const tech of detectedTechs.slice(0, 2)) {
    const doc = DOC_SITES[tech];
    if (doc) {
      resources.push({
        title: doc.name,
        url: doc.url,
        type: "documentation",
        description: `Official ${tech} docs`,
        source: doc.name.split(" ")[0],
        difficulty: "beginner",
        isFree: true,
        estimatedMinutes: 20,
      });
    }
  }
  
  // 2. Add YouTube search
  resources.push({
    title: `${searchQuery} Tutorials`,
    url: generateSearchUrl("youtube", searchQuery),
    type: "video",
    description: `Video tutorials`,
    source: "YouTube",
    difficulty: "beginner",
    isFree: true,
    estimatedMinutes: 15,
  });
  
  // 3. Add practice resources based on task type
  if (taskType === "practice" || taskType === "build") {
    resources.push({
      title: `${searchQuery} Examples`,
      url: generateSearchUrl("github", searchQuery),
      type: "project",
      description: `Code examples & projects`,
      source: "GitHub",
      difficulty: "intermediate",
      isFree: true,
      estimatedMinutes: 30,
    });
  }
  
  // 4. Add articles
  resources.push({
    title: `${searchQuery} Articles`,
    url: generateSearchUrl("devto", searchQuery),
    type: "article",
    description: `Community tutorials`,
    source: "Dev.to",
    difficulty: "intermediate",
    isFree: true,
    estimatedMinutes: 15,
  });
  
  // 5. Add Stack Overflow for troubleshooting
  resources.push({
    title: `${searchQuery} Q&A`,
    url: generateSearchUrl("stackoverflow", searchQuery),
    type: "tool",
    description: `Common questions`,
    source: "Stack Overflow",
    difficulty: "intermediate",
    isFree: true,
    estimatedMinutes: 10,
  });
  
  // 6. Add course search for learn tasks (Coursera has free audits but courses are paid)
  if (taskType === "learn" || taskType === "review") {
    resources.push({
      title: `Courses: ${searchQuery}`,
      url: generateSearchUrl("coursera", searchQuery),
      type: "course",
      description: `Structured university courses`,
      source: "Coursera",
      difficulty: "intermediate",
      isFree: false,
      estimatedMinutes: 60,
    });
  }
  
  return resources.slice(0, 6);
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

    // Generate curated resources with guaranteed working links
    const resources = generateResources(taskTitle, taskDescription || "", taskType || "learn", category);

    return NextResponse.json({
      success: true,
      resources,
    });
  } catch (error) {
    console.error("Error generating resources:", error);
    
    // Return fallback resources
    return NextResponse.json({
      success: true,
      resources: [
        {
          title: "Search for Learning Resources",
          url: "https://www.google.com/search?q=learning+tutorial",
          type: "tool",
          description: "Search for learning resources on this topic",
          source: "Google",
          difficulty: "beginner",
          isFree: true,
          estimatedMinutes: 10,
        },
        {
          title: "Video Tutorials",
          url: "https://www.youtube.com",
          type: "video",
          description: "Find video tutorials on this subject",
          source: "YouTube",
          difficulty: "beginner",
          isFree: true,
          estimatedMinutes: 30,
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
      ],
      fallback: true,
    });
  }
}
