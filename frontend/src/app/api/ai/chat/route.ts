import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ResearchContextManager } from "@/lib/ai/contextManager";
import { SemanticRetrievalService, RetrievedChunk } from "@/lib/ai/retrieval";
import { OpenRouterProvider } from "@/lib/ai/providers/openrouter";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { AIProvider, AIMessage } from "@/lib/ai/types";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user authentication via SSR Supabase client
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // Rate Limiting Protection (15 AI prompts per minute per user)
    const rateCheck = checkRateLimit(request, "ai_chat", user.id, { windowMs: 60 * 1000, maxRequests: 15 });
    if (!rateCheck.isAllowed) {
      return rateLimitResponse(rateCheck.limit, rateCheck.remaining, rateCheck.reset);
    }

    // Fetch user AI settings & preferences
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const body = await request.json();
    const { message, conversationId, projectId, selectedFileIds = [], selectedCitationIds = [] } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    // 2. Resolve or create conversation
    let targetConversationId = conversationId;
    if (!targetConversationId) {
      const convTitle = message.trim().slice(0, 40) + "...";
      const { data: newConv, error: createConvErr } = await supabase
        .from("conversations")
        .insert([
          {
            user_id: user.id,
            project_id: projectId || null,
            title: convTitle,
          },
        ])
        .select("*")
        .single();

      if (createConvErr || !newConv) {
        throw new Error(createConvErr?.message || "Failed to initialize conversation.");
      }
      targetConversationId = newConv.id;
    } else {
      // Verify conversation ownership
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", targetConversationId)
        .eq("user_id", user.id)
        .single();

      if (!existingConv) {
        return NextResponse.json({ error: "Conversation not found or access denied." }, { status: 403 });
      }
    }

    // 3. Persist user message into public.messages
    const { error: insertUserMsgErr } = await supabase.from("messages").insert([
      {
        conversation_id: targetConversationId,
        sender_id: user.id,
        sender_type: "user",
        text: message.trim(),
      },
    ]);

    if (insertUserMsgErr) {
      throw new Error(`Failed to store message: ${insertUserMsgErr.message}`);
    }

    // 4. Fetch recent conversation history (max 15 messages)
    const { data: recentMsgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", targetConversationId)
      .order("created_at", { ascending: true })
      .limit(15);

    const formattedHistory: AIMessage[] = (recentMsgs || []).map((m) => ({
      role: m.sender_type === "user" ? "user" : "assistant",
      content: m.text,
    }));

    // 5. Execute Semantic Document Retrieval (RAG) respecting user settings
    let retrievedChunks: RetrievedChunk[] = [];
    const isRetrievalEnabled = userSettings ? userSettings.retrieval_enabled !== false : true;

    if (isRetrievalEnabled) {
      try {
        const retrievalService = new SemanticRetrievalService(supabase);
        retrievedChunks = await retrievalService.retrieve(message.trim(), {
          projectId: projectId || undefined,
          fileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
          matchCount: userSettings?.top_k || undefined,
          matchThreshold: userSettings?.similarity_threshold ? Number(userSettings.similarity_threshold) : undefined,
        });
      } catch (retrievalErr: any) {
        console.warn(
          "RAG Semantic Retrieval skipped or failed:",
          retrievalErr?.message || retrievalErr
        );
      }
    }

    // 6. Compile context using ResearchContextManager
    const contextMgr = new ResearchContextManager(supabase);
    const compiledContext = await contextMgr.compileContext(
      user.id,
      projectId,
      selectedFileIds,
      selectedCitationIds,
      retrievedChunks,
      userSettings?.response_style || "balanced"
    );

    // 7. Instantiate server-side AI provider using user preferences
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let targetProvider = userSettings?.ai_provider || "auto";
    if (targetProvider === "auto") {
      targetProvider = openrouterKey ? "openrouter" : openaiKey ? "openai" : "";
    }

    const modelName = userSettings?.ai_model || process.env.AI_MODEL || (targetProvider === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini");

    let provider: AIProvider;
    if (targetProvider === "openrouter" && openrouterKey) {
      provider = new OpenRouterProvider(openrouterKey, modelName);
    } else if (targetProvider === "openai" && openaiKey) {
      provider = new OpenAIProvider(openaiKey, modelName);
    } else {
      return NextResponse.json(
        { error: "AI service is not configured. Server API key missing." },
        { status: 503 }
      );
    }

    // 7. Setup SSE Streaming Response
    const encoder = new TextEncoder();
    let accumulatedAssistantText = "";

    const customReadable = new ReadableStream({
      async start(controller) {
        // Send initial metadata JSON chunk
        const initData = JSON.stringify({ conversationId: targetConversationId });
        controller.enqueue(encoder.encode(`event: init\ndata: ${initData}\n\n`));

        try {
          const fullResponse = await provider.generateStream(
            formattedHistory,
            compiledContext.systemPrompt,
            (chunk: string) => {
              accumulatedAssistantText += chunk;
              const dataPayload = JSON.stringify({ chunk });
              controller.enqueue(encoder.encode(`data: ${dataPayload}\n\n`));
            }
          );

          // Persist completed assistant message
          if (accumulatedAssistantText.trim()) {
            await supabase.from("messages").insert([
              {
                conversation_id: targetConversationId,
                sender_id: user.id,
                sender_type: "ai",
                text: accumulatedAssistantText.trim(),
              },
            ]);

            await supabase
              .from("conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", targetConversationId);
          }

          controller.enqueue(encoder.encode("event: done\ndata: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          console.error("AI Generation Error:", err);
          const errPayload = JSON.stringify({ error: err?.message || "AI generation failed." });
          controller.enqueue(encoder.encode(`event: error\ndata: ${errPayload}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(customReadable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("API /api/ai/chat error:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
