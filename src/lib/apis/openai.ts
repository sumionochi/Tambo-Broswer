// lib/apis/openai.ts

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface ImageVariation {
  url: string;
  prompt: string;
}

export async function generateImageVariations(
  imageUrl: string,
  prompt: string,
  count: number = 4
): Promise<ImageVariation[]> {
  try {
    // Download image first
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], "image.png", { type: "image/png" });

    // Generate variations using DALL-E
    const response = await openai.images.edit({
      image: imageFile,
      prompt: prompt,
      n: count,
      size: "1024x1024",
    });

    // Fix: Check if data exists and filter out nulls
    if (!response.data) {
      throw new Error("No image data returned from OpenAI");
    }

    return response.data
      .filter((image) => image.url) // Filter out any without URLs
      .map((image) => ({
        url: image.url!,
        prompt: prompt,
      }));
  } catch (error) {
    console.error("OpenAI image generation error:", error);
    throw error;
  }
}

export async function generateImage(
  prompt: string,
  count: number = 1
): Promise<string[]> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: count,
      size: "1024x1024",
      quality: "standard",
    });

    // Fix: Check if data exists and filter out nulls
    if (!response.data) {
      throw new Error("No image data returned from OpenAI");
    }

    return response.data
      .filter((image) => image.url) // Filter out any without URLs
      .map((image) => image.url!);
  } catch (error) {
    console.error("OpenAI image generation error:", error);
    throw error;
  }
}

export async function createAudioSummary(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy"
): Promise<{ audioUrl: string; transcript: string }> {
  try {
    // Generate speech from text
    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
    });

    // Convert to base64 for storage
    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    const audioUrl = `data:audio/mp3;base64,${buffer.toString("base64")}`;

    return {
      audioUrl,
      transcript: text,
    };
  } catch (error) {
    console.error("OpenAI TTS error:", error);
    throw error;
  }
}

export async function summarizeArticles(articles: string[]): Promise<string> {
  try {
    const prompt = `Summarize these articles in a concise 2-3 minute summary suitable for text-to-speech:

${articles.join("\n\n---\n\n")}

Provide a natural, conversational summary that highlights the key points.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that creates concise, engaging summaries.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI summarization error:", error);
    throw error;
  }
}
