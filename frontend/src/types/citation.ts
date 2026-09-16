export type ProviderStatus =
  | "available"
  | "unavailable"
  | "rate_limited"
  | "timeout"
  | "error"
  | "not_configured";

export interface NormalizedCitation {
  id?: string;
  provider: string; // e.g. "openalex", "crossref", "core", "ieee", "scopus", "sciencedirect"
  providerId?: string | null;
  title: string;
  authors: string[];
  abstract?: string | null;
  publicationDate?: string | null;
  publicationYear: number | null;
  journal?: string | null;
  publisher?: string | null;
  documentType?: string | null;
  doi?: string | null;
  url?: string | null;
  openAccessUrl?: string | null;
  isOpenAccess?: boolean;
  citationCount?: number;
  indexedSources: string[];
  researchcompanyRelevance?: number;
  retrievedAt?: string;
  sourceMetadata?: Record<string, unknown>;
  
  // Legacy fields for backward compatibility
  sourceProvider?: string;
  externalId?: string | null;
}

export interface CitationSearchOptions {
  query: string;
  rows?: number;
  offset?: number;
  year?: number | null;
  openAccessOnly?: boolean;
  sortBy?: "relevance" | "newest" | "oldest" | "cited";
  providerFilter?: string;
}

export interface ProviderDiagnostic {
  provider: string;
  status: ProviderStatus;
  resultCount: number;
  error?: string;
  executionTimeMs?: number;
}

export interface CitationSearchResult {
  citations: NormalizedCitation[];
  totalResults: number;
  diagnostics: ProviderDiagnostic[];
}

export interface CitationProvider {
  id: string;
  name: string;
  capabilities: {
    supportsSemanticSearch: boolean;
    supportsDoiLookup: boolean;
    requiresApiKey: boolean;
  };
  search(options: CitationSearchOptions): Promise<{
    citations: NormalizedCitation[];
    totalResults: number;
    status: ProviderStatus;
    error?: string;
  }>;
}

/**
 * DOI Normalization utility:
 * Strips http://, https://, doi.org/, and lowercases.
 */
export function normalizeDoi(rawDoi?: string | null): string | null {
  if (!rawDoi) return null;
  let clean = rawDoi.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
  return clean || null;
}

/**
 * Title & Author Normalization for Deduplication
 */
export function buildDeduplicationKey(citation: Partial<NormalizedCitation>): string {
  const doiClean = normalizeDoi(citation.doi);
  if (doiClean) return `doi:${doiClean}`;

  const cleanTitle = (citation.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const firstAuthor = Array.isArray(citation.authors) && citation.authors.length > 0
    ? citation.authors[0].toLowerCase().replace(/[^a-z0-9]/g, "")
    : "unknown";

  const year = citation.publicationYear || "0000";

  return `title:${cleanTitle}_author:${firstAuthor}_year:${year}`;
}

/**
 * APA Citation Formatter
 */
export function formatAPA(citation: {
  authors?: string[] | string;
  publicationYear?: number | string | null;
  year?: string | number | null;
  title: string;
  journal?: string | null;
  doi?: string | null;
}): string {
  let authorsList = "";
  if (Array.isArray(citation.authors)) {
    if (citation.authors.length === 0) authorsList = "Unknown Author";
    else if (citation.authors.length === 1) authorsList = citation.authors[0];
    else if (citation.authors.length <= 3) authorsList = citation.authors.join(", ");
    else authorsList = `${citation.authors[0]} et al.`;
  } else if (typeof citation.authors === "string") {
    authorsList = citation.authors;
  } else {
    authorsList = "Unknown Author";
  }

  const yearVal = citation.publicationYear || citation.year || "n.d.";
  const journalVal = citation.journal ? ` ${citation.journal}.` : "";
  const doiClean = normalizeDoi(citation.doi);
  const doiVal = doiClean ? ` https://doi.org/${doiClean}` : "";

  return `${authorsList} (${yearVal}). ${citation.title}.${journalVal}${doiVal}`;
}

/**
 * IEEE Citation Formatter
 */
export function formatIEEE(citation: {
  authors?: string[] | string;
  title: string;
  journal?: string | null;
  publicationYear?: number | string | null;
  year?: string | number | null;
  doi?: string | null;
}): string {
  let authorsList = "";
  if (Array.isArray(citation.authors)) {
    authorsList = citation.authors.join(", ");
  } else if (typeof citation.authors === "string") {
    authorsList = citation.authors;
  } else {
    authorsList = "Author";
  }

  const yearVal = citation.publicationYear || citation.year || "";
  const journalVal = citation.journal ? `, ${citation.journal}` : "";
  const yearStr = yearVal ? `, ${yearVal}` : "";
  const doiClean = normalizeDoi(citation.doi);
  const doiVal = doiClean ? `, doi: ${doiClean}` : "";

  return `${authorsList}, "${citation.title}"${journalVal}${yearStr}${doiVal}.`;
}

/**
 * BibTeX Formatter
 */
export function formatBibTeX(citation: {
  id?: string;
  title: string;
  authors?: string[] | string;
  journal?: string | null;
  publicationYear?: number | string | null;
  year?: string | number | null;
  doi?: string | null;
  publisher?: string | null;
}): string {
  const cleanTitle = (citation.title || "Untitled").replace(/[{}]/g, "");
  const firstAuthor = Array.isArray(citation.authors)
    ? citation.authors[0]?.split(" ").pop()?.toLowerCase() || "author"
    : "author";
  const yearVal = citation.publicationYear || citation.year || "2026";
  const citeKey = `${firstAuthor.toLowerCase()}${yearVal}${cleanTitle.split(" ")[0].toLowerCase()}`;

  let authorsStr = "";
  if (Array.isArray(citation.authors)) {
    authorsStr = citation.authors.join(" and ");
  } else if (typeof citation.authors === "string") {
    authorsStr = citation.authors;
  }

  const doiClean = normalizeDoi(citation.doi);

  let bib = `@article{${citeKey},\n`;
  bib += `  title={${cleanTitle}},\n`;
  if (authorsStr) bib += `  author={${authorsStr}},\n`;
  if (citation.journal) bib += `  journal={${citation.journal}},\n`;
  if (citation.publisher) bib += `  publisher={${citation.publisher}},\n`;
  bib += `  year={${yearVal}}`;
  if (doiClean) bib += `,\n  doi={${doiClean}}`;
  bib += `\n}`;

  return bib;
}
