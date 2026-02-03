// lib/apis/pexels.ts

const PEXELS_API_KEY = process.env.PEXELS_API_KEY!;

export interface PexelsPhoto {
  id: string;
  url: string;
  imageUrl: string;
  thumbnail: string;
  photographer: string;
  title: string;
  width: number;
  height: number;
  alt?: string;
}

export async function searchPexels(
  query: string,
  options?: {
    perPage?: number;
    page?: number;
  }
): Promise<PexelsPhoto[]> {
  try {
    const params = new URLSearchParams({
      query: query,
      per_page: (options?.perPage || 20).toString(),
      page: (options?.page || 1).toString(),
    });

    const response = await fetch(
      `https://api.pexels.com/v1/search?${params.toString()}`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();

    return data.photos.map((photo: any) => ({
      id: photo.id.toString(),
      url: photo.url,
      imageUrl: photo.src.large2x,
      thumbnail: photo.src.medium,
      photographer: photo.photographer,
      title: `Photo by ${photo.photographer}`,
      width: photo.width,
      height: photo.height,
      alt: photo.alt,
    }));
  } catch (error) {
    console.error("Pexels search error:", error);
    throw error;
  }
}

export async function getPexelsCurated(options?: {
  perPage?: number;
  page?: number;
}): Promise<PexelsPhoto[]> {
  try {
    const params = new URLSearchParams({
      per_page: (options?.perPage || 20).toString(),
      page: (options?.page || 1).toString(),
    });

    const response = await fetch(
      `https://api.pexels.com/v1/curated?${params.toString()}`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();

    return data.photos.map((photo: any) => ({
      id: photo.id.toString(),
      url: photo.url,
      imageUrl: photo.src.large2x,
      thumbnail: photo.src.medium,
      photographer: photo.photographer,
      title: `Photo by ${photo.photographer}`,
      width: photo.width,
      height: photo.height,
      alt: photo.alt,
    }));
  } catch (error) {
    console.error("Pexels curated error:", error);
    throw error;
  }
}
