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

// Generate date list for 2026 based on schedule type
function generate2026Dates(scheduleType: "weekdays" | "fullweek"): { date: string; dayOfWeek: number; month: number; week: number }[] {
  const dates: { date: string; dayOfWeek: number; month: number; week: number }[] = [];
  let current = new Date(2026, 0, 1); // January 1st, 2026
  const endDate = new Date(2026, 11, 31);
  let weekCounter = 1;
  let lastDow = -1;

  while (current <= endDate) {
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
    }
    current = addDays(current, 1);
  }
  return dates;
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
) => `You are an expert technical curriculum architect. Transform the user's custom curriculum into a structured 12-month learning plan.

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

2. DISTRIBUTE ACROSS 12 MONTHS:
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
6. Generate ALL 12 months completely

Transform this curriculum into a comprehensive, actionable 12-month plan.`;

// Helper: Build standard goal prompt with comprehensive curriculum design
const buildStandardGoalPrompt = (
  categoryName: string,
  goalText: string,
  level: string,
  dailyMins: number,
  totalDays: number,
  scheduleLabel: string,
  preferencesLine: string
) => `You are an expert technical curriculum architect and career coach with 15+ years of experience designing industry-aligned learning roadmaps for aspiring developers, engineers, and tech professionals.

Your task is to generate a HIGHLY STRUCTURED, PRACTICAL, and INDUSTRY-ALIGNED learning roadmap that will transform a learner from their current level to job-ready proficiency.

=== LEARNER PROFILE ===
TARGET ROLE/SKILL: ${categoryName}
PRIMARY GOAL: ${goalText}
EXPERIENCE LEVEL: ${level}
DAILY TIME AVAILABLE: ${dailyMins} minutes
TOTAL LEARNING DAYS: ${totalDays} (${scheduleLabel})
${preferencesLine}

=== CORE CURRICULUM OBJECTIVES ===

1. STRUCTURED PROGRESSION: Design a day-based learning plan grouped into logical phases that build upon each other. Never teach advanced concepts before foundations are solid.

2. BALANCED LEARNING MIX:
   - 40% Theory & Concepts (understanding the "why")
   - 35% Hands-on Practice (coding exercises, labs)
   - 15% Projects (building real applications)
   - 10% Review & Assessment (consolidation, quizzes)

3. INDUSTRY ALIGNMENT:
   - Use real-world tools, frameworks, and workflows used in actual companies
   - Include industry best practices from day one
   - Cover common interview topics and job requirements
   - Address real problems developers face on the job

4. PROGRESSIVE COMPLEXITY:
   - Start with fundamentals even for intermediate learners (fills gaps)
   - Each week should be slightly more challenging than the last
   - End projects should be portfolio-worthy

5. REVISION & RETENTION:
   - Every 4th week is a consolidation/review week
   - Spaced repetition: revisit earlier concepts in later projects
   - Weekly mini-reviews before moving to new topics

=== 12-MONTH CURRICULUM STRUCTURE ===

Organize the roadmap into these CLEAR PHASES with specific themes:

📚 PHASE 1: CORE FOUNDATIONS (Months 1-2)
Month 1: "${categoryName} Fundamentals"
- Core syntax, concepts, and mental models
- Development environment setup
- Version control basics (Git)
- First simple programs/projects
- Building good habits early

Month 2: "Building Blocks"
- Data structures relevant to the role
- Control flow and logic patterns
- Functions, modules, code organization
- Debugging and problem-solving skills
- First mini-project

🔧 PHASE 2: ESSENTIAL TOOLS & TECHNOLOGIES (Months 3-4)
Month 3: "Tools of the Trade"
- Primary framework/library deep dive
- Package management, dependencies
- Development workflow optimization
- Reading documentation effectively
- Integration project

Month 4: "Data & Persistence"
- Database fundamentals (SQL/NoSQL based on role)
- Data modeling and relationships
- CRUD operations mastery
- Data validation and integrity
- Database-connected project

⚡ PHASE 3: INTERMEDIATE SKILLS (Months 5-6)
Month 5: "Real-World Patterns"
- Design patterns relevant to the role
- Error handling and edge cases
- Code organization at scale
- Performance basics
- Pattern implementation project

Month 6: "Integration & APIs"
- Working with external APIs
- Authentication and authorization basics
- Third-party service integration
- Asynchronous programming
- API-connected project

🚀 PHASE 4: ADVANCED CONCEPTS (Months 7-8)
Month 7: "Advanced Techniques"
- Advanced language/framework features
- Optimization and performance tuning
- Caching strategies
- Concurrency/parallelism (if applicable)
- Performance-focused project

Month 8: "Testing & Quality"
- Unit testing fundamentals
- Integration testing
- Test-driven development (TDD)
- Code review practices
- Fully tested project

🛡️ PHASE 5: PROFESSIONAL PRACTICES (Months 9-10)
Month 9: "Security & Best Practices"
- Security fundamentals (OWASP Top 10)
- Secure coding practices
- Input validation and sanitization
- Authentication/Authorization deep dive
- Security-hardened project

Month 10: "DevOps & Deployment"
- CI/CD pipelines
- Containerization basics (Docker)
- Cloud deployment (based on preferences)
- Monitoring and logging
- Deployed, production-ready project

🎯 PHASE 6: PORTFOLIO & CAREER (Months 11-12)
Month 11: "Capstone Project"
- Full-scale portfolio project
- Combines all learned skills
- Real-world complexity
- Documentation and README
- Code polish and refactoring

Month 12: "Career Readiness"
- Portfolio website/GitHub optimization
- Resume and LinkedIn updates
- System design basics
- Technical interview preparation
- Mock interviews and coding challenges

=== TASK DESIGN RULES ===

DAILY TASK STRUCTURE:
- Each day has ONE primary focus (not multiple unrelated topics)
- Task titles must be SPECIFIC and ACTIONABLE (not "Learn Python" but "Master Python list comprehensions with 5 exercises")
- Include clear success criteria in descriptions

TOPIC SEQUENCING (CRITICAL):
- Day 1: LEARN new concept (theory + examples)
- Day 2: PRACTICE the concept (guided exercises)
- Day 3: APPLY the concept (mini-project or challenge)
- Day 4: Move to next related topic OR review if complex
- NEVER scatter practice across non-consecutive days

TASK TYPES:
- "learn": Reading, watching, understanding concepts (📖)
- "practice": Coding exercises, drills, repetition (💪)
- "build": Creating something new, projects (🔨)
- "review": Consolidation, quizzes, revisiting (🔄)

WEEKLY RHYTHM (for a 5-day week):
- Days 1-2: Learn new concept
- Days 3-4: Practice and apply
- Day 5: Review week's content OR start next topic

MONTHLY RHYTHM:
- Weeks 1-3: New content with practice
- Week 4: Consolidation, project work, and review

=== CONTENT ADAPTATION - CRITICAL ===

EXTRACT SPECIFIC TECHNOLOGIES FROM USER PREFERENCES:
${preferencesLine || "Use industry-standard technologies for " + categoryName}

IMPORTANT: Parse the preferences above and use the EXACT technology names in all task titles!
For example:
- If user selected "python" → task titles must say "Python" (not "Basics" or "Programming")
- If user selected "fastapi" → task titles must say "FastAPI" (not "Framework" or "Web Framework")
- If user selected "postgresql" → task titles must say "PostgreSQL" (not "Database" or "SQL")
- If user selected "react" → task titles must say "React" (not "Frontend" or "UI Library")

NEVER use generic terms like:
❌ "Learn Basics fundamentals"
❌ "Practice Core Concepts"
❌ "Build with Framework"

ALWAYS use specific technologies:
✅ "Learn Python data types and variables"
✅ "Practice FastAPI route handlers"
✅ "Build a PostgreSQL-connected CRUD app"
✅ "Master React useState and useEffect hooks"

FOR ${level.toUpperCase()} LEVEL:
${getLevelDescriptionText(level)}

=== OUTPUT FORMAT ===

Return ONLY valid JSON with this EXACT structure:

{
  "title": "Compelling plan title (max 8 words, e.g., 'Python Backend Mastery: Zero to Production')",
  "description": "One inspiring sentence about the transformation journey",
  "monthlyThemes": [
    {
      "month": 1,
      "theme": "Month 1 Theme Name",
      "focus": "What the learner masters this month",
      "topics": ["Topic1", "Topic2", "Topic3", "Topic4", "Topic5"],
      "project": "Specific end-of-month project name"
    }
  ],
  "taskPatterns": [
    {
      "month": 1,
      "tasks": [
        {
          "title": "Unique, specific, actionable task title",
          "description": "Clear instructions: what to do, resources to use, expected outcome",
          "type": "learn|practice|build|review",
          "topic": "Which of the 5 monthly topics this relates to"
        }
      ]
    }
  ]
}

=== CRITICAL REQUIREMENTS ===

1. ✅ Generate ALL 12 months completely
2. ✅ Each month has EXACTLY 5 topics that build on each other
3. ✅ Each month has 22-25 unique tasks (to fill ${scheduleLabel === "weekdays only" ? "~22 weekdays" : "~30 days"})
4. ✅ Tasks follow CONSECUTIVE learning pattern (learn → practice → apply)
5. ✅ EVERY task title must be unique across the entire plan
6. ✅ EVERY task description must be specific and actionable
7. ✅ Include at least one substantial project per month
8. ✅ Month 12 MUST include interview prep and job readiness
9. ✅ Adapt all content to ${categoryName} role specifically
10. ✅ TASK TITLES MUST INCLUDE SPECIFIC TECHNOLOGY NAMES from preferences (Python, React, FastAPI, etc.) - NEVER generic terms like "Basics" or "Framework"

FINAL CHECK: Before outputting, verify that EVERY task title contains a specific technology name (Python, Django, React, PostgreSQL, etc.) - NOT generic words like "Basics", "Framework", "Fundamentals", "Core Concepts".

Generate a comprehensive, practical, industry-aligned 12-month learning roadmap that will transform the learner into a job-ready ${categoryName}.`;

// Helper: Parse AI response and clean JSON
const parseAIResponse = (bedrockResponse: { content: string }) => {
  let text = bedrockResponse.content.trim();
  
  if (text.startsWith("```json")) text = text.slice(7);
  else if (text.startsWith("```")) text = text.slice(3);
  if (text.endsWith("```")) text = text.slice(0, -3);
  
  return text.trim();
};

// Helper: Create unique task from pattern with better variety
const createTaskFromPattern = (
  patternTasks: { title: string; description: string; type: string; topic: string }[],
  index: number,
  month: number,
  monthTheme: MonthlyTheme | undefined
) => {
  // If we have a task for this index, use it directly
  if (index < patternTasks.length) {
    return patternTasks[index];
  }
  
  // Generate additional unique task based on pattern rotation
  const baseTaskType = getTaskTypeByMonth(month);
  const topics = monthTheme?.topics || ["Core Concepts", "Fundamentals", "Practice", "Application", "Review"];
  const topicIndex = index % topics.length;
  const topic = topics[topicIndex];
  const cycleNumber = Math.floor(index / Math.max(patternTasks.length, 5)) + 1;
  
  // Create varied task titles based on cycle and type
  const taskVariants = [
    { prefix: "Deep Dive:", suffix: "advanced concepts", type: "learn" },
    { prefix: "Hands-On:", suffix: "practical exercises", type: "practice" },
    { prefix: "Build:", suffix: "mini-project", type: "build" },
    { prefix: "Review:", suffix: "key concepts", type: "review" },
    { prefix: "Apply:", suffix: "real-world scenario", type: "practice" },
  ];
  
  const variant = taskVariants[index % taskVariants.length];
  const title = `${variant.prefix} ${topic} - Part ${cycleNumber}`;
  const themeText = monthTheme?.theme || "Month " + month;
  const description = `Focus on ${topic} ${variant.suffix} for ${themeText}`;
  
  return {
    title,
    description,
    type: baseTaskType,
    topic,
  };
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
    const dates = generate2026Dates(scheduleType);
    const totalDays = dates.length; // 260 for weekdays, 365 for fullweek
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

    let aiPlan: {
      title: string;
      description: string;
      monthlyThemes: MonthlyTheme[];
      taskPatterns: { month: number; tasks: { title: string; description: string; type: string; topic: string }[] }[];
    };

    try {
      aiPlan = JSON.parse(text);
      if (!aiPlan.monthlyThemes || !aiPlan.taskPatterns || aiPlan.taskPatterns.length === 0) {
        throw new Error("Invalid AI response structure");
      }
    } catch {
      const category = goalInput.categoryName || goalInput.category || "Programming";
      const goal = goalInput.primaryGoal || goalInput.customGoal || category;
      const categoryTasks = generateCategorySpecificTasks(category, goal, goalInput.experienceLevel);
      
      aiPlan = {
        title: `${category} Mastery 2026`,
        description: `A comprehensive 12-month journey to master ${goal}`,
        monthlyThemes: categoryTasks.monthlyThemes,
        taskPatterns: categoryTasks.taskPatterns,
      };
    }

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
    
    for (let month = 1; month <= 12; month++) {
      const monthDates = datesByMonth.get(month) || [];
      const monthPattern = aiPlan.taskPatterns?.find(p => p.month === month);
      const monthTheme = aiPlan.monthlyThemes?.find(t => t.month === month);
      const patternTasks = monthPattern?.tasks || [];
      
      // Ensure we have enough unique tasks - generate more if needed
      const expandedTasks: { title: string; description: string; type: string; topic: string }[] = [];
      
      for (let i = 0; i < monthDates.length; i++) {
        expandedTasks.push(createTaskFromPattern(patternTasks, i, month, monthTheme));
      }
      
      // Assign expanded tasks to dates
      monthDates.forEach((dateInfo, index) => {
        globalDayCounter++;
        const task = expandedTasks[index];
        const weekInMonth = Math.ceil((index + 1) / (scheduleType === "weekdays" ? 5 : 7));
        
        let basePoints = 15;
        if (dailyMins >= 120) {
          basePoints = 30;
        } else if (dailyMins >= 60) {
          basePoints = 20;
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
        });
        
        // Add LeetCode task if enabled (as second task for the day)
        if (includeLeetCode) {
          let difficulty = "easy";
          if (month > 8) {
            difficulty = "hard";
          } else if (month > 3) {
            difficulty = "medium";
          }
          let dsaMins = 20;
          if (difficulty === "hard") {
            dsaMins = 45;
          } else if (difficulty === "medium") {
            dsaMins = 30;
          }
          const languagePart = leetCodeLanguage ? ` in ${leetCodeLanguage}` : "";
          // Description tells user to click the task to load the actual daily challenge
          const leetcodeDescription = `Complete LeetCode's Daily Challenge${languagePart}. Click this task to view the problem, submit your solution, and analyze time/space complexity. The actual problem will be fetched from LeetCode when you open this task.`;
          let leetcodePoints = 10;
          if (difficulty === "hard") {
            leetcodePoints = 30;
          } else if (difficulty === "medium") {
            leetcodePoints = 20;
          }

          dailyTasks.push({
            taskId: `task-${planId}-${globalDayCounter}-lc`,
            day: globalDayCounter,
            date: dateInfo.date,
            title: `🧩 LeetCode Daily Challenge (${difficulty})`,
            description: leetcodeDescription,
            type: "practice",
            estimatedMinutes: dsaMins,
            points: leetcodePoints,
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
      planDescription: aiPlan.description || `A 12-month journey to master ${goalInput.primaryGoal || goalInput.category}`,
      planCategory: goalInput.category,
      scheduleType,
      timeCommitment: goalInput.timeCommitment,
      includeLeetCode: includeLeetCode || false,
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
