import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { format, addDays, getDay } from "date-fns";
import { generateWithBedrock } from "@/lib/bedrock";
import type { GoalInput } from "@/types/plan";
import type { DailyTask } from "@/lib/dynamodb";

// Helper to convert time commitment to minutes
function getMinutesFromCommitment(timeCommitment: string): number {
  const map: Record<string, number> = {
    "30min-daily": 30,
    "1hr-daily": 60,
    "2hr-daily": 120,
    "3hr-daily": 180,
  };
  return map[timeCommitment] || 60;
}

// Generate date list based on schedule type and custom timeline
function generateDates(
  scheduleType: "weekdays" | "fullweek",
  startDate?: string,
  totalDays?: number
): { date: string; dayOfWeek: number; month: number; week: number }[] {
  const dates: { date: string; dayOfWeek: number; month: number; week: number }[] = [];
  
  // Parse start date or default to tomorrow
  let current: Date;
  if (startDate) {
    const parts = startDate.split("-");
    current = new Date(Number.parseInt(parts[0]), Number.parseInt(parts[1]) - 1, Number.parseInt(parts[2]));
  } else {
    current = new Date();
    current = addDays(current, 1); // Start tomorrow
  }
  
  // Calculate end date based on totalDays or default to 365 days
  const maxDaysToCheck = (totalDays || 365) * 2; // Check more calendar days than needed for weekday schedules
  const targetDays = totalDays || 365;
  
  let weekCounter = 1;
  let lastDow = -1;
  let daysAdded = 0;
  let daysChecked = 0;

  while (daysAdded < targetDays && daysChecked < maxDaysToCheck) {
    const dow = getDay(current);
    // Increment week on Sunday
    if (dow === 0 && lastDow !== -1) weekCounter++;
    lastDow = dow;

    const isWorkDay = scheduleType === "fullweek" || (dow >= 1 && dow <= 5);
    if (isWorkDay) {
      dates.push({
        date: format(current, "yyyy-MM-dd"),
        dayOfWeek: dow,
        month: current.getMonth() + 1,
        week: weekCounter,
      });
      daysAdded++;
    }
    current = addDays(current, 1);
    daysChecked++;
  }
  return dates;
}

// Legacy function for backwards compatibility
function generate2026Dates(scheduleType: "weekdays" | "fullweek"): { date: string; dayOfWeek: number; month: number; week: number }[] {
  return generateDates(scheduleType, "2026-01-01", scheduleType === "weekdays" ? 260 : 365);
}

// Resource type for tasks
type ResourceType = "documentation" | "video" | "course" | "article" | "tutorial" | "exercise" | "book" | "podcast" | "tool";

interface TaskResource {
  type: ResourceType;
  title: string;
  url: string;
  description?: string;
  source?: string;
  estimatedMinutes?: number;
  difficulty?: DifficultyLevel;
  isFree?: boolean;
}

// Type alias for difficulty levels
type DifficultyLevel = "beginner" | "intermediate" | "advanced";

// Generate relevant resources based on task topic and type
function generateTaskResources(
  taskTitle: string,
  taskType: string,
  category: string,
  level: string
): TaskResource[] {
  const resources: TaskResource[] = [];
  const titleLower = taskTitle.toLowerCase();
  const categoryLower = category.toLowerCase();
  
  // Extract keywords from task title
  const keywords = titleLower.split(/[\s\-:,]+/).filter(w => w.length > 2);
  const searchQuery = encodeURIComponent(keywords.slice(0, 4).join(" "));
  
  // Determine difficulty based on level
  const getDifficulty = (lvl: string): "beginner" | "intermediate" | "advanced" => {
    if (lvl === "beginner") return "beginner";
    if (lvl === "intermediate") return "intermediate";
    return "advanced";
  };
  const difficulty = getDifficulty(level);
  
  // Add documentation resource based on technology
  const docMappings: Record<string, { title: string; url: string; source: string }> = {
    python: { title: "Python Official Docs", url: "https://docs.python.org/3/", source: "Python.org" },
    javascript: { title: "MDN JavaScript", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript", source: "MDN" },
    typescript: { title: "TypeScript Docs", url: "https://www.typescriptlang.org/docs/", source: "TypeScript" },
    react: { title: "React Documentation", url: "https://react.dev/", source: "React.dev" },
    nextjs: { title: "Next.js Docs", url: "https://nextjs.org/docs", source: "Next.js" },
    "next.js": { title: "Next.js Docs", url: "https://nextjs.org/docs", source: "Next.js" },
    node: { title: "Node.js Docs", url: "https://nodejs.org/docs/", source: "Node.js" },
    django: { title: "Django Documentation", url: "https://docs.djangoproject.com/", source: "Django" },
    fastapi: { title: "FastAPI Docs", url: "https://fastapi.tiangolo.com/", source: "FastAPI" },
    postgresql: { title: "PostgreSQL Docs", url: "https://www.postgresql.org/docs/", source: "PostgreSQL" },
    mongodb: { title: "MongoDB Manual", url: "https://www.mongodb.com/docs/manual/", source: "MongoDB" },
    docker: { title: "Docker Docs", url: "https://docs.docker.com/", source: "Docker" },
    git: { title: "Git Documentation", url: "https://git-scm.com/doc", source: "Git SCM" },
    aws: { title: "AWS Documentation", url: "https://docs.aws.amazon.com/", source: "AWS" },
    css: { title: "MDN CSS", url: "https://developer.mozilla.org/en-US/docs/Web/CSS", source: "MDN" },
    html: { title: "MDN HTML", url: "https://developer.mozilla.org/en-US/docs/Web/HTML", source: "MDN" },
    sql: { title: "SQL Tutorial", url: "https://www.w3schools.com/sql/", source: "W3Schools" },
  };
  
  // Add documentation based on detected technology
  for (const [tech, doc] of Object.entries(docMappings)) {
    if (titleLower.includes(tech) || categoryLower.includes(tech)) {
      resources.push({
        type: "documentation",
        title: doc.title,
        url: doc.url,
        source: doc.source,
        difficulty,
        isFree: true,
      });
      break;
    }
  }
  
  // Add video resource for learn tasks
  if (taskType === "learn" || taskType === "review") {
    resources.push({
      type: "video",
      title: `Learn ${keywords.slice(0, 3).join(" ")}`,
      url: `https://www.youtube.com/results?search_query=${searchQuery}+tutorial`,
      source: "YouTube",
      estimatedMinutes: 15,
      difficulty,
      isFree: true,
    });
  }
  
  // Add practice resource
  if (taskType === "practice" || taskType === "build") {
    const practiceResources: Record<string, { title: string; url: string; source: string }> = {
      python: { title: "Python Exercises", url: "https://www.hackerrank.com/domains/python", source: "HackerRank" },
      javascript: { title: "JavaScript Practice", url: "https://www.codewars.com/?language=javascript", source: "Codewars" },
      sql: { title: "SQL Practice", url: "https://www.hackerrank.com/domains/sql", source: "HackerRank" },
      react: { title: "React Challenges", url: "https://www.frontendmentor.io/", source: "Frontend Mentor" },
    };
    
    for (const [tech, resource] of Object.entries(practiceResources)) {
      if (titleLower.includes(tech) || categoryLower.includes(tech)) {
        resources.push({
          type: "exercise",
          title: resource.title,
          url: resource.url,
          source: resource.source,
          difficulty,
          isFree: true,
        });
        break;
      }
    }
  }
  
  // Add article resource
  resources.push({
    type: "article",
    title: `Guide: ${keywords.slice(0, 3).join(" ")}`,
    url: `https://dev.to/search?q=${searchQuery}`,
    source: "Dev.to",
    difficulty,
    isFree: true,
  });
  
  return resources.slice(0, 3); // Max 3 resources per task
}

// Interface for monthly theme
interface MonthlyTheme {
  month: number;
  theme: string;
  focus: string;
  topics: string[];
  project: string;
}

// Generate category-specific fallback tasks with SPECIFIC task titles
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateCategorySpecificTasks(category: string, goal: string, _level: string) {
  const categoryLC = category.toLowerCase();
  const goalLC = goal.toLowerCase();
  
  // Define comprehensive curriculums with SPECIFIC task titles
  const curriculums: Record<string, {
    themes: { theme: string; focus: string; topics: string[]; project: string; tasks: string[] }[];
  }> = {
    "backend": {
      themes: [
        { 
          theme: "🏗️ Core Foundations", 
          focus: "Python fundamentals and version control", 
          topics: ["Python OOP", "async/await", "decorators", "typing", "Git & GitHub"],
          project: "Build a CLI tool with proper OOP structure",
          tasks: [
            "Learn Python classes and __init__ methods",
            "Practice Python inheritance and method overriding", 
            "Implement Python decorators for logging",
            "Master Python async/await with asyncio",
            "Add type hints to existing Python code",
            "Set up Git repository with .gitignore",
            "Create meaningful Git commits with proper messages",
            "Practice Git branching and merging",
            "Open your first Pull Request on GitHub",
            "Review Python virtual environments (venv)",
            "Understand Python packages and modules",
            "Implement context managers with __enter__/__exit__",
            "Build: CLI Task Manager with OOP",
            "Add async file operations to your CLI",
            "Write Python unit tests with pytest",
            "Practice: Git rebase and conflict resolution",
            "Create GitHub Actions workflow for linting",
            "Implement Python dataclasses for models",
            "Master Python generators and iterators",
            "Build: GitHub-integrated Python project",
            "Review: Python best practices and PEP8",
            "Document your code with docstrings"
          ]
        },
        {
          theme: "🌐 Web & HTTP Basics",
          focus: "HTTP protocol and REST principles",
          topics: ["HTTP methods", "Status codes", "REST principles", "JSON", "Client-server"],
          project: "Build a REST API documentation page",
          tasks: [
            "Study HTTP request/response cycle",
            "Learn GET, POST, PUT, DELETE, PATCH methods",
            "Understand HTTP status codes (200, 201, 400, 401, 404, 500)",
            "Practice: Make HTTP requests with Python requests library",
            "Learn REST API design principles",
            "Implement proper REST resource naming",
            "Work with JSON serialization/deserialization",
            "Study API versioning strategies",
            "Practice: Parse complex JSON responses",
            "Learn about HTTP headers and content types",
            "Understand cookies and sessions",
            "Study CORS and cross-origin requests",
            "Implement request retry logic",
            "Learn API rate limiting concepts",
            "Practice: Build HTTP client wrapper class",
            "Study API authentication methods overview",
            "Learn URL encoding and query parameters",
            "Practice: Handle HTTP errors gracefully",
            "Build: REST API specification document",
            "Study OpenAPI/Swagger basics",
            "Review: HTTP protocol fundamentals",
            "Quiz: REST principles assessment"
          ]
        },
        {
          theme: "⚙️ Django Framework",
          focus: "Django project structure and ORM",
          topics: ["Django setup", "Models & ORM", "Views", "Templates", "Admin"],
          project: "Build a blog with Django",
          tasks: [
            "Set up Django project with proper structure",
            "Create Django apps and understand app structure",
            "Define Django models with field types",
            "Practice: Django ORM queries (filter, exclude, annotate)",
            "Create Django migrations and apply them",
            "Build Django views with function-based views",
            "Implement Django class-based views",
            "Create Django templates with inheritance",
            "Set up Django admin with customization",
            "Learn Django URL routing patterns",
            "Implement Django forms for user input",
            "Add model relationships (ForeignKey, ManyToMany)",
            "Practice: Complex ORM queries with Q objects",
            "Build: Blog models (Post, Category, Tag)",
            "Implement Django pagination",
            "Add Django static files handling",
            "Create custom Django management commands",
            "Build: Blog views and templates",
            "Implement Django signals for notifications",
            "Add Django middleware basics",
            "Build: Complete blog with comments",
            "Review: Django best practices"
          ]
        },
        {
          theme: "⚡ FastAPI Framework",
          focus: "Modern async Python API development",
          topics: ["FastAPI setup", "Path operations", "Pydantic", "Dependency injection", "Async"],
          project: "Build a CRUD API with FastAPI",
          tasks: [
            "Set up FastAPI project with uvicorn",
            "Create path operations (GET, POST, PUT, DELETE)",
            "Define Pydantic models for validation",
            "Implement path parameters and query params",
            "Use Pydantic for request body validation",
            "Add response models with Pydantic",
            "Implement FastAPI dependency injection",
            "Create reusable dependencies",
            "Add async database operations",
            "Implement FastAPI exception handlers",
            "Use FastAPI background tasks",
            "Add API documentation with OpenAPI",
            "Implement FastAPI middleware",
            "Build: User CRUD endpoints",
            "Add request validation with Pydantic validators",
            "Implement FastAPI routers for organization",
            "Add response status codes properly",
            "Build: Complete CRUD API",
            "Implement API pagination patterns",
            "Add filtering and sorting to endpoints",
            "Build: Production-ready FastAPI structure",
            "Review: FastAPI vs Django comparison"
          ]
        },
        {
          theme: "🗄️ Databases",
          focus: "SQL and database integration",
          topics: ["SQL fundamentals", "PostgreSQL", "SQLAlchemy", "Migrations", "Data modeling"],
          project: "Build a database-backed application",
          tasks: [
            "Learn SQL SELECT with WHERE clauses",
            "Practice SQL JOINs (INNER, LEFT, RIGHT)",
            "Implement SQL INSERT, UPDATE, DELETE",
            "Set up PostgreSQL database locally",
            "Learn PostgreSQL-specific features",
            "Practice: Complex SQL queries with subqueries",
            "Set up SQLAlchemy with FastAPI",
            "Define SQLAlchemy models",
            "Implement SQLAlchemy relationships",
            "Practice: SQLAlchemy queries",
            "Set up Alembic for migrations",
            "Create and apply database migrations",
            "Learn database indexing strategies",
            "Implement database transactions",
            "Practice: Connection pooling setup",
            "Add database seeding scripts",
            "Build: Data models for e-commerce",
            "Implement database backup strategies",
            "Learn query optimization techniques",
            "Practice: EXPLAIN ANALYZE for queries",
            "Build: Complete database layer",
            "Review: Database best practices"
          ]
        },
        {
          theme: "🔑 Authentication & Security",
          focus: "Secure API development",
          topics: ["Password hashing", "JWT tokens", "OAuth2", "CORS/CSRF", "HTTPS"],
          project: "Build secure authentication system",
          tasks: [
            "Learn password hashing with bcrypt",
            "Implement user registration with hashed passwords",
            "Understand JWT token structure",
            "Create JWT access and refresh tokens",
            "Implement JWT authentication middleware",
            "Add protected routes with JWT",
            "Learn OAuth2 flow concepts",
            "Implement OAuth2 with FastAPI",
            "Add social login (Google OAuth)",
            "Learn CSRF protection strategies",
            "Implement CORS properly",
            "Set up HTTPS with SSL certificates",
            "Learn rate limiting implementation",
            "Add API key authentication",
            "Study OWASP Top 10 vulnerabilities",
            "Implement SQL injection prevention",
            "Add XSS protection measures",
            "Practice: Security audit of your API",
            "Implement secure password reset flow",
            "Add two-factor authentication basics",
            "Build: Complete auth system",
            "Review: Security best practices"
          ]
        },
        {
          theme: "🛠️ APIs & Integrations",
          focus: "Building and consuming APIs",
          topics: ["REST APIs", "Third-party APIs", "WebSockets", "Webhooks", "GraphQL basics"],
          project: "Build API with third-party integrations",
          tasks: [
            "Design RESTful API endpoints",
            "Implement CRUD with proper REST conventions",
            "Add API filtering and search",
            "Implement cursor-based pagination",
            "Integrate with Stripe API for payments",
            "Add email sending with SendGrid/SMTP",
            "Integrate SMS with Twilio",
            "Implement webhooks receiver",
            "Create webhook sender for events",
            "Learn WebSocket basics",
            "Implement real-time chat with WebSockets",
            "Add GraphQL endpoint (Strawberry)",
            "Practice: GraphQL queries and mutations",
            "Build: Notification service",
            "Implement file upload endpoints",
            "Add AWS S3 integration for files",
            "Create API versioning strategy",
            "Implement API documentation",
            "Build: Integration hub service",
            "Add retry logic for external APIs",
            "Implement circuit breaker pattern",
            "Review: API design best practices"
          ]
        },
        {
          theme: "📦 Testing & Debugging",
          focus: "Quality assurance and debugging",
          topics: ["pytest", "Unit tests", "Integration tests", "Mocking", "TDD basics"],
          project: "Build comprehensive test suite",
          tasks: [
            "Set up pytest for your project",
            "Write first unit tests with pytest",
            "Learn pytest fixtures",
            "Implement parametrized tests",
            "Practice: Test Django views",
            "Practice: Test FastAPI endpoints",
            "Learn mocking with unittest.mock",
            "Mock external API calls in tests",
            "Implement integration tests",
            "Set up test database fixtures",
            "Learn test coverage with pytest-cov",
            "Achieve 80%+ test coverage",
            "Implement TDD for new feature",
            "Learn debugging with pdb/ipdb",
            "Practice: Debug complex issues",
            "Add logging to your application",
            "Implement structured logging",
            "Set up Sentry for error tracking",
            "Build: Test suite for auth system",
            "Add API contract testing",
            "Implement load testing basics",
            "Review: Testing best practices"
          ]
        },
        {
          theme: "🚀 DevOps & Deployment",
          focus: "Containerization and CI/CD",
          topics: ["Docker", "Docker Compose", "CI/CD", "Nginx", "Environment variables"],
          project: "Deploy application to production",
          tasks: [
            "Learn Docker basics and concepts",
            "Write Dockerfile for Python app",
            "Build and run Docker containers",
            "Create Docker Compose for multi-service",
            "Add PostgreSQL to Docker Compose",
            "Implement Docker volumes for persistence",
            "Learn Docker networking basics",
            "Set up GitHub Actions workflow",
            "Add automated testing in CI",
            "Implement build and push to registry",
            "Learn Nginx as reverse proxy",
            "Configure Gunicorn for production",
            "Configure Uvicorn for FastAPI",
            "Deploy to Railway/Render",
            "Set up environment variables properly",
            "Implement secrets management",
            "Add health check endpoints",
            "Set up monitoring with logs",
            "Learn Kubernetes basics overview",
            "Build: Complete CI/CD pipeline",
            "Implement zero-downtime deployment",
            "Review: DevOps best practices"
          ]
        },
        {
          theme: "📂 Software Engineering",
          focus: "Clean code and architecture",
          topics: ["SOLID principles", "Design patterns", "Project structure", "Logging", "Documentation"],
          project: "Refactor project with best practices",
          tasks: [
            "Learn Single Responsibility Principle",
            "Apply Open/Closed Principle",
            "Implement Liskov Substitution",
            "Practice Interface Segregation",
            "Apply Dependency Inversion",
            "Learn Repository pattern",
            "Implement Service layer pattern",
            "Apply Factory pattern",
            "Learn Singleton pattern uses",
            "Structure project for scalability",
            "Implement clean architecture layers",
            "Add comprehensive logging",
            "Set up ELK stack basics",
            "Write API documentation",
            "Create README with setup guide",
            "Add inline code documentation",
            "Implement feature flags",
            "Learn microservices basics",
            "Build: Refactor to clean architecture",
            "Add performance monitoring",
            "Implement caching strategy",
            "Review: Architecture decisions"
          ]
        },
        {
          theme: "📊 Advanced Backend",
          focus: "Scalability and advanced patterns",
          topics: ["Celery", "Redis", "Message queues", "Caching", "Microservices"],
          project: "Build scalable background job system",
          tasks: [
            "Set up Redis locally",
            "Implement Redis caching in API",
            "Learn Celery task queue basics",
            "Create Celery tasks for async jobs",
            "Implement periodic tasks with Celery Beat",
            "Add task retry and error handling",
            "Learn message broker concepts",
            "Set up RabbitMQ basics",
            "Implement pub/sub patterns",
            "Add email queue with Celery",
            "Learn caching strategies",
            "Implement cache invalidation",
            "Study microservices architecture",
            "Learn API Gateway patterns",
            "Implement service discovery basics",
            "Add distributed tracing concepts",
            "Learn load balancing basics",
            "Build: Background job processor",
            "Implement event-driven patterns",
            "Add async notification system",
            "Build: Scalable task system",
            "Review: Scalability patterns"
          ]
        },
        {
          theme: "🎯 Portfolio & Career",
          focus: "Job readiness and portfolio",
          topics: ["Portfolio projects", "Resume", "Interview prep", "System design", "Networking"],
          project: "Complete portfolio and job prep",
          tasks: [
            "Review all projects for portfolio",
            "Polish GitHub profile and repos",
            "Write compelling README files",
            "Create portfolio website",
            "Prepare backend developer resume",
            "Practice coding interview questions",
            "Study system design basics",
            "Practice: Design URL shortener",
            "Practice: Design rate limiter",
            "Learn common interview patterns",
            "Practice: SQL interview questions",
            "Review Django interview questions",
            "Review FastAPI interview questions",
            "Practice: API design interview",
            "Mock interview: Technical questions",
            "Mock interview: System design",
            "Network on LinkedIn/Twitter",
            "Contribute to open source",
            "Apply to backend developer roles",
            "Prepare for behavioral interviews",
            "Final review: All concepts",
            "Celebrate: You're job ready! 🎉"
          ]
        },
      ],
    },
    "python": {
      themes: [
        { 
          theme: "Python Fundamentals", 
          focus: "Core syntax and basic concepts", 
          topics: ["Variables & Types", "Operators", "Input/Output", "Strings", "Numbers"], 
          project: "Build a calculator",
          tasks: [
            "Learn Python variables and naming conventions",
            "Practice Python data types (int, float, str, bool)",
            "Master Python arithmetic operators",
            "Implement comparison and logical operators",
            "Use input() and print() for user interaction",
            "Practice string methods (split, join, strip)",
            "Format strings with f-strings",
            "Work with Python numbers and math module",
            "Implement type conversion functions",
            "Practice: Build temperature converter",
            "Learn Python comments and documentation",
            "Understand Python indentation rules",
            "Practice: Create BMI calculator",
            "Master string slicing and indexing",
            "Build: Interactive calculator with operations",
            "Implement error messages for invalid input",
            "Add calculation history feature",
            "Practice: Number guessing game",
            "Learn Python REPL for testing",
            "Build: Complete calculator with menu",
            "Review: Python fundamentals quiz",
            "Document your calculator code"
          ]
        },
        { 
          theme: "Control Flow", 
          focus: "Decision making and loops", 
          topics: ["If/Else", "For Loops", "While Loops", "Break/Continue", "Nested Logic"], 
          project: "Number guessing game",
          tasks: [
            "Learn Python if statements",
            "Practice if/elif/else chains",
            "Implement nested conditionals",
            "Master Python for loops with range()",
            "Iterate over lists and strings",
            "Learn Python while loops",
            "Implement loop control with break",
            "Use continue for loop skipping",
            "Practice: FizzBuzz solution",
            "Build nested loops for patterns",
            "Implement password validation logic",
            "Practice: Prime number checker",
            "Build: Number guessing with hints",
            "Add difficulty levels to game",
            "Implement play again feature",
            "Practice: Rock Paper Scissors game",
            "Build: Simple ATM simulator",
            "Add input validation loops",
            "Practice: Multiplication table generator",
            "Build: Menu-driven application",
            "Review: Control flow patterns",
            "Complete: Number guessing game"
          ]
        },
        { 
          theme: "Data Structures", 
          focus: "Working with collections", 
          topics: ["Lists", "Tuples", "Dictionaries", "Sets", "List Comprehensions"], 
          project: "Contact book app",
          tasks: [
            "Learn Python lists and methods",
            "Practice list slicing and indexing",
            "Implement list sorting and reversing",
            "Master Python tuples and immutability",
            "Learn Python dictionaries",
            "Practice dict methods (get, keys, values)",
            "Implement nested dictionaries",
            "Master Python sets and operations",
            "Practice: Remove duplicates with sets",
            "Learn list comprehensions",
            "Build: Data filtering with comprehensions",
            "Implement dictionary comprehensions",
            "Practice: Word frequency counter",
            "Build: Contact storage with dicts",
            "Add search functionality to contacts",
            "Implement contact editing",
            "Add contact deletion",
            "Build: Export contacts to text file",
            "Practice: Student grade tracker",
            "Implement sorting and filtering",
            "Build: Complete contact book app",
            "Review: Data structures quiz"
          ]
        },
        { 
          theme: "Functions & Modules", 
          focus: "Code organization", 
          topics: ["Functions", "Parameters", "Return Values", "Modules", "Packages"], 
          project: "Utility library",
          tasks: [
            "Learn Python function definition",
            "Practice function parameters",
            "Implement default parameter values",
            "Master *args and **kwargs",
            "Learn return statements",
            "Practice: Calculator functions",
            "Implement helper functions",
            "Learn variable scope (local/global)",
            "Create reusable utility functions",
            "Practice: String utility functions",
            "Build: Math utility module",
            "Learn Python import statements",
            "Practice importing from modules",
            "Create custom Python package",
            "Implement __init__.py for packages",
            "Learn Python standard library",
            "Use os and sys modules",
            "Practice: Date utility functions",
            "Build: File utility functions",
            "Implement validation utilities",
            "Build: Complete utility library",
            "Document your library with docstrings"
          ]
        },
        { 
          theme: "Object-Oriented Programming", 
          focus: "OOP principles", 
          topics: ["Classes", "Objects", "Inheritance", "Polymorphism", "Encapsulation"], 
          project: "Bank account system",
          tasks: [
            "Learn Python class definition",
            "Create __init__ constructor method",
            "Implement instance attributes",
            "Add instance methods to class",
            "Practice: Create Person class",
            "Learn class inheritance",
            "Implement parent and child classes",
            "Override methods in child class",
            "Practice: Animal class hierarchy",
            "Learn encapsulation with _ and __",
            "Implement property decorators",
            "Add getter and setter methods",
            "Practice: Rectangle class with properties",
            "Learn polymorphism concepts",
            "Implement method polymorphism",
            "Build: BankAccount class",
            "Add SavingsAccount subclass",
            "Implement transaction history",
            "Add transfer between accounts",
            "Build: Complete banking system",
            "Add account validation logic",
            "Review: OOP concepts quiz"
          ]
        },
        { 
          theme: "File Handling & Exceptions", 
          focus: "Working with files and errors", 
          topics: ["File Read/Write", "CSV", "JSON", "Try/Except", "Custom Exceptions"], 
          project: "File organizer",
          tasks: [
            "Learn file opening modes (r, w, a)",
            "Read files with open() and read()",
            "Write to files with write()",
            "Use context managers (with statement)",
            "Practice: Log file writer",
            "Learn CSV file handling",
            "Use csv module for reading",
            "Write data to CSV files",
            "Learn JSON file handling",
            "Parse JSON with json module",
            "Write JSON data to files",
            "Implement try/except blocks",
            "Handle specific exceptions",
            "Use finally for cleanup",
            "Create custom exception classes",
            "Practice: Robust file reader",
            "Build: File extension organizer",
            "Add directory walking with os",
            "Implement file moving logic",
            "Add logging for operations",
            "Build: Complete file organizer",
            "Review: File handling patterns"
          ]
        },
        { 
          theme: "Advanced Python", 
          focus: "Intermediate concepts", 
          topics: ["Decorators", "Generators", "Context Managers", "Lambda", "Map/Filter"], 
          project: "Text processor",
          tasks: [
            "Learn Python decorators basics",
            "Create simple decorator function",
            "Implement decorator with arguments",
            "Practice: Timing decorator",
            "Learn Python generators",
            "Create generator functions with yield",
            "Use generators for large data",
            "Practice: Fibonacci generator",
            "Learn context manager protocol",
            "Create custom context manager",
            "Practice: Database connection manager",
            "Learn lambda functions",
            "Use map() with lambdas",
            "Use filter() for data filtering",
            "Practice: reduce() for aggregation",
            "Build: Text file reader generator",
            "Implement word frequency counter",
            "Add text cleaning functions",
            "Build: Sentence tokenizer",
            "Implement text statistics",
            "Build: Complete text processor",
            "Review: Advanced Python concepts"
          ]
        },
        { 
          theme: "Web & API Basics", 
          focus: "HTTP and APIs", 
          topics: ["Requests library", "REST APIs", "JSON parsing", "Authentication", "Error handling"], 
          project: "Weather app",
          tasks: [
            "Install and learn requests library",
            "Make GET requests to APIs",
            "Handle API responses",
            "Parse JSON API responses",
            "Practice: Fetch random quote API",
            "Learn API authentication basics",
            "Add headers to requests",
            "Implement API key authentication",
            "Handle HTTP errors properly",
            "Practice: GitHub API explorer",
            "Learn POST requests",
            "Send JSON data to APIs",
            "Implement retry logic",
            "Practice: Create API wrapper class",
            "Build: Weather API integration",
            "Add location-based weather",
            "Implement forecast display",
            "Add error handling for API",
            "Build: Weather caching",
            "Create weather CLI interface",
            "Build: Complete weather app",
            "Review: API integration patterns"
          ]
        },
        { 
          theme: "Database Integration", 
          focus: "Working with databases", 
          topics: ["SQLite", "SQL queries", "Python DB-API", "CRUD operations", "Data modeling"], 
          project: "Todo database app",
          tasks: [
            "Learn SQL basics overview",
            "Set up SQLite with Python",
            "Create database and tables",
            "Learn SQL CREATE TABLE syntax",
            "Implement INSERT queries",
            "Practice SELECT with WHERE",
            "Learn UPDATE and DELETE",
            "Use Python sqlite3 module",
            "Implement database connection",
            "Create cursor and execute queries",
            "Practice: User database CRUD",
            "Learn parameterized queries",
            "Prevent SQL injection",
            "Build: Todo table schema",
            "Implement add todo function",
            "Add list todos function",
            "Implement update todo status",
            "Add delete todo function",
            "Build: Todo CLI interface",
            "Add due dates and priorities",
            "Build: Complete todo app",
            "Review: Database patterns"
          ]
        },
        { 
          theme: "Project Development", 
          focus: "Building real applications", 
          topics: ["Project structure", "Virtual environments", "Requirements", "Documentation", "Git"], 
          project: "CLI application",
          tasks: [
            "Learn Python project structure",
            "Create virtual environment",
            "Manage dependencies with pip",
            "Create requirements.txt",
            "Practice: Set up project scaffold",
            "Learn Git for Python projects",
            "Create meaningful .gitignore",
            "Practice Git commit workflow",
            "Add README documentation",
            "Learn argparse for CLI",
            "Implement CLI arguments",
            "Add subcommands to CLI",
            "Practice: Note-taking CLI",
            "Implement configuration files",
            "Add logging to application",
            "Create setup.py or pyproject.toml",
            "Build: Installable CLI package",
            "Add command autocompletion",
            "Implement progress bars",
            "Add colorful CLI output",
            "Build: Complete CLI application",
            "Review: Project best practices"
          ]
        },
        { 
          theme: "Testing & Quality", 
          focus: "Code quality practices", 
          topics: ["Unit testing", "pytest", "Mocking", "Coverage", "Type hints"], 
          project: "Test suite",
          tasks: [
            "Learn unit testing concepts",
            "Set up pytest in project",
            "Write first pytest test",
            "Learn pytest assertions",
            "Practice: Test calculator functions",
            "Learn pytest fixtures",
            "Create reusable test fixtures",
            "Practice: Test file operations",
            "Learn mocking with unittest.mock",
            "Mock external dependencies",
            "Practice: Mock API calls in tests",
            "Learn test coverage",
            "Set up pytest-cov",
            "Achieve 80%+ coverage",
            "Learn Python type hints",
            "Add type annotations to functions",
            "Use typing module types",
            "Practice: Type hint existing code",
            "Learn mypy for type checking",
            "Build: Test suite for todo app",
            "Add pre-commit hooks",
            "Review: Testing best practices"
          ]
        },
        { 
          theme: "Portfolio & Review", 
          focus: "Consolidation and showcase", 
          topics: ["Code review", "Refactoring", "Portfolio", "Best practices", "Job prep"], 
          project: "Portfolio project",
          tasks: [
            "Review all completed projects",
            "Refactor code for readability",
            "Apply PEP 8 style guide",
            "Add comprehensive docstrings",
            "Polish GitHub repositories",
            "Create portfolio README",
            "Build portfolio website",
            "Write project case studies",
            "Practice Python interview questions",
            "Review data structures problems",
            "Practice algorithm problems",
            "Mock coding interview",
            "Update resume with Python skills",
            "Network with Python community",
            "Contribute to open source",
            "Review: Python fundamentals",
            "Review: OOP concepts",
            "Review: File and database handling",
            "Review: API integration",
            "Final project: Combine all skills",
            "Prepare for job applications",
            "Celebrate: Python mastery! 🎉"
          ]
        },
      ],
    },
    "javascript": {
      themes: [
        { 
          theme: "JavaScript Fundamentals", 
          focus: "Core syntax and basics", 
          topics: ["Variables", "Data Types", "Operators", "Console", "Comments"], 
          project: "Interactive webpage",
          tasks: [
            "Learn JavaScript variables (let, const, var)",
            "Practice JavaScript data types",
            "Master JavaScript operators",
            "Use console.log() for debugging",
            "Write meaningful JavaScript comments",
            "Practice: Temperature converter",
            "Learn JavaScript string methods",
            "Implement template literals",
            "Work with JavaScript numbers",
            "Practice: Simple calculator logic",
            "Learn JavaScript type coercion",
            "Use typeof operator",
            "Practice: User input validation",
            "Build: Interactive greeting page",
            "Add user name personalization",
            "Implement basic form handling",
            "Practice: Mad Libs generator",
            "Add dynamic content updates",
            "Build: Unit converter webpage",
            "Implement multiple conversions",
            "Build: Complete interactive page",
            "Review: JavaScript fundamentals"
          ]
        },
        { 
          theme: "Control Flow & Functions", 
          focus: "Logic and functions", 
          topics: ["If/Else", "Loops", "Functions", "Arrow functions", "Scope"], 
          project: "Quiz game",
          tasks: [
            "Learn JavaScript if/else statements",
            "Implement switch statements",
            "Master JavaScript for loops",
            "Use while and do-while loops",
            "Practice: FizzBuzz in JavaScript",
            "Learn JavaScript functions",
            "Implement arrow functions",
            "Understand function scope",
            "Learn closures basics",
            "Practice: Calculator functions",
            "Implement callback functions",
            "Build: Number guessing game",
            "Add score tracking",
            "Implement timer countdown",
            "Practice: Rock Paper Scissors",
            "Build: Quiz question display",
            "Add answer validation",
            "Implement score calculation",
            "Add high score storage",
            "Build: Multiple choice quiz",
            "Add quiz progression",
            "Build: Complete quiz game"
          ]
        },
        { 
          theme: "Arrays & Objects", 
          focus: "JavaScript data structures", 
          topics: ["Arrays", "Array methods", "Objects", "Destructuring", "Spread operator"], 
          project: "Shopping cart",
          tasks: [
            "Learn JavaScript arrays",
            "Master array methods (push, pop, shift)",
            "Use forEach, map, filter",
            "Implement array reduce",
            "Practice: Array manipulation exercises",
            "Learn JavaScript objects",
            "Access object properties",
            "Implement object methods",
            "Practice: Object manipulation",
            "Learn destructuring assignment",
            "Use spread operator",
            "Practice: Rest parameters",
            "Build: Product catalog object",
            "Implement cart array logic",
            "Add item to cart function",
            "Remove item from cart",
            "Calculate cart total",
            "Implement quantity updates",
            "Add cart item filtering",
            "Build: Cart summary display",
            "Implement checkout logic",
            "Build: Complete shopping cart"
          ]
        },
        { 
          theme: "DOM Manipulation", 
          focus: "Interactive web pages", 
          topics: ["Selectors", "Events", "Event handling", "Dynamic content", "Forms"], 
          project: "Interactive form",
          tasks: [
            "Learn document.querySelector()",
            "Use querySelectorAll() for multiple",
            "Modify element content with textContent",
            "Change styles with style property",
            "Add/remove CSS classes",
            "Learn event listeners",
            "Handle click events",
            "Implement form submit handling",
            "Practice: Button click counter",
            "Build: Theme toggle button",
            "Create elements with createElement",
            "Append elements to DOM",
            "Remove elements from DOM",
            "Practice: Dynamic list builder",
            "Build: Form validation logic",
            "Add real-time validation feedback",
            "Implement error messages",
            "Style validation states",
            "Add input event listeners",
            "Build: Multi-step form",
            "Implement form progress",
            "Build: Complete interactive form"
          ]
        },
        { 
          theme: "Async JavaScript", 
          focus: "Asynchronous programming", 
          topics: ["Promises", "Async/Await", "Fetch API", "Error handling", "API integration"], 
          project: "Weather dashboard",
          tasks: [
            "Understand JavaScript event loop",
            "Learn setTimeout and setInterval",
            "Master JavaScript Promises",
            "Use .then() and .catch()",
            "Practice: Promise chaining",
            "Learn async/await syntax",
            "Convert promises to async/await",
            "Implement error handling with try/catch",
            "Learn Fetch API basics",
            "Make GET requests with fetch",
            "Handle fetch errors properly",
            "Parse JSON responses",
            "Practice: Random quote fetcher",
            "Build: Weather API integration",
            "Display current weather",
            "Add location search",
            "Implement weather icons",
            "Add forecast display",
            "Handle loading states",
            "Implement error states",
            "Build: Weather dashboard",
            "Review: Async patterns"
          ]
        },
        { 
          theme: "Modern JavaScript", 
          focus: "ES6+ features", 
          topics: ["Classes", "Modules", "Template literals", "Map/Set", "Symbols"], 
          project: "Module-based app",
          tasks: [
            "Learn JavaScript ES6 classes",
            "Implement class constructors",
            "Add class methods",
            "Practice: Class inheritance",
            "Learn static methods",
            "Use getters and setters",
            "Practice: Bank account class",
            "Learn JavaScript modules",
            "Use export and import",
            "Implement default exports",
            "Learn Map data structure",
            "Use Set for unique values",
            "Practice: Map/Set exercises",
            "Understand JavaScript Symbols",
            "Learn iterator protocol",
            "Practice: Custom iterable",
            "Build: Modular project structure",
            "Create utility modules",
            "Implement data modules",
            "Add UI modules",
            "Build: Complete modular app",
            "Review: ES6+ features"
          ]
        },
        { 
          theme: "React Fundamentals", 
          focus: "React basics", 
          topics: ["Components", "JSX", "Props", "State", "Events"], 
          project: "React todo app",
          tasks: [
            "Set up React with Vite",
            "Understand React component structure",
            "Learn JSX syntax",
            "Create functional components",
            "Pass data with props",
            "Practice: Component composition",
            "Learn useState hook",
            "Implement state updates",
            "Handle events in React",
            "Practice: Counter component",
            "Build: Todo input component",
            "Create todo list component",
            "Implement add todo",
            "Add toggle complete",
            "Implement delete todo",
            "Add todo filtering",
            "Style React components",
            "Add CSS modules",
            "Implement conditional rendering",
            "Build: Todo statistics",
            "Build: Complete React todo",
            "Review: React fundamentals"
          ]
        },
        { 
          theme: "React Advanced", 
          focus: "Advanced React patterns", 
          topics: ["Hooks", "Context", "useEffect", "Custom hooks", "Performance"], 
          project: "Dashboard app",
          tasks: [
            "Master useEffect hook",
            "Handle side effects properly",
            "Clean up with useEffect return",
            "Learn useContext hook",
            "Create Context providers",
            "Consume context in components",
            "Learn useReducer for complex state",
            "Implement reducer pattern",
            "Practice: Shopping cart context",
            "Create custom hooks",
            "Extract reusable hook logic",
            "Practice: useFetch custom hook",
            "Learn React.memo optimization",
            "Use useCallback for functions",
            "Implement useMemo for values",
            "Build: Dashboard layout",
            "Add data fetching",
            "Implement loading states",
            "Add error boundaries",
            "Build: Interactive charts",
            "Build: Complete dashboard",
            "Review: Advanced React patterns"
          ]
        },
        { 
          theme: "Node.js & APIs", 
          focus: "Backend JavaScript", 
          topics: ["Node.js", "Express", "REST APIs", "Middleware", "Database"], 
          project: "API server",
          tasks: [
            "Set up Node.js project",
            "Learn Node.js modules",
            "Use npm for packages",
            "Install and set up Express",
            "Create Express application",
            "Implement GET routes",
            "Add POST routes",
            "Implement PUT and DELETE",
            "Learn Express middleware",
            "Add body-parser middleware",
            "Implement CORS middleware",
            "Practice: Request logging middleware",
            "Connect to MongoDB",
            "Define Mongoose schemas",
            "Implement CRUD operations",
            "Add input validation",
            "Implement error handling",
            "Build: User API endpoints",
            "Add authentication middleware",
            "Implement JWT tokens",
            "Build: Complete REST API",
            "Review: Backend patterns"
          ]
        },
        { 
          theme: "Full Stack Integration", 
          focus: "Connecting frontend and backend", 
          topics: ["API calls", "Authentication", "State management", "Deployment", "Error handling"], 
          project: "Full stack app",
          tasks: [
            "Connect React to Express API",
            "Handle CORS properly",
            "Implement API service layer",
            "Add loading and error states",
            "Practice: User registration flow",
            "Implement login functionality",
            "Store JWT tokens properly",
            "Add protected routes in React",
            "Implement token refresh",
            "Learn Redux basics",
            "Set up Redux store",
            "Implement Redux actions",
            "Practice: Global state management",
            "Build: Auth state with Redux",
            "Add API error handling",
            "Implement optimistic updates",
            "Build: Full stack todo app",
            "Deploy backend to Railway",
            "Deploy frontend to Vercel",
            "Configure environment variables",
            "Build: Production deployment",
            "Review: Full stack patterns"
          ]
        },
        { 
          theme: "Testing & Tools", 
          focus: "Development practices", 
          topics: ["Jest", "React Testing Library", "Debugging", "Linting", "Build tools"], 
          project: "Test suite",
          tasks: [
            "Set up Jest in project",
            "Write first Jest tests",
            "Learn Jest matchers",
            "Practice: Test utility functions",
            "Set up React Testing Library",
            "Test React components",
            "Learn screen queries",
            "Implement user event testing",
            "Practice: Test form components",
            "Mock API calls in tests",
            "Learn snapshot testing",
            "Set up ESLint for React",
            "Configure Prettier",
            "Add husky pre-commit hooks",
            "Learn Chrome DevTools",
            "Debug React with DevTools",
            "Understand Vite build process",
            "Optimize bundle size",
            "Build: Test suite for todo app",
            "Achieve good test coverage",
            "Add CI with GitHub Actions",
            "Review: Testing best practices"
          ]
        },
        { 
          theme: "Portfolio & Deployment", 
          focus: "Launch and showcase", 
          topics: ["Portfolio", "Deployment", "CI/CD", "Best practices", "Interview prep"], 
          project: "Final portfolio",
          tasks: [
            "Review all completed projects",
            "Refactor code for quality",
            "Add TypeScript to projects",
            "Update GitHub repositories",
            "Write compelling READMEs",
            "Build portfolio website",
            "Deploy portfolio to Vercel",
            "Add project case studies",
            "Practice JavaScript interviews",
            "Review data structure problems",
            "Practice React interview questions",
            "Review Node.js concepts",
            "Practice system design basics",
            "Mock technical interview",
            "Update resume with skills",
            "Network on LinkedIn",
            "Contribute to open source",
            "Review: JavaScript fundamentals",
            "Review: React patterns",
            "Final project presentation",
            "Apply to developer roles",
            "Celebrate: JavaScript mastery! 🎉"
          ]
        },
      ],
    },
  };

  // Helper: Get task type by index
  const getTaskTypeByIndex = (index: number): string => {
    if (index < 8) return "learn";
    if (index < 16) return "practice";
    return "build";
  };

  // Find matching curriculum - check for backend-related keywords
  let curriculum = curriculums["python"]; // Default
  let matchFound = false;
  
  // Check for backend-specific keywords first
  const backendKeywords = ["backend", "django", "fastapi", "flask", "api", "server", "rest", "database", "sql"];
  if (backendKeywords.some(k => goalLC.includes(k) || categoryLC.includes(k))) {
    curriculum = curriculums["backend"];
  }
  
  // Then check other curriculums
  if (!matchFound) {
    for (const [key, value] of Object.entries(curriculums)) {
      if (categoryLC.includes(key) || goalLC.includes(key)) {
        curriculum = value;
        break;
      }
    }
  }

  // Generate task patterns from the specific task lists
  const taskPatterns = curriculum.themes.map((theme, monthIndex) => {
    const month = monthIndex + 1;
    const tasks = theme.tasks.map((taskTitle, index) => ({
      title: taskTitle,
      description: `Part of ${theme.theme}: ${theme.focus}. Topic: ${theme.topics[index % theme.topics.length]}`,
      type: getTaskTypeByIndex(index),
      topic: theme.topics[index % theme.topics.length],
    }));
    return { month, tasks };
  });

  const monthlyThemes = curriculum.themes.map((theme, i) => ({
    month: i + 1,
    theme: theme.theme,
    focus: theme.focus,
    topics: theme.topics,
    project: theme.project,
  }));

  return { monthlyThemes, taskPatterns };
}

// Helper: Get level adaptation text for curriculum prompts
const getLevelAdaptationText = (level: string): string => {
  if (level === "beginner") {
    return `   - Add extra foundational tasks
   - Include setup and environment configuration
   - More guided exercises with examples`;
  }
  if (level === "intermediate") {
    return `   - Faster pace through basics
   - Include intermediate challenges
   - Real-world integration tasks`;
  }
  return `   - Accelerate through fundamentals
   - Focus on advanced patterns
   - Include architecture and optimization`;
};

// Helper: Get level description for standard prompts
const getLevelDescriptionText = (level: string): string => {
  if (level === "beginner") {
    return `- Start from absolute basics, assume no prior knowledge
- Extra scaffolding and step-by-step guidance
- Simpler projects with clear templates
- More time on fundamentals`;
  }
  if (level === "intermediate") {
    return `- Quick review of basics, then accelerate
- Assume familiarity with basic programming
- More challenging projects earlier
- Include some advanced topics in later months`;
  }
  return `- Fast-track through fundamentals
- Focus on advanced patterns and optimization
- Complex, portfolio-worthy projects
- Include system design and architecture`;
};

// Helper: Build custom curriculum prompt
const buildCustomCurriculumPrompt = (
  curriculum: string,
  level: string,
  dailyMins: number,
  totalDays: number,
  scheduleLabel: string
) => `You are an expert technical curriculum architect. Transform the user's custom curriculum into a structured learning plan.

=== USER'S CUSTOM CURRICULUM ===
${curriculum}

=== LEARNER CONTEXT ===
Experience Level: ${level}
Daily Time Available: ${dailyMins} minutes
Total Learning Days: ${totalDays} (${scheduleLabel})

=== TRANSFORMATION RULES ===

1. PARSE THE CURRICULUM INTELLIGENTLY:
   - Identify major sections/categories in the curriculum
   - Respect the ORDER of topics (first items = foundational, later = advanced)
   - Group related items into monthly themes
   - Don't skip any topics from the curriculum

2. DISTRIBUTE ACROSS THE TIMELINE:
   - Months 1-3: Foundational topics from the curriculum
   - Months 4-6: Intermediate topics
   - Months 7-9: Advanced topics
   - Months 10-11: Projects combining learned skills
   - Month 12: Review, portfolio, and mastery

3. FOR EACH MONTH:
   - Extract 5 cohesive topics from the curriculum section
   - Create 22-25 unique daily tasks
   - Include a meaningful project at month's end
   - Tasks should follow: Learn → Practice → Apply pattern

4. TASK CREATION GUIDELINES:
   - "learn" tasks: Study concepts, read docs, watch tutorials
   - "practice" tasks: Coding exercises, drills, implementation
   - "build" tasks: Create projects, combine skills
   - "review" tasks: Consolidation, quizzes, optimization

5. LEVEL ADAPTATION for ${level.toUpperCase()}:
${getLevelAdaptationText(level)}

=== OUTPUT FORMAT ===

Return ONLY valid JSON with this structure:
{
  "title": "Compelling title based on curriculum (max 8 words)",
  "description": "One sentence describing the learning journey",
  "monthlyThemes": [
    {
      "month": 1,
      "theme": "Theme extracted from curriculum section",
      "focus": "What learner achieves this month",
      "topics": ["Topic1", "Topic2", "Topic3", "Topic4", "Topic5"],
      "project": "End of month project"
    }
  ],
  "taskPatterns": [
    {
      "month": 1,
      "tasks": [
        {"title": "Specific actionable task", "description": "Detailed instructions", "type": "learn", "topic": "Topic1"},
        {"title": "Practice: Topic1 exercises", "description": "Hands-on practice", "type": "practice", "topic": "Topic1"},
        {"title": "Apply: Build with Topic1", "description": "Mini-project", "type": "build", "topic": "Topic1"}
      ]
    }
  ]
}

=== CRITICAL REQUIREMENTS ===
1. Include EVERY topic from the user's curriculum - don't skip anything
2. Maintain the logical ORDER from the curriculum
3. Each month has exactly 5 topics and 22-25 tasks
4. Every task must be unique and specific
5. Tasks follow consecutive learn → practice → apply pattern
6. Generate ALL months completely based on the timeline

Transform this curriculum into a comprehensive, actionable learning plan.`;

// Helper: Build standard goal prompt with comprehensive curriculum design
const buildStandardGoalPrompt = (
  categoryName: string,
  goalText: string,
  level: string,
  dailyMins: number,
  totalDays: number,
  scheduleLabel: string,
  preferencesLine: string
) => {
  // Calculate number of months based on total days
  const estimatedMonths = Math.ceil(totalDays / 30);
  const numMonths = Math.min(Math.max(estimatedMonths, 1), 12); // Between 1 and 12 months
  
  return `You are an expert curriculum designer. Create a ${numMonths}-month learning plan.

GOAL: "${goalText}"
CATEGORY: ${categoryName}
LEVEL: ${level}
DAILY TIME: ${dailyMins} minutes
DURATION: ${totalDays} days (${scheduleLabel})
${preferencesLine ? `PREFERENCES: ${preferencesLine}` : ""}

Create a curriculum with monthly themes and 5-6 SAMPLE tasks per month (we'll expand these to fill all days).

RULES:
- Keep descriptions SHORT (under 15 words)
- Task titles must be specific and actionable
- Use real tools/frameworks for "${goalText}"

Return ONLY valid JSON:
{
  "title": "Short title (5 words max)",
  "description": "One short sentence",
  "monthlyThemes": [
    {"month": 1, "theme": "Theme", "focus": "Focus", "topics": ["T1", "T2", "T3", "T4", "T5"], "project": "Project"}
  ],
  "taskPatterns": [
    {"month": 1, "tasks": [
      {"title": "Task title", "description": "Short desc", "type": "learn", "topic": "T1"}
    ]}
  ]
}

CRITICAL:
1. Generate ALL ${numMonths} months completely
2. Each month: 5 topics + 5-6 tasks only
3. Task types: learn, practice, build, review
4. Keep ALL text concise to avoid truncation

${getLevelDescriptionText(level)}`;
};

// Helper: Parse AI response and clean JSON
const parseAIResponse = (bedrockResponse: { content: string }) => {
  let text = bedrockResponse.content.trim();
  
  if (text.startsWith("```json")) text = text.slice(7);
  else if (text.startsWith("```")) text = text.slice(3);
  if (text.endsWith("```")) text = text.slice(0, -3);
  
  return text.trim();
};

// Helper: Count unescaped quotes in a string
const countUnescapedQuotes = (text: string): number => {
  let count = 0;
  let escaped = false;
  
  for (const char of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      count++;
    }
  }
  return count;
};

// Helper: Find safe truncation point when in middle of string value
const findSafeTruncationPoint = (text: string): string => {
  const afterQuoteChars = new Set([':', ',', '}', ']', ' ', '\n', '\t']);
  const lastQuoteIdx = text.lastIndexOf('"');
  const afterQuote = text.slice(lastQuoteIdx + 1);
  
  // If after quote has : but no closing quote, we're in middle of a value
  const hasColon = afterQuote.includes(':');
  const hasQuote = afterQuote.includes('"');
  
  if (hasColon && !hasQuote) {
    // Find last complete property
    const lastCompleteComma = text.lastIndexOf('",');
    const lastCompleteBrace = text.lastIndexOf('"}');
    const lastCompleteBracket = text.lastIndexOf('"]');
    const numberEndPattern = /\d\s*[,}\]]\s*$/;
    const lastCompleteNumber = text.search(numberEndPattern);
    
    const cutPoint = Math.max(
      lastCompleteComma + 2, 
      lastCompleteBrace + 2, 
      lastCompleteBracket + 2, 
      lastCompleteNumber + 1
    );
    
    if (cutPoint > 10) {
      return text.slice(0, cutPoint);
    }
  }
  
  // Just close the string
  return text + '"';
};

// Helper: Count open brackets and braces
const countOpenBracketsAndBraces = (text: string): { openBraces: number; openBrackets: number } => {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;
  
  for (const char of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }
  
  return { openBraces, openBrackets };
};

// Helper: Close unclosed brackets and braces
const closeUnclosedBrackets = (text: string, openBrackets: number, openBraces: number): string => {
  let result = text;
  for (let i = 0; i < openBrackets; i++) {
    result += ']';
  }
  for (let i = 0; i < openBraces; i++) {
    result += '}';
  }
  return result;
};

// Helper: Try to repair truncated JSON - handles mid-property truncation
const repairTruncatedJSON = (text: string): string => {
  let safeText = text;
  
  // Step 1: Remove incomplete escape sequence at end
  safeText = safeText.replace(/\\+$/, '');
  
  // Step 2: Check if we're in the middle of a string (odd number of quotes)
  const quoteCount = countUnescapedQuotes(safeText);
  if (quoteCount % 2 !== 0) {
    safeText = findSafeTruncationPoint(safeText);
  }
  
  // Step 3: Clean up incomplete patterns
  safeText = safeText.replace(/,\s*"[^"]*"\s*$/, ''); // Trailing incomplete property
  safeText = safeText.replace(/{\s*"[^"]*"\s*$/, '{'); // Object with key but no value
  safeText = safeText.replace(/:\s*$/, ': ""'); // Colon without value
  safeText = safeText.replace(/:\s*\[\s*$/, ': []'); // Incomplete array
  safeText = safeText.replace(/:\s*{\s*$/, ': {}'); // Incomplete object
  
  // Step 4: Count and close brackets
  const { openBraces, openBrackets } = countOpenBracketsAndBraces(safeText);
  safeText = safeText.replace(/,\s*$/, ''); // Remove trailing comma
  safeText = closeUnclosedBrackets(safeText, openBrackets, openBraces);
  
  // Step 5: Final cleanup - remove trailing commas before closing brackets
  safeText = safeText.replaceAll(/,(\s*[\]}])/g, '$1');
  
  return safeText;
};

// Helper: Extract partial data from malformed JSON
const extractPartialPlan = (text: string): { monthlyThemes: MonthlyTheme[]; taskPatterns: { month: number; tasks: TaskPattern[] }[] } | null => {
  try {
    // Try to extract monthlyThemes array
    const themesPattern = /"monthlyThemes"\s*:\s*\[([\s\S]*?)\](?=\s*,\s*"taskPatterns")/;
    const patternsPattern = /"taskPatterns"\s*:\s*\[([\s\S]*)/;
    const themesMatch = themesPattern.exec(text);
    const patternsMatch = patternsPattern.exec(text);
    
    if (!themesMatch) return null;
    
    // Parse themes
    let themesJson = '[' + themesMatch[1] + ']';
    themesJson = repairTruncatedJSON(themesJson);
    const monthlyThemes = JSON.parse(themesJson);
    
    // Try to parse patterns (may be incomplete)
    let taskPatterns: { month: number; tasks: TaskPattern[] }[] = [];
    if (patternsMatch) {
      let patternsJson = '[' + patternsMatch[1];
      patternsJson = repairTruncatedJSON(patternsJson);
      try {
        taskPatterns = JSON.parse(patternsJson);
      } catch {
        // If patterns fail, we'll generate them from themes
        taskPatterns = [];
      }
    }
    
    return { monthlyThemes, taskPatterns };
  } catch {
    return null;
  }
};

// Task pattern type with optional AI-generated resources
interface TaskPattern {
  title: string;
  description: string;
  type: string;
  topic: string;
  resources?: { name: string; url: string; type: string }[];
}

// Helper: Create unique task from pattern with better variety
const createTaskFromPattern = (
  patternTasks: TaskPattern[],
  index: number,
  month: number,
  monthTheme: MonthlyTheme | undefined
): TaskPattern => {
  // If we have a task for this index, use it directly
  if (index < patternTasks.length) {
    return patternTasks[index];
  }
  
  // Generate additional unique task based on pattern rotation
  const baseTaskType = getTaskTypeByMonth(month);
  const topics = monthTheme?.topics || ["Core Concepts", "Fundamentals", "Practice", "Application", "Review"];
  const topicIndex = index % topics.length;
  const topic = topics[topicIndex];
  const dayInMonth = index + 1;
  
  // Create diverse action verbs and task structures
  const actions = [
    { verb: "Master", suffix: "through hands-on practice", type: "practice" },
    { verb: "Implement", suffix: "from scratch", type: "build" },
    { verb: "Debug and optimize", suffix: "code", type: "practice" },
    { verb: "Create a project using", suffix: "", type: "build" },
    { verb: "Review and document", suffix: "learnings", type: "review" },
    { verb: "Explore advanced", suffix: "techniques", type: "learn" },
    { verb: "Build a mini-app with", suffix: "", type: "build" },
    { verb: "Practice", suffix: "with real examples", type: "practice" },
    { verb: "Solve challenges using", suffix: "", type: "practice" },
    { verb: "Write tests for", suffix: "code", type: "build" },
  ];
  
  const actionIndex = (index + month) % actions.length;
  const action = actions[actionIndex];
  
  // Create unique title combining action, topic, and context
  const themeText = monthTheme?.theme || `Month ${month} Focus`;
  const title = action.suffix 
    ? `${action.verb} ${topic} ${action.suffix}` 
    : `${action.verb} ${topic}`;
  const description = `Day ${dayInMonth}: Focus on ${topic} as part of ${themeText}. Complete this task to build practical skills.`;
  
  return {
    title,
    description,
    type: baseTaskType,
    topic,
  };
};

// Type for AI parsed plan
interface AIPlan {
  title: string;
  description: string;
  monthlyThemes: MonthlyTheme[];
  taskPatterns: { month: number; tasks: { title: string; description: string; type: string; topic: string }[] }[];
}

// Helper: Get task type from index for fallback task generation
const getTaskTypeFromIndex = (i: number): "learn" | "practice" | "build" => {
  if (i % 3 === 0) return "learn";
  if (i % 3 === 1) return "practice";
  return "build";
};

// Helper: Build fallback AI plan from partial data
const buildFallbackPlan = (
  partialData: { monthlyThemes: MonthlyTheme[]; taskPatterns: { month: number; tasks: TaskPattern[] }[] },
  categoryName: string
): AIPlan => {
  const firstTheme = partialData.monthlyThemes[0]?.theme || "Learning Journey";
  
  const taskPatterns = partialData.taskPatterns.length > 0 
    ? partialData.taskPatterns 
    : partialData.monthlyThemes.map(theme => ({
        month: theme.month,
        tasks: theme.topics.slice(0, 5).map((topic, i) => ({
          title: `Learn ${topic}`,
          description: `Study and practice ${topic} as part of ${theme.theme}`,
          type: getTaskTypeFromIndex(i),
          topic: topic
        }))
      }));

  return {
    title: `Master ${categoryName || "Your Goal"}`,
    description: `A structured learning path starting with ${firstTheme}`,
    monthlyThemes: partialData.monthlyThemes,
    taskPatterns
  };
};

// Helper: Parse and validate AI response with fallbacks
const parseAIPlan = (
  text: string, 
  categoryName: string
): { success: true; plan: AIPlan } | { success: false; error: string } => {
  // Try direct parse first
  try {
    const aiPlan = JSON.parse(text) as AIPlan;
    if (aiPlan.monthlyThemes && aiPlan.taskPatterns && aiPlan.taskPatterns.length > 0) {
      console.log(`AI generated plan with ${aiPlan.taskPatterns.length} month patterns`);
      return { success: true, plan: aiPlan };
    }
    console.error("Invalid AI response structure");
  } catch {
    console.log("First parse failed, attempting to repair truncated JSON...");
  }

  // Try to repair truncated JSON
  try {
    const repairedText = repairTruncatedJSON(text);
    const aiPlan = JSON.parse(repairedText) as AIPlan;
    if (aiPlan.monthlyThemes && aiPlan.taskPatterns) {
      console.log(`Repaired JSON successfully! Got ${aiPlan.taskPatterns?.length || 0} month patterns`);
      return { success: true, plan: aiPlan };
    }
  } catch {
    console.error("Repair also failed");
  }

  // Try to extract partial data as last resort
  console.log("Attempting partial data extraction...");
  const partialData = extractPartialPlan(text);
  
  if (partialData && partialData.monthlyThemes.length > 0) {
    console.log(`Extracted ${partialData.monthlyThemes.length} themes and ${partialData.taskPatterns.length} task patterns`);
    const fallbackPlan = buildFallbackPlan(partialData, categoryName);
    console.log("Successfully recovered plan from partial data!");
    return { success: true, plan: fallbackPlan };
  }

  return { success: false, error: "AI failed to generate a valid plan. Please try again." };
};

// Helper: Calculate base points from daily minutes
const calculateBasePoints = (dailyMins: number): number => {
  if (dailyMins >= 120) return 30;
  if (dailyMins >= 60) return 20;
  return 15;
};

// Helper: Get LeetCode difficulty for a month
const getLeetCodeDifficulty = (month: number): { difficulty: string; minutes: number; points: number } => {
  if (month > 8) {
    return { difficulty: "hard", minutes: 45, points: 30 };
  }
  if (month > 3) {
    return { difficulty: "medium", minutes: 30, points: 20 };
  }
  return { difficulty: "easy", minutes: 20, points: 10 };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalInput, includeLeetCode, leetCodeLanguage } = body as { 
      goalInput: GoalInput; 
      includeLeetCode?: boolean;
      leetCodeLanguage?: string;
    };

    if (!goalInput?.category) {
      return NextResponse.json({ success: false, error: "Missing goal input" }, { status: 400 });
    }

    const scheduleType = goalInput.scheduleType || "weekdays";
    // Use custom startDate and totalDays if provided, otherwise use defaults
    const customStartDate = goalInput.startDate;
    const customTotalDays = goalInput.totalDays;
    const dates = generateDates(scheduleType, customStartDate, customTotalDays);
    const totalDays = dates.length;
    const dailyMins = getMinutesFromCommitment(goalInput.timeCommitment);
    
    // Build context from user selections
    const contextParts: string[] = [];
    const answers = goalInput.selectedOptions || goalInput.followUpAnswers || {};
    Object.entries(answers).forEach(([key, value]) => {
      contextParts.push(`${key}: ${Array.isArray(value) ? value.join(", ") : value}`);
    });

    const hasCustomCurriculum = goalInput.customCurriculum && goalInput.customCurriculum.length > 50;

    const preferencesLine = contextParts.length > 0 ? `- Preferences: ${contextParts.join(", ")}` : "";
    const scheduleLabel = getScheduleTypeLabel(scheduleType);

    // Generate prompt based on curriculum type
    const prompt = hasCustomCurriculum 
      ? buildCustomCurriculumPrompt(
          goalInput.customCurriculum || "",
          goalInput.experienceLevel,
          dailyMins,
          totalDays,
          scheduleLabel
        )
      : buildStandardGoalPrompt(
          goalInput.categoryName || goalInput.category,
          (goalInput.primaryGoal || goalInput.customGoal) || "",
          goalInput.experienceLevel,
          dailyMins,
          totalDays,
          scheduleLabel,
          preferencesLine
        );

    // Call Bedrock
    const bedrockResponse = await generateWithBedrock(prompt);
    const text = parseAIResponse(bedrockResponse);

    // Parse and validate the AI response
    const categoryName = goalInput.categoryName || goalInput.category || "Programming";
    const parseResult = parseAIPlan(text, categoryName);
    
    if (!parseResult.success) {
      console.error("Raw AI response (first 500 chars):", text.substring(0, 500));
      return NextResponse.json({ 
        success: false, 
        error: parseResult.error,
        details: "The AI response could not be parsed correctly."
      }, { status: 500 });
    }
    
    const aiPlan = parseResult.plan;

    // Now expand task patterns to ALL dates
    const planId = uuidv4();
    const dailyTasks: DailyTask[] = [];
    
    // Group dates by month
    const datesByMonth: Map<number, typeof dates> = new Map();
    dates.forEach(d => {
      const existing = datesByMonth.get(d.month) || [];
      existing.push(d);
      datesByMonth.set(d.month, existing);
    });

    // For each month, assign tasks to dates
    let globalDayCounter = 0;
    const basePoints = calculateBasePoints(dailyMins);
    
    for (let month = 1; month <= 12; month++) {
      const monthDates = datesByMonth.get(month) || [];
      const monthPattern = aiPlan.taskPatterns?.find(p => p.month === month);
      const monthTheme = aiPlan.monthlyThemes?.find(t => t.month === month);
      const patternTasks = monthPattern?.tasks || [];
      
      // Ensure we have enough unique tasks - generate more if needed
      const expandedTasks: TaskPattern[] = [];
      
      for (let i = 0; i < monthDates.length; i++) {
        expandedTasks.push(createTaskFromPattern(patternTasks, i, month, monthTheme));
      }
      
      // Assign expanded tasks to dates
      monthDates.forEach((dateInfo, index) => {
        globalDayCounter++;
        const task = expandedTasks[index];
        const weekInMonth = Math.ceil((index + 1) / (scheduleType === "weekdays" ? 5 : 7));
        
        // Use AI-generated resources if available, otherwise generate fallback resources
        let resources: TaskResource[];
        
        if (task.resources && task.resources.length > 0) {
          // Convert AI resources to TaskResource format
          resources = task.resources.map(r => {
            let source = "Web";
            try {
              source = new URL(r.url).hostname.replace("www.", "");
            } catch {
              // Invalid URL, use default source
            }
            return {
              type: (r.type || "article") as TaskResource["type"],
              title: r.name || "Resource",
              url: r.url,
              source,
              difficulty: (goalInput.experienceLevel as DifficultyLevel) ?? "beginner",
              isFree: true,
            };
          }).filter(r => r.url?.startsWith("http")).slice(0, 3);
          
          // If no valid AI resources, use fallback
          if (resources.length === 0) {
            resources = generateTaskResources(
              task.title,
              task.type || "learn",
              categoryName,
              goalInput.experienceLevel || "beginner"
            );
          }
        } else {
          // Fallback to generated resources
          resources = generateTaskResources(
            task.title,
            task.type || "learn",
            categoryName,
            goalInput.experienceLevel || "beginner"
          );
        }
        
        dailyTasks.push({
          taskId: `task-${planId}-${globalDayCounter}`,
          day: globalDayCounter,
          date: dateInfo.date,
          title: task.title,
          description: task.description,
          type: (task.type || "learn") as DailyTask["type"],
          estimatedMinutes: dailyMins,
          points: basePoints,
          month: month,
          week: weekInMonth,
          resources: resources,
        });
        
        // Add LeetCode task if enabled (as second task for the day)
        if (includeLeetCode) {
          const lcConfig = getLeetCodeDifficulty(month);
          const languagePart = leetCodeLanguage ? ` in ${leetCodeLanguage}` : "";
          const leetcodeDescription = `Complete LeetCode's Daily Challenge${languagePart}. Click this task to view the problem, submit your solution, and analyze time/space complexity. The actual problem will be fetched from LeetCode when you open this task.`;

          dailyTasks.push({
            taskId: `task-${planId}-${globalDayCounter}-lc`,
            day: globalDayCounter,
            date: dateInfo.date,
            title: `🧩 LeetCode Daily Challenge (${lcConfig.difficulty})`,
            description: leetcodeDescription,
            type: "practice",
            estimatedMinutes: lcConfig.minutes,
            points: lcConfig.points,
            month: month,
            week: weekInMonth,
          });
        }
      });
    }

    // Build monthly themes array
    const monthlyThemes = (aiPlan.monthlyThemes || []).map(mt => ({
      month: mt.month,
      theme: mt.theme,
      focus: mt.focus,
    }));

    // Fill in any missing months
    for (let m = 1; m <= 12; m++) {
      if (!monthlyThemes.some(t => t.month === m)) {
        monthlyThemes.push({
          month: m,
          theme: `Month ${m} Focus`,
          focus: `Core concepts for month ${m}`,
        });
      }
    }
    monthlyThemes.sort((a, b) => a.month - b.month);

    // Return the complete plan data
    const planData = {
      planId,
      planTitle: aiPlan.title || `${goalInput.categoryName || goalInput.category} Mastery 2026`,
      planDescription: aiPlan.description || `A journey to master ${goalInput.primaryGoal || goalInput.category}`,
      planCategory: goalInput.category,
      planIcon: goalInput.icon || "✨",
      startDate: customStartDate || new Date().toISOString().split('T')[0],
      scheduleType,
      timeCommitment: goalInput.timeCommitment,
      includeLeetCode: includeLeetCode || false,
      leetCodeLanguage: leetCodeLanguage || "python",
      totalDays,
      dailyTasks, // All 260/365 unique tasks!
      monthlyThemes,
      totalPoints: dailyTasks.reduce((sum, t) => sum + t.points, 0),
    };

    console.log(`Generated plan with ${dailyTasks.length} tasks for ${totalDays} days`);

    return NextResponse.json({ 
      success: true, 
      plan: planData,
    });
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json({ success: false, error: "Failed to generate plan" }, { status: 500 });
  }
}

// Helper functions for DRY
const getTaskTypeByMonth = (month: number): "learn" | "practice" | "build" | "review" => {
  if (month <= 4) return "learn";
  if (month <= 8) return "practice";
  if (month <= 11) return "build";
  return "review";
};

const getScheduleTypeLabel = (scheduleType: string): string => {
  return scheduleType === "weekdays" ? "weekdays only" : "all days";
};
