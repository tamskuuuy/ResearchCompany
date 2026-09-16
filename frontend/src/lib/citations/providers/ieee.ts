import {
  CitationProvider,
  CitationSearchOptions,
  NormalizedCitation,
  ProviderStatus,
  normalizeDoi,
} from "@/types/citation";

export class IEEEXploreProvider implements CitationProvider {
  id = "ieee";
  name = "IEEE Xplore";
  capabilities = {
    supportsSemanticSearch: false,
    supportsDoiLookup: true,
    requiresApiKey: true,
  };

  private baseUrl = "https://ieeexploreapi.ieee.org/api/v1/search/articles";

  async search(options: CitationSearchOptions): Promise<{
    citations: NormalizedCitation[];
    totalResults: number;
    status: ProviderStatus;
    error?: string;
  }> {
    const apiKey = process.env.IEEE_XPLORE_API_KEY;

    if (!apiKey) {
      return {
        citations: [],
        totalResults: 0,
        status: "not_configured",
        error: "IEEE Xplore integration unavailable — API credentials not configured.",
      };
    }

    const { query, rows = 15, offset = 0, year } = options;

    if (!query || !query.trim()) {
      return { citations: [], totalResults: 0, status: "available" };
    }

    const params = new URLSearchParams({
      apikey: apiKey,
      format: "json",
      querytext: query.trim(),
      max_records: rows.toString(),
      start_record: (offset + 1).toString(),
    });

    if (year) {
      params.set("publication_year", year.toString());
    }

    const url = `${this.baseUrl}?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return {
          citations: [],
          totalResults: 0,
          status: response.status === 429 ? "rate_limited" : "error",
          error: `IEEE Xplore API request failed with status ${response.status}`,
        };
      }

      const data = await response.json();
      const articles = data.articles || [];
      const totalResults = data.total_records || 0;

      const citations: NormalizedCitation[] = articles.map((item: any) => {
        const authorsList: string[] = (item.authors?.authors || []).map(
          (a: any) => a.full_name || "Unknown Author"
        );
        const cleanDoi = normalizeDoi(item.doi);

        return {
          provider: "ieee",
          providerId: item.article_number || cleanDoi || null,
          title: item.title || "Untitled Document",
          authors: authorsList.length > 0 ? authorsList : ["Unknown Author"],
          publicationYear: item.publication_year ? parseInt(item.publication_year, 10) : null,
          publicationDate: item.publication_date || null,
          journal: item.publication_title || "IEEE Publication",
          publisher: item.publisher || "IEEE",
          documentType: item.content_type || "article",
          doi: cleanDoi,
          url: item.html_url || (cleanDoi ? `https://doi.org/${cleanDoi}` : null),
          openAccessUrl: item.access_type === "open" ? item.html_url : null,
          isOpenAccess: item.access_type === "open",
          citationCount: item.citing_paper_count ? parseInt(item.citing_paper_count, 10) : 0,
          indexedSources: ["IEEE Xplore"],
          sourceProvider: "IEEE Xplore",
          externalId: item.article_number || cleanDoi || null,
          retrievedAt: new Date().toISOString(),
          sourceMetadata: {
            article_number: item.article_number,
            isbn: item.isbn,
          },
        };
      });

      return {
        citations,
        totalResults,
        status: "available",
      };
    } catch (err: any) {
      console.error("IEEE Xplore search error:", err);
      return {
        citations: [],
        totalResults: 0,
        status: "error",
        error: err?.message || "IEEE Xplore API unavailable.",
      };
    }
  }
}
