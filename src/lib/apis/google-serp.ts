// lib/apis/google-serp.ts

const SERP_API_KEY = process.env.GOOGLE_SERP_API_KEY!;

export interface WebSearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  thumbnail?: string;
  source: string;
  position: number;
}

export interface ImageSearchResult {
  id: string;
  title: string;
  imageUrl: string;
  thumbnail: string;
  source: string;
  url: string;
  width?: number;
  height?: number;
}

export async function searchWeb(
  query: string,
  options?: {
    num?: number;
    freshness?: "day" | "week" | "month";
  }
): Promise<WebSearchResult[]> {
  try {
    const params = new URLSearchParams({
      engine: "google",
      q: query,
      api_key: SERP_API_KEY,
      num: (options?.num || 10).toString(),
    });

    if (options?.freshness) {
      params.append("tbs", `qdr:${options.freshness.charAt(0)}`);
    }

    const response = await fetch(
      `https://serpapi.com/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`SERP API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.organic_results || []).map((result: any) => ({
      id: result.position.toString(),
      title: result.title,
      url: result.link,
      snippet: result.snippet || "",
      thumbnail: result.thumbnail,
      source: result.source || new URL(result.link).hostname,
      position: result.position,
    }));
  } catch (error) {
    console.error("Google SERP search error:", error);
    throw error;
  }
}

export async function searchImages(
  query: string,
  options?: {
    num?: number;
  }
): Promise<ImageSearchResult[]> {
  try {
    const params = new URLSearchParams({
      engine: "google_images",
      q: query,
      api_key: SERP_API_KEY,
      num: (options?.num || 20).toString(),
    });

    const response = await fetch(
      `https://serpapi.com/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`SERP API Images error: ${response.status}`);
    }

    const data = await response.json();

    return (data.images_results || []).map((result: any, index: number) => ({
      id: index.toString(),
      title: result.title || "Untitled",
      imageUrl: result.original,
      thumbnail: result.thumbnail,
      source: result.source || "Google Images",
      url: result.link,
      width: result.original_width,
      height: result.original_height,
    }));
  } catch (error) {
    console.error("Google SERP image search error:", error);
    throw error;
  }
}
