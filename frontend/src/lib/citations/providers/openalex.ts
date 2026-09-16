import {
  CitationProvider,
  CitationSearchOptions,
  NormalizedCitation,
  ProviderStatus,
  normalizeDoi,
} from "@/types/citation";

export class OpenAlexProvider implements CitationProvider {
  id = "openalex";
  name = "OpenAlex";
  capabilities = {
    supportsSemanticSearch: true,
    supportsDoiLookup: true,
    requiresApiKey: false,
  };

  private baseUrl = "https://api.openalex.org/works";

  async search(options: CitationSearchOptions): Promise<{
    citations: NormalizedCitation[];
    totalResults: number;
    status: ProviderStatus;
    error?: string;
  }> {
    const { query, rows = 15, offset = 0, year, openAccessOnly, sortBy } = options;

    if (!query || !query.trim()) {
      return { citations: [], totalResults: 0, status: "available" };
    }

    const params = new URLSearchParams();
    params.set("search", query.trim());
    params.set("per_page", rows.toString());
    if (offset > 0) {
      params.set("page", (Math.floor(offset / rows) + 1).toString());
    }

    // Filters
    const filters: string[] = [];
    if (year) filters.push(`publication_year:${year}`);
    if (openAccessOnly) filters.push("is_oa:true");
    if (filters.length > 0) {
      params.set("filter", filters.join(","));
    }

    // Sort order
    if (sortBy === "newest") {
      params.set("sort", "publication_date:desc");
    } else if (sortBy === "oldest") {
      params.set("sort", "publication_date:asc");
    } else if (sortBy === "cited") {
      params.set("sort", "cited_by_count:desc");
    }

    const url = `${this.baseUrl}?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "ResearchCompany/1.0 (mailto:admin@researchcompany.org)",
        },
      });

      if (!response.ok) {
        return {
          citations: [],
          totalResults: 0,
          status: response.status === 429 ? "rate_limited" : "error",
          error: `OpenAlex API request failed with status ${response.status}`,
        };
      }

      const data = await response.json();
      const results = data.results || [];
      const totalResults = data.meta?.count || 0;

      const citations: NormalizedCitation[] = results.map((item: any) => {
        const authorsList: string[] = (item.authorships || []).map((a: any) => {
          return a.author?.display_name || "Unknown Author";
        });

        const rawDoi = item.doi || null;
        const cleanDoi = normalizeDoi(rawDoi);
        const isOA = Boolean(item.open_access?.is_oa);
        const oaUrl = item.open_access?.oa_url || null;

        return {
          provider: "openalex",
          providerId: item.id || null,
          title: item.title || item.display_name || "Untitled Document",
          authors: authorsList.length > 0 ? authorsList : ["Unknown Author"],
          publicationYear: item.publication_year || null,
          publicationDate: item.publication_date || null,
          journal: item.primary_location?.source?.display_name || null,
          publisher: item.primary_location?.source?.publisher || null,
          documentType: item.type || "article",
          doi: cleanDoi,
          url: item.doi || item.id || null,
          openAccessUrl: oaUrl,
          isOpenAccess: isOA,
          citationCount: item.cited_by_count || 0,
          indexedSources: ["OpenAlex"],
          researchcompanyRelevance: item.relevance_score || 0,
          sourceProvider: "OpenAlex",
          externalId: item.id || cleanDoi || null,
          retrievedAt: new Date().toISOString(),
          sourceMetadata: {
            openalex_id: item.id,
            concepts: (item.concepts || []).slice(0, 3).map((c: any) => c.display_name),
          },
        };
      });

      return {
        citations,
        totalResults,
        status: "available",
      };
    } catch (err: any) {
      console.error("OpenAlex search error:", err);
      return {
        citations: [],
        totalResults: 0,
        status: "error",
        error: err?.message || "OpenAlex API unavailable.",
      };
    }
  }
}
