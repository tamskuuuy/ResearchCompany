import crypto from "crypto";

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private expectedDimension: number;

  constructor(apiKey: string, model: string = "text-embedding-3-small", expectedDimension: number = 1536) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error("OpenAI API key is missing for embedding generation.");
    }
    this.apiKey = apiKey.trim();
    this.model = model;
    this.expectedDimension = expectedDimension;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = `OpenAI Embedding API error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          message += `: ${errorJson.error.message}`;
        }
      } catch {
        // Fallback to generic message
      }
      throw new Error(message);
    }

    const json = await response.json();
    if (!json.data || !Array.isArray(json.data)) {
      throw new Error("Invalid response format from OpenAI Embedding API.");
    }

    // OpenAI returns data array sorted by index
    const sortedData = [...json.data].sort((a, b) => a.index - b.index);
    const vectors: number[][] = [];

    for (let i = 0; i < sortedData.length; i++) {
      const vec = sortedData[i].embedding;
      if (!Array.isArray(vec) || vec.length !== this.expectedDimension) {
        throw new Error(
          `Vector dimension mismatch. Expected ${this.expectedDimension}, but received ${vec?.length ?? 0}.`
        );
      }
      vectors.push(vec);
    }

    return vectors;
  }
}

/**
 * Calculates SHA-256 hash of text content for idempotency checks.
 */
export function calculateContentHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Factory function to instantiate the active embedding provider based on environment.
 */
export function getEmbeddingProvider(): {
  provider: EmbeddingProvider;
  model: string;
  dimension: number;
  batchSize: number;
} {
  const providerName = process.env.EMBEDDING_PROVIDER || "openai";
  const model = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
  const dimension = parseInt(process.env.EMBEDDING_DIMENSION || "1536", 10);
  const batchSize = parseInt(process.env.EMBEDDING_BATCH_SIZE || "50", 10);

  if (providerName === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured on the server.");
    }
    return {
      provider: new OpenAIEmbeddingProvider(apiKey, model, dimension),
      model,
      dimension,
      batchSize,
    };
  }

  throw new Error(`Unsupported embedding provider: ${providerName}`);
}
