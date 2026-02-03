// lib/apis/github.ts

import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  updatedAt: string;
  owner: string;
}

export interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  body: string;
  state: string;
  url: string;
  createdAt: string;
  author: string;
}

export interface GitHubPR {
  id: string;
  number: number;
  title: string;
  body: string;
  state: string;
  url: string;
  createdAt: string;
  author: string;
}

export async function searchRepositories(
  query: string,
  options?: {
    language?: string;
    stars?: number;
    sort?: "stars" | "forks" | "updated";
    limit?: number;
  }
): Promise<GitHubRepo[]> {
  try {
    let searchQuery = query;

    if (options?.language) {
      searchQuery += ` language:${options.language}`;
    }
    if (options?.stars) {
      searchQuery += ` stars:>=${options.stars}`;
    }

    const response = await octokit.search.repos({
      q: searchQuery,
      sort: options?.sort || "stars",
      per_page: options?.limit || 10,
    });

    // Fix: Filter out repos with null owners
    return response.data.items
      .filter((repo) => repo.owner) // Filter out any without owners
      .map((repo) => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || "",
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language || "Unknown",
        updatedAt: repo.updated_at,
        owner: repo.owner!.login, // Safe now after filter
      }));
  } catch (error) {
    console.error("GitHub repo search error:", error);
    throw error;
  }
}

export async function searchIssues(
  query: string,
  repo?: string,
  options?: {
    state?: "open" | "closed" | "all";
    labels?: string[];
    limit?: number;
  }
): Promise<GitHubIssue[]> {
  try {
    let searchQuery = query;

    if (repo) {
      searchQuery += ` repo:${repo}`;
    }
    if (options?.state) {
      searchQuery += ` state:${options.state}`;
    }
    if (options?.labels) {
      searchQuery += ` ${options.labels.map((l) => `label:${l}`).join(" ")}`;
    }

    const response = await octokit.search.issuesAndPullRequests({
      q: searchQuery + " type:issue",
      per_page: options?.limit || 10,
    });

    return response.data.items.map((issue) => ({
      id: issue.id.toString(),
      number: issue.number,
      title: issue.title,
      body: issue.body || "",
      state: issue.state,
      url: issue.html_url,
      createdAt: issue.created_at,
      author: issue.user?.login || "Unknown",
    }));
  } catch (error) {
    console.error("GitHub issue search error:", error);
    throw error;
  }
}

export async function getRepoFiles(
  owner: string,
  repo: string,
  path: string = ""
): Promise<any[]> {
  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if (Array.isArray(response.data)) {
      return response.data;
    }

    return [response.data];
  } catch (error) {
    console.error("GitHub file fetch error:", error);
    throw error;
  }
}
