import {
  CitationProvider,
  CitationSearchOptions,
  CitationSearchResult,
  NormalizedCitation,
  ProviderDiagnostic,
  buildDeduplicationKey,
} from "@/types/citation";
import { OpenAlexProvider } from "./providers/openalex";
import { CrossrefProvider } from "./providers/crossref";
import { COREProvider } from "./providers/core";
import { IEEEXploreProvider } from "./providers/ieee";
import { ScopusProvider } from "./providers/scopus";
import { ScienceDirectProvider } from "./providers/sciencedirect";

export class CitationSearchService {
  private providers: CitationProvider[];

  constructor() {
    this.providers = [
      new OpenAlexProvider(),
      new CrossrefProvider(),
      new COREProvider(),
      new IEEEXploreProvider(),
      new ScopusProvider(),
      new ScienceDirectProvider(),
    ];
  }

  async searchAll(options: CitationSearchOptions): Promise<CitationSearchResult> {
    const { query, sortBy = "relevance" } = options;

    if (!query || !query.trim()) {
      return { citations: [], totalResults: 0, diagnostics: [] };
    }

    const diagnostics: ProviderDiagnostic[] = [];
    const rawCitations: NormalizedCitation[] = [];

    // Execute provider searches concurrently with 6s timeout wrapper
    const providerPromises = this.providers.map(async (p) => {
      const startTime = Date.now();
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Provider search timeout")), 6000)
        );

        const resultPromise = p.search(options);

        const res: any = await Promise.race([resultPromise, timeoutPromise]);

        const duration = Date.now() - startTime;
        diagnostics.push({
          provider: p.name,
          status: res.status || "available",
          resultCount: res.citations?.length || 0,
          error: res.error,
          executionTimeMs: duration,
        });

        if (res.citations && res.citations.length > 0) {
          rawCitations.push(...res.citations);
        }
      } catch (err: any) {
        const duration = Date.now() - startTime;
        diagnostics.push({
          provider: p.name,
          status: err?.message?.includes("timeout") ? "timeout" : "error",
          resultCount: 0,
          error: err?.message || "Execution error",
          executionTimeMs: duration,
        });
      }
    });

    await Promise.allSettled(providerPromises);

    // 1. Validate records (must have title AND DOI/URL/id)
    const validRecords = rawCitations.filter(
      (c) => c.title && c.title.trim().length > 3 && (c.doi || c.url || c.providerId)
    );

    // 2. Deduplicate using strong keys and merge indexedSources
    const deduplicatedMap = new Map<string, NormalizedCitation>();

    for (const record of validRecords) {
      const key = buildDeduplicationKey(record);

      if (deduplicatedMap.has(key)) {
        const existing = deduplicatedMap.get(key)!;
        // Merge indexedSources
        const mergedSources = Array.from(
          new Set([...existing.indexedSources, ...record.indexedSources])
        );

        // Keep highest citation count
        const highestCite = Math.max(existing.citationCount || 0, record.citationCount || 0);

        // Keep openAccessUrl if available
        const oaUrl = existing.openAccessUrl || record.openAccessUrl;

        deduplicatedMap.set(key, {
          ...existing,
          citationCount: highestCite,
          openAccessUrl: oaUrl,
          isOpenAccess: existing.isOpenAccess || record.isOpenAccess,
          indexedSources: mergedSources,
        });
      } else {
        deduplicatedMap.set(key, {
          ...record,
          indexedSources: [...record.indexedSources],
        });
      }
    }

    const mergedList = Array.from(deduplicatedMap.values());

    // 3. Compute unified ResearchCompany relevance score
    const scoredList = mergedList.map((c) => ({
      ...c,
      researchcompanyRelevance: this.calculateRelevance(c, query),
    }));

    // 4. Sort results based on selected search mode
    scoredList.sort((a, b) => {
      if (sortBy === "newest") {
        return (b.publicationYear || 0) - (a.publicationYear || 0);
      }
      if (sortBy === "oldest") {
        return (a.publicationYear || 0) - (b.publicationYear || 0);
      }
      if (sortBy === "cited") {
        return (b.citationCount || 0) - (a.citationCount || 0);
      }
      // Default: ResearchCompany relevance
      return (b.researchcompanyRelevance || 0) - (a.researchcompanyRelevance || 0);
    });

    return {
      citations: scoredList,
      totalResults: scoredList.length,
      diagnostics,
    };
  }

  private calculateRelevance(citation: NormalizedCitation, query: string): number {
    let score = citation.researchcompanyRelevance || 50;
    const qLower = query.toLowerCase();
    const tLower = citation.title.toLowerCase();

    // Exact title match bonus
    if (tLower.includes(qLower)) score += 30;

    // Multi-source indexing bonus
    score += (citation.indexedSources.length - 1) * 15;

    // Citation signal bonus
    if (citation.citationCount && citation.citationCount > 0) {
      score += Math.min(Math.log10(citation.citationCount) * 10, 25);
    }

    // Open access bonus
    if (citation.isOpenAccess) score += 5;

    return Math.round(score);
  }
}
