/**
 * Conservative text cleaner that normalizes line endings, removes null bytes,
 * collapses excessive blank lines, and preserves paragraph structure.
 */
export function cleanText(rawText: string): string {
  if (!rawText) return "";

  return rawText
    // 1. Remove null bytes and non-printable control characters (except tab and newlines)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // 2. Normalize Windows/Mac line endings to standard LF
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // 3. Remove trailing whitespace on each line
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    // 4. Collapse 3+ consecutive newlines into 2 (preserving clean double-spaced paragraph breaks)
    .replace(/\n{3,}/g, "\n\n")
    // 5. Trim leading and trailing document whitespace
    .trim();
}
