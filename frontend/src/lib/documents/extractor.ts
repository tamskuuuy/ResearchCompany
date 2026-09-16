import mammoth from "mammoth";

export interface ExtractedDocument {
  text: string;
  metadata: {
    characterCount: number;
    mimeType: string;
    pageCount?: number;
  };
}

export async function extractText(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractedDocument> {
  const normalizedMime = (mimeType || "").toLowerCase();
  const lowerName = (fileName || "").toLowerCase();

  // 1. PDF Documents
  if (normalizedMime === "application/pdf" || lowerName.endsWith(".pdf")) {
    try {
      // Lazy load pdf-parse dynamically to avoid module evaluation polyfill issues on Next.js server build
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const pdfData = await pdfParse(fileBuffer);
      const text = pdfData.text || "";
      if (!text.trim()) {
        throw new Error("Unable to extract readable text from PDF. Document may contain scanned images without OCR.");
      }
      return {
        text,
        metadata: {
          characterCount: text.length,
          mimeType: "application/pdf",
          pageCount: pdfData.numpages || undefined,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse PDF document.";
      throw new Error(msg);
    }
  }

  // 2. DOCX / DOC Documents
  if (
    normalizedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalizedMime === "application/msword" ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc")
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = result.value || "";
      if (!text.trim()) {
        throw new Error("Unable to extract text from Word document. File may be blank or contain unparseable elements.");
      }
      return {
        text,
        metadata: {
          characterCount: text.length,
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse Word document.";
      throw new Error(msg);
    }
  }

  // 3. Plain Text Documents
  if (normalizedMime === "text/plain" || lowerName.endsWith(".txt")) {
    const text = fileBuffer.toString("utf-8");
    return {
      text,
      metadata: {
        characterCount: text.length,
        mimeType: "text/plain",
      },
    };
  }

  // 4. CSV Spreadsheets
  if (normalizedMime === "text/csv" || lowerName.endsWith(".csv")) {
    const text = fileBuffer.toString("utf-8");
    return {
      text,
      metadata: {
        characterCount: text.length,
        mimeType: "text/csv",
      },
    };
  }

  // 5. Unsupported Document Format
  throw new Error(`Unsupported document format for text extraction (${mimeType || fileName}). Currently supported: PDF, DOCX, TXT, CSV.`);
}
