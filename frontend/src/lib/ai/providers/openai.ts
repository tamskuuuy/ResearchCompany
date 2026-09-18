import { AIMessage, AIProvider } from "../types";

export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  private apiKey: string;
  private model: string;

  constructor(
    apiKey: string,
    model: string = "gpt-4o-mini"
  ) {
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
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
      }
    );

    if (!response.ok) {
      const errText = await response.text();

      throw new Error(
        `OpenAI API error (${response.status}): ${errText}`
      );
    }

    if (!response.body) {
      throw new Error(
        "No response stream body returned from OpenAI."
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let fullText = "";
    let streamFinished = false;

    while (!streamFinished) {
      const { done, value } = await reader.read();

      if (done) {
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);

      buffer = events.pop() || "";

      for (const event of events) {
        const lines = event.split(/\r?\n/);

        for (const line of lines) {
          if (!line.startsWith("data:")) {
            continue;
          }

          const payloadStr = line.slice(5).trim();

          if (!payloadStr) {
            continue;
          }

          if (payloadStr === "[DONE]") {
            streamFinished = true;
            break;
          }

          try {
            const parsed = JSON.parse(payloadStr);

            const delta =
              parsed?.choices?.[0]?.delta?.content ?? "";

            if (typeof delta === "string" && delta.length > 0) {
              fullText += delta;
              onChunk(delta);
            }
          } catch (error) {
            console.warn(
              "OpenAI SSE JSON parse failed:",
              payloadStr,
              error
            );
          }
        }

        if (streamFinished) {
          break;
        }
      }
    }

    return fullText;
  }
}