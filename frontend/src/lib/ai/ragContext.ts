import { RetrievedChunk } from "@/lib/ai/retrieval";

export interface FormattedRagContext {
  formattedPromptText: string;
  chunksUsed: RetrievedChunk[];
  totalCharacters: number;
}

/**
 * Deduplicates retrieved chunks, enforces a deterministic character budget limit,
 * and formats sources for inclusion in the AI System Prompt.
 */
export function buildRagContext(
  chunks: RetrievedChunk[],
  maxChars?: number
): FormattedRagContext {
  const maxCharacterBudget =
    maxChars ?? parseInt(process.env.RAG_CONTEXT_MAX_CHARS || "12000", 10);

  if (!chunks || chunks.length === 0) {
    return {
      formattedPromptText: "",
      chunksUsed: [],
      totalCharacters: 0,
    };
  }

  // 1. Deduplicate chunks by unique ID (preserving highest similarity order)
  const seenIds = new Set<string>();
  const uniqueChunks: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    if (!seenIds.has(chunk.id)) {
      seenIds.add(chunk.id);
      uniqueChunks.push(chunk);
    }
  }

  // Sort descending by similarity score
  uniqueChunks.sort((a, b) => b.similarity - a.similarity);

  // 2. Format chunks into context blocks respecting character budget
  const chunksUsed: RetrievedChunk[] = [];
  let accumulatedChars = 0;
  let formattedText = "";

  for (let i = 0; i < uniqueChunks.length; i++) {
    const chunk = uniqueChunks[i];
    const fileName = chunk.fileName || "document.pdf";
    const chunkIndex = chunk.chunkIndex;
    const similarity = (chunk.similarity * 100).toFixed(1);

    const blockHeader = `[RAG SOURCE ${i + 1}]\nFile: ${fileName}\nChunk: ${chunkIndex}\nSimilarity: ${similarity}%\n\n`;
    const blockContent = `${chunk.content.trim()}\n\n`;
    const fullBlock = blockHeader + blockContent;

    if (accumulatedChars + fullBlock.length > maxCharacterBudget) {
      // If adding this entire block exceeds budget, stop adding lower-ranked chunks
      break;
    }

    formattedText += fullBlock;
    accumulatedChars += fullBlock.length;
    chunksUsed.push(chunk);
  }

  return {
    formattedPromptText: formattedText.trim(),
    chunksUsed,
    totalCharacters: accumulatedChars,
  };
}
