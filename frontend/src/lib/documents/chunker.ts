export interface GeneratedChunk {
  chunkIndex: number;
  content: string;
  characterCount: number;
}

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 150;

/**
 * Deterministic text chunker preserving paragraph structure and text continuity.
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): GeneratedChunk[] {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;

  if (!text || !text.trim()) {
    return [];
  }

  const cleanInput = text.trim();

  // If entire document fits inside one chunk size, return single chunk
  if (cleanInput.length <= chunkSize) {
    return [
      {
        chunkIndex: 0,
        content: cleanInput,
        characterCount: cleanInput.length,
      },
    ];
  }

  // Split into paragraphs to respect natural boundaries
  const paragraphs = cleanInput.split("\n\n");
  const chunks: GeneratedChunk[] = [];
  let currentChunkText = "";
  let chunkCounter = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    if (!paragraph) continue;

    // Handle oversized single paragraph (larger than chunkSize)
    if (paragraph.length > chunkSize) {
      // Flush current accumulator first
      if (currentChunkText.trim()) {
        chunks.push({
          chunkIndex: chunkCounter++,
          content: currentChunkText.trim(),
          characterCount: currentChunkText.trim().length,
        });
        currentChunkText = "";
      }

      // Slice giant paragraph into overlapping character segments
      let start = 0;
      while (start < paragraph.length) {
        const end = Math.min(start + chunkSize, paragraph.length);
        const slicedText = paragraph.slice(start, end).trim();

        if (slicedText) {
          chunks.push({
            chunkIndex: chunkCounter++,
            content: slicedText,
            characterCount: slicedText.length,
          });
        }

        if (end === paragraph.length) break;
        start += chunkSize - chunkOverlap;
      }
      continue;
    }

    // Check if adding this paragraph exceeds chunkSize
    if ((currentChunkText + "\n\n" + paragraph).length > chunkSize) {
      if (currentChunkText.trim()) {
        chunks.push({
          chunkIndex: chunkCounter++,
          content: currentChunkText.trim(),
          characterCount: currentChunkText.trim().length,
        });

        // Retain overlap tail for paragraph continuity
        const words = currentChunkText.split(/\s+/);
        const overlapWordCount = Math.max(1, Math.floor(chunkOverlap / 6));
        const overlapTail = words.slice(-overlapWordCount).join(" ");

        currentChunkText = overlapTail ? `${overlapTail}\n\n${paragraph}` : paragraph;
      } else {
        currentChunkText = paragraph;
      }
    } else {
      currentChunkText = currentChunkText
        ? `${currentChunkText}\n\n${paragraph}`
        : paragraph;
    }
  }

  // Flush remaining accumulator
  if (currentChunkText.trim()) {
    chunks.push({
      chunkIndex: chunkCounter++,
      content: currentChunkText.trim(),
      characterCount: currentChunkText.trim().length,
    });
  }

  return chunks;
}
