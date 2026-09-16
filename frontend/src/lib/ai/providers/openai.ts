import { AIMessage, AIProvider } from "../types";

export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateStream(
    messages: AIMessage[],
    systemPrompt: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    if (!response.body) {
      throw new Error("No response stream body returned from OpenAI.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split("\n").filter((l) => l.trim().startsWith("data: "));

      for (const line of lines) {
        const payloadStr = line.replace(/^data:\s*/, "").trim();
        if (payloadStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(payloadStr);
          const delta = parsed.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // Ignore JSON parse errors for split chunks
        }
      }
    }

    return fullText;
  }
}
