import {
  CitationProvider,
  CitationSearchOptions,
  NormalizedCitation,
  ProviderStatus,
  normalizeDoi,
} from "@/types/citation";

export class COREProvider implements CitationProvider {
  id = "core";
  name = "CORE";
  capabilities = {
    supportsSemanticSearch: false,
    supportsDoiLookup: true,
    requiresApiKey: false,
  };

  private baseUrl = "https://api.core.ac.uk/v3/search/works/";

  async search(options: CitationSearchOptions): Promise<{
    citations: NormalizedCitation[];
    totalResults: number;
    status: ProviderStatus;
    error?: string;
  }> {
    const { query, rows = 15, offset = 0, year } = options;

    if (!query || !query.trim()) {
      return { citations: [], totalResults: 0, status: "available" };
    }

    let qStr = `title:(${query.trim()}) OR abstract:(${query.trim()})`;
    if (year) {
      qStr += ` AND year:${year}`;
    }

    const params = new URLSearchParams({
      q: qStr,
      limit: rows.toString(),
      offset: offset.toString(),
    });

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
          error: `CORE API request failed with status ${response.status}`,
        };
      }

      const data = await response.json();
      const results = data.results || [];
      const totalResults = data.totalHits || 0;

      const citations: NormalizedCitation[] = results.map((item: any) => {
        const authorsList: string[] = (item.authors || []).map((a: any) => {
          return typeof a === "string" ? a : a.name || "Unknown Author";
        });

        const cleanDoi = normalizeDoi(item.doi);
        const downloadUrl = item.downloadUrl || item.sourceFulltextUrls?.[0] || null;

        return {
          provider: "core",
          providerId: item.id?.toString() || null,
          title: item.title || "Untitled Document",
          authors: authorsList.length > 0 ? authorsList : ["Unknown Author"],
          publicationYear: item.year || null,
          publicationDate: item.publishedDate || (item.year ? `${item.year}-01-01` : null),
          journal: item.publisher || item.journals?.[0]?.title || null,
          publisher: item.publisher || null,
          documentType: item.documentType || "article",
          doi: cleanDoi,
          url: downloadUrl || (cleanDoi ? `https://doi.org/${cleanDoi}` : null),
          openAccessUrl: downloadUrl,
          isOpenAccess: Boolean(downloadUrl),
          citationCount: item.citationCount || 0,
          indexedSources: ["CORE"],
          sourceProvider: "CORE",
          externalId: item.id?.toString() || cleanDoi || null,
          retrievedAt: new Date().toISOString(),
          sourceMetadata: {
            core_id: item.id,
            repositories: item.repositories || [],
          },
        };
      });

      return {
        citations,
        totalResults,
        status: "available",
      };
    } catch (err: any) {
      console.error("CORE search error:", err);
      return {
        citations: [],
        totalResults: 0,
        status: "error",
        error: err?.message || "CORE API unavailable.",
      };
    }
  }
}
