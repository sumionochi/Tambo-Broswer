// app/api/github/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

interface ArchitectureNode {
  id: string;
  type:
    | "frontend"
    | "api"
    | "backend"
    | "database"
    | "config"
    | "infra"
    | "docs"
    | "testing";
  label: string;
  description: string;
  language: string;
  path: string;
  connections: string[];
}

// Map file extensions to languages
const EXTENSION_LANG: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  swift: "Swift",
  kt: "Kotlin",
  cs: "C#",
  cpp: "C++",
  c: "C",
  sql: "SQL",
  prisma: "Prisma",
  graphql: "GraphQL",
  yml: "YAML",
  yaml: "YAML",
  toml: "TOML",
  json: "JSON",
  md: "Markdown",
  mdx: "MDX",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  dockerfile: "Docker",
  tf: "Terraform",
};

// Detect node type and metadata from directory/file names
function classifyEntry(
  name: string,
  path: string
): {
  type: ArchitectureNode["type"];
  label: string;
  description: string;
} | null {
  const lower = name.toLowerCase();
  const fullPath = path.toLowerCase();

  // Frontend
  if (
    ["components", "pages", "views", "app", "src/app"].some((p) =>
      fullPath.includes(p)
    ) &&
    !fullPath.includes("api")
  ) {
    return {
      type: "frontend",
      label: "Frontend",
      description: "UI components and pages",
    };
  }

  // API layer
  if (["api", "routes", "controllers", "handlers"].includes(lower)) {
    return {
      type: "api",
      label: "API Layer",
      description: "API routes and request handlers",
    };
  }

  // Backend / services
  if (
    ["lib", "services", "utils", "helpers", "modules", "core", "src/lib"].some(
      (p) => lower === p || fullPath.includes(p)
    )
  ) {
    return {
      type: "backend",
      label: "Business Logic",
      description: "Services, utilities, and core logic",
    };
  }

  // Database
  if (
    ["prisma", "migrations", "db", "database", "models", "schema"].includes(
      lower
    )
  ) {
    return {
      type: "database",
      label: "Database",
      description: "Schema, migrations, and data models",
    };
  }

  // Testing
  if (
    ["test", "tests", "__tests__", "spec", "specs", "e2e", "cypress"].includes(
      lower
    )
  ) {
    return {
      type: "testing",
      label: "Tests",
      description: "Test suites and test utilities",
    };
  }

  // Infrastructure
  if (
    ["docker", "infra", "deploy", "k8s", "terraform", ".github"].includes(
      lower
    ) ||
    ["dockerfile", "docker-compose"].some((f) => lower.includes(f))
  ) {
    return {
      type: "infra",
      label: "Infrastructure",
      description: "Deployment and CI/CD configuration",
    };
  }

  // Docs
  if (["docs", "documentation", "wiki"].includes(lower)) {
    return {
      type: "docs",
      label: "Documentation",
      description: "Project documentation",
    };
  }

  // Config files at root
  if (["config", "configs", ".config"].includes(lower)) {
    return {
      type: "config",
      label: "Configuration",
      description: "Project configuration files",
    };
  }

  return null;
}

// Detect primary language from repo contents
function detectLanguage(files: { name: string }[]): string {
  const counts: Record<string, number> = {};
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext && EXTENSION_LANG[ext]) {
      const lang = EXTENSION_LANG[ext];
      counts[lang] = (counts[lang] || 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || "Unknown";
}

// Infer connections between nodes based on typical patterns
function inferConnections(nodes: ArchitectureNode[]): void {
  const typeMap = new Map(nodes.map((n) => [n.type, n.id]));

  for (const node of nodes) {
    switch (node.type) {
      case "frontend":
        if (typeMap.has("api")) node.connections.push(typeMap.get("api")!);
        else if (typeMap.has("backend"))
          node.connections.push(typeMap.get("backend")!);
        break;
      case "api":
        if (typeMap.has("backend"))
          node.connections.push(typeMap.get("backend")!);
        if (typeMap.has("database"))
          node.connections.push(typeMap.get("database")!);
        break;
      case "backend":
        if (typeMap.has("database"))
          node.connections.push(typeMap.get("database")!);
        break;
      case "infra":
        // Infra connects to everything it deploys
        if (typeMap.has("frontend"))
          node.connections.push(typeMap.get("frontend")!);
        if (typeMap.has("api")) node.connections.push(typeMap.get("api")!);
        break;
      case "testing":
        if (typeMap.has("frontend"))
          node.connections.push(typeMap.get("frontend")!);
        if (typeMap.has("backend"))
          node.connections.push(typeMap.get("backend")!);
        break;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { owner, repo } = await request.json();

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "owner and repo are required" },
        { status: 400 }
      );
    }

    // Fetch repo metadata
    const { data: repoData } = await octokit.repos.get({ owner, repo });

    // Fetch root directory contents
    const { data: rootContents } = await octokit.repos.getContent({
      owner,
      repo,
      path: "",
    });

    const entries = Array.isArray(rootContents) ? rootContents : [rootContents];
    const directories = entries.filter((e) => e.type === "dir");
    const files = entries.filter((e) => e.type === "file");

    // Also check src/ if it exists (common monorepo pattern)
    let srcEntries: any[] = [];
    const hasSrc = directories.some((d) => d.name === "src");
    if (hasSrc) {
      try {
        const { data: srcContents } = await octokit.repos.getContent({
          owner,
          repo,
          path: "src",
        });
        srcEntries = Array.isArray(srcContents) ? srcContents : [srcContents];
      } catch {
        // src/ might not be listable
      }
    }

    // Build architecture nodes from directories
    const nodeMap = new Map<string, ArchitectureNode>();
    const allDirs = [
      ...directories.map((d) => ({ ...d, fullPath: d.name })),
      ...srcEntries
        .filter((e: any) => e.type === "dir")
        .map((d: any) => ({ ...d, fullPath: `src/${d.name}` })),
    ];

    for (const dir of allDirs) {
      const classification = classifyEntry(dir.name, dir.fullPath);
      if (!classification) continue;

      // Merge if same type already exists (e.g. both "components" and "app" → frontend)
      const existing = nodeMap.get(classification.type);
      if (existing) {
        existing.path += `, /${dir.fullPath}`;
        continue;
      }

      nodeMap.set(classification.type, {
        id: classification.type,
        type: classification.type,
        label: classification.label,
        description: classification.description,
        language: repoData.language || "Unknown",
        path: `/${dir.fullPath}`,
        connections: [],
      });
    }

    // Detect config files at root level
    const configFiles = files.filter((f) =>
      [
        "package.json",
        "tsconfig.json",
        "next.config",
        "vite.config",
        "webpack.config",
        ".env",
        "tailwind.config",
        "eslint",
      ].some((c) => f.name.toLowerCase().includes(c))
    );

    if (configFiles.length > 0 && !nodeMap.has("config")) {
      nodeMap.set("config", {
        id: "config",
        type: "config",
        label: "Configuration",
        description: `Project config: ${configFiles
          .map((f) => f.name)
          .slice(0, 4)
          .join(", ")}`,
        language: "JSON/YAML",
        path: "/",
        connections: [],
      });
    }

    // Detect database from files (prisma/schema.prisma, etc.)
    const dbIndicators = files.filter((f) =>
      ["prisma", "drizzle", "knexfile", "sequelize", "typeorm"].some((d) =>
        f.name.toLowerCase().includes(d)
      )
    );
    if (dbIndicators.length > 0 && !nodeMap.has("database")) {
      nodeMap.set("database", {
        id: "database",
        type: "database",
        label: "Database",
        description: `Data layer: ${dbIndicators
          .map((f) => f.name)
          .join(", ")}`,
        language: "SQL",
        path: "/",
        connections: [],
      });
    }

    // Detect CI/CD from root files
    const ciFiles = files.filter((f) =>
      [
        "dockerfile",
        "docker-compose",
        ".dockerignore",
        "vercel.json",
        "netlify.toml",
        "fly.toml",
      ].some((c) => f.name.toLowerCase().includes(c))
    );
    const hasGithubDir = directories.some((d) => d.name === ".github");
    if ((ciFiles.length > 0 || hasGithubDir) && !nodeMap.has("infra")) {
      nodeMap.set("infra", {
        id: "infra",
        type: "infra",
        label: "Infrastructure",
        description: `CI/CD and deployment config`,
        language: "YAML/Docker",
        path: hasGithubDir ? "/.github" : "/",
        connections: [],
      });
    }

    const nodes = Array.from(nodeMap.values());

    // If we found nothing meaningful, add a generic source node
    if (nodes.length === 0) {
      nodes.push({
        id: "source",
        type: "backend",
        label: "Source Code",
        description: `Main source code for ${repo}`,
        language: repoData.language || "Unknown",
        path: "/",
        connections: [],
      });
    }

    // Infer connections between layers
    inferConnections(nodes);

    // Set correct language per node using file detection
    const allFiles = [
      ...files,
      ...srcEntries.filter((e: any) => e.type === "file"),
    ];
    const primaryLang = detectLanguage(allFiles);

    return NextResponse.json({
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description || "",
      language: repoData.language || primaryLang,
      url: repoData.html_url,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      defaultBranch: repoData.default_branch,
      nodes,
    });
  } catch (error: any) {
    // Handle GitHub 404 specifically
    if (error.status === 404) {
      return NextResponse.json(
        { error: "Repository not found. Check the owner and repo name." },
        { status: 404 }
      );
    }

    console.error("GitHub analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
