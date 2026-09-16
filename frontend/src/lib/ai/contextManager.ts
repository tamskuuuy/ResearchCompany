import { SupabaseClient } from "@supabase/supabase-js";
import { ResearchProject, FileItem, Citation, ResearchTask } from "@/types/database";
import { RetrievedChunk } from "@/lib/ai/retrieval";
import { buildRagContext, FormattedRagContext } from "@/lib/ai/ragContext";

export interface CompiledContext {
  systemPrompt: string;
  project?: ResearchProject | null;
  files: FileItem[];
  citations: Citation[];
  ragContext?: FormattedRagContext | null;
}

export class ResearchContextManager {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async compileContext(
    userId: string,
    projectId?: string | null,
    selectedFileIds: string[] = [],
    selectedCitationIds: string[] = [],
    retrievedChunks: RetrievedChunk[] = [],
    responseStyle: "concise" | "balanced" | "detailed" = "balanced"
  ): Promise<CompiledContext> {
    let project: ResearchProject | null = null;
    let files: FileItem[] = [];
    let citations: Citation[] = [];

    // 1. Fetch authenticated user's project if provided
    if (projectId) {
      const { data: projData } = await this.supabase
        .from("research_projects")
        .select("*")
        .eq("id", projectId)
        .eq("owner_id", userId)
        .maybeSingle();

      if (projData) project = projData;
    }

    // 2. Fetch selected files metadata (max 5)
    if (selectedFileIds.length > 0) {
      const targetIds = selectedFileIds.slice(0, 5);
      const { data: fileData } = await this.supabase
        .from("files")
        .select("*")
        .eq("user_id", userId)
        .in("id", targetIds);

      if (fileData) files = fileData;
    }

    // 3. Fetch selected saved citations (max 5)
    if (selectedCitationIds.length > 0) {
      const targetCitIds = selectedCitationIds.slice(0, 5);
      const { data: citData } = await this.supabase
        .from("citations")
        .select("*")
        .eq("user_id", userId)
        .in("id", targetCitIds);

      if (citData) citations = citData;
    }

    // 4. Fetch user's upcoming research tasks and deadlines (max 5)
    let scheduleTasks: ResearchTask[] = [];
    const { data: taskData } = await this.supabase
      .from("research_tasks")
      .select("*")
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .neq("status", "COMPLETED")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(5);

    if (taskData) scheduleTasks = taskData;

    // 5. Build RAG Context block if retrieved chunks are present
    const ragContext =
      retrievedChunks.length > 0 ? buildRagContext(retrievedChunks) : null;

    // 6. Construct System Prompt
    const systemPrompt = this.buildSystemPrompt(
      project,
      files,
      citations,
      ragContext,
      scheduleTasks,
      responseStyle
    );

    return {
      systemPrompt,
      project,
      files,
      citations,
      ragContext,
    };
  }

  private buildSystemPrompt(
    project: ResearchProject | null,
    files: FileItem[],
    citations: Citation[],
    ragContext?: FormattedRagContext | null,
    scheduleTasks: ResearchTask[] = [],
    responseStyle: "concise" | "balanced" | "detailed" = "balanced"
  ): string {
    let prompt = `You are the official ResearchCompany AI Research Assistant. Your role is to assist researchers with literature synthesis, methodology structuring, paper drafting, research planning, and schedule management.

STRICT PRINCIPLES & CITATION SAFETY GUARANTEE:
1. Help users understand research concepts, structure academic methodologies, and organize project milestones.
2. Clearly distinguish empirical facts from analytical suggestions.
3. NEVER INVENT CITATIONS. NEVER invent DOI numbers, fake author names, fake page numbers, or fake journal titles.
4. When research document context is provided below, treat it as the PRIMARY SOURCE of truth for claims about the user's research documents.
5. When a statement is directly supported by retrieved document context, provide an inline source marker in the exact format: [Source: filename, chunk X] (e.g. [Source: SONIC_Report.pdf, chunk 4]). Source markers MUST correspond ONLY to sources actually provided in the retrieved context.
6. Do NOT invent or fabricate information that is absent from the retrieved document context. If the available documents do not contain enough information to answer a research-specific question, explicitly state that the available documents do not provide enough information.
7. When referencing saved citations from context, cite the author and year (e.g. [Source: Author et al., 2025]).
8. Format responses using clean markdown (headings, bullet lists, code blocks, tables).
9. USER RESPONSE STYLE PREFERENCE: ${
      responseStyle === "concise"
        ? "Be succinct, direct, and deliver high-density responses without fluff."
        : responseStyle === "detailed"
        ? "Provide comprehensive, deeply explanatory academic responses with full breakdowns."
        : "Provide a balanced, structured response with clear explanations and concise summaries."
    }`;

    if (project) {
      prompt += `\n\nCURRENT ACTIVE RESEARCH PROJECT:
- Title: ${project.title}
- Description: ${project.description || "N/A"}
- Status: ${project.status}`;
    }

    if (scheduleTasks.length > 0) {
      prompt += `\n\nAUTHORIZED UPCOMING RESEARCH SCHEDULE & TASKS:`;
      scheduleTasks.forEach((t, idx) => {
        const dueStr = t.due_at ? new Date(t.due_at).toISOString().split("T")[0] : "No due date";
        prompt += `\n${idx + 1}. [${t.priority}] "${t.title}" (Status: ${t.status}, Due: ${dueStr})`;
      });
    }

    if (ragContext && ragContext.formattedPromptText) {
      prompt += `\n\nRETRIEVED RESEARCH DOCUMENT CONTEXT (Primary source text for user's documents):\n\n${ragContext.formattedPromptText}`;
    }

    if (files.length > 0) {
      prompt += `\n\nSELECTED FILE METADATA IN CONTEXT:`;
      files.forEach((f, idx) => {
        prompt += `\n${idx + 1}. ${f.name} (Type: ${f.mime_type || "Unknown"}, Size: ${(f.size_bytes / 1024).toFixed(1)} KB, Path: ${f.file_path})`;
      });
    }

    if (citations.length > 0) {
      prompt += `\n\nSELECTED SAVED CITATIONS IN CONTEXT:`;
      citations.forEach((c, idx) => {
        prompt += `\n${idx + 1}. "${c.title}" by ${c.authors} (${c.year || "n.d."}). Journal: ${c.journal || "N/A"}. DOI: ${c.doi || "None"}. Provider: ${c.source_provider || "Crossref"}. Notes: ${c.notes || "None"}`;
      });
    }

    return prompt;
  }
}
