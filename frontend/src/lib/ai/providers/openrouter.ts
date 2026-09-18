import { createParser, type EventSourceMessage } from "eventsource-parser";
import { AIMessage, AIProvider } from "../types";

export class OpenRouterProvider implements AIProvider {
  name = "OpenRouter";
  private apiKey: string;
  private model: string;

  constructor(
    apiKey: string,
    model: string = "openai/gpt-4o-mini"
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
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://researchcompany.org",
          "X-Title": "ResearchCompany AI Assistant",
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
        `OpenRouter API error (${response.status}): ${errText}`
      );
    }

    if (!response.body) {
      throw new Error(
        "No response stream body returned from OpenRouter."
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let fullText = "";
    let streamFinished = false;

    const parser = createParser({
      onEvent(event: EventSourceMessage) {
        if (streamFinished) return;

        const data = event.data?.trim();

        if (!data) return;

        if (data === "[DONE]") {
          streamFinished = true;
          return;
        }

        try {
          const parsed = JSON.parse(data);

          const delta =
            parsed?.choices?.[0]?.delta?.content ?? "";

          if (
            typeof delta === "string" &&
            delta.length > 0
          ) {
            fullText += delta;
            onChunk(delta);
          }
        } catch (error) {
          console.warn(
            "OpenRouter SSE JSON parse failed:",
            data,
            error
          );
        }
      },
    });

    while (!streamFinished) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      parser.feed(
        decoder.decode(value, {
          stream: true,
        })
      );
    }

    // Flush remaining UTF-8 bytes.
    const remaining = decoder.decode();

    if (remaining) {
      parser.feed(remaining);
    }

    return fullText;
  }
}