export interface AIMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

export interface AIRequestContext {
  message: string;
  conversationId?: string;
  projectId?: string | null;
  selectedFileIds?: string[];
  selectedCitationIds?: string[];
}

export interface AIProviderConfig {
  provider: "openrouter" | "openai" | "gemini";
  model: string;
  apiKey: string;
}

export interface AIProvider {
  name: string;
  generateStream(
    messages: AIMessage[],
    systemPrompt: string,
    onChunk: (chunk: string) => void
  ): Promise<string>;
}
