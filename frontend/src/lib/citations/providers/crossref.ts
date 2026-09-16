import {
  CitationProvider,
  CitationSearchOptions,
  NormalizedCitation,
  ProviderStatus,
  normalizeDoi,
} from "@/types/citation";

export class CrossrefProvider implements CitationProvider {
  id = "crossref";
  name = "Crossref";
  capabilities = {
    supportsSemanticSearch: false,
    supportsDoiLookup: true,
    requiresApiKey: false,
  };

  private baseUrl = "https://api.crossref.org/works";

  async search(options: CitationSearchOptions): Promise<{
    citations: NormalizedCitation[];
    totalResults: number;
    status: ProviderStatus;
    error?: string;
  }> {
    const { query, rows = 15, offset = 0, year, sortBy } = options;

    if (!query || !query.trim()) {
      return { citations: [], totalResults: 0, status: "available" };
    }

    const params = new URLSearchParams();
    params.set("query", query.trim());
    params.set("rows", rows.toString());
    params.set("offset", offset.toString());

    // Sort order mapping
    if (sortBy === "newest") {
      params.set("sort", "published");
      params.set("order", "desc");
    } else if (sortBy === "oldest") {
      params.set("sort", "published");
      params.set("order", "asc");
    } else {
      params.set("sort", "relevance");
    }

    // Year filter mapping
    if (year) {
      params.set("filter", `from-pub-date:${year}-01-01,until-pub-date:${year}-12-31`);
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
          error: `Crossref API request failed with status ${response.status}`,
        };
      }

      const data = await response.json();
      const message = data.message;
      const items = message?.items || [];
      const totalResults = message?.["total-results"] || 0;

      const citations: NormalizedCitation[] = items.map((item: any) => {
        const authorsList: string[] = (item.author || []).map((a: any) => {
          if (a.given && a.family) return `${a.given} ${a.family}`;
          if (a.family) return a.family;
          if (a.name) return a.name;
          return "Unknown Author";
        });

        const pubDateParts =
          item["published-print"]?.["date-parts"]?.[0] ||
          item["published-online"]?.["date-parts"]?.[0] ||
          item["issued"]?.["date-parts"]?.[0];

        const pubYear = pubDateParts ? pubDateParts[0] : null;

        const journalName =
          (item["container-title"] && item["container-title"][0]) ||
          (item["publisher"] ? item["publisher"] : null);

        const isOA = Boolean(
          item.is_oa ||
          (item.link && item.link.some((l: any) => l["intended-application"] === "text-mining"))
        );

        const rawDoi = item.DOI || null;
        const cleanDoi = normalizeDoi(rawDoi);

        return {
          provider: "crossref",
          providerId: cleanDoi || item.key || null,
          title: (item.title && item.title[0]) || "Untitled Document",
          authors: authorsList.length > 0 ? authorsList : ["Unknown Author"],
          publicationYear: pubYear,
          publicationDate: pubYear ? `${pubYear}-01-01` : null,
          journal: journalName,
          publisher: item.publisher || null,
          doi: cleanDoi,
          url: item.URL || (cleanDoi ? `https://doi.org/${cleanDoi}` : null),
          abstract: item.abstract ? item.abstract.replace(/<[^>]*>?/gm, "") : null,
          citationCount: item["is-referenced-by-count"] || 0,
          indexedSources: ["Crossref"],
          sourceProvider: "Crossref",
          externalId: cleanDoi || item.key || null,
          isOpenAccess: isOA,
          retrievedAt: new Date().toISOString(),
        };
      });

      return {
        citations,
        totalResults,
        status: "available",
      };
    } catch (err: any) {
      console.error("Crossref search error:", err);
      return {
        citations: [],
        totalResults: 0,
        status: "error",
        error: err?.message || "Crossref API unavailable.",
      };
    }
  }
}
