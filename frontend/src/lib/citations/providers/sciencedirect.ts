import {
  CitationProvider,
  CitationSearchOptions,
  NormalizedCitation,
  ProviderStatus,
  normalizeDoi,
} from "@/types/citation";

export class ScienceDirectProvider implements CitationProvider {
  id = "sciencedirect";
  name = "ScienceDirect";
  capabilities = {
    supportsSemanticSearch: false,
    supportsDoiLookup: true,
    requiresApiKey: true,
  };

  private baseUrl = "https://api.elsevier.com/content/search/sciencedirect";

  async search(options: CitationSearchOptions): Promise<{
    citations: NormalizedCitation[];
    totalResults: number;
    status: ProviderStatus;
    error?: string;
  }> {
    const apiKey = process.env.ELSEVIER_API_KEY;

    if (!apiKey) {
      return {
        citations: [],
        totalResults: 0,
        status: "not_configured",
        error: "ScienceDirect integration unavailable — API credentials not configured.",
      };
    }

    const { query, rows = 15, offset = 0, year } = options;

const safeRows = Math.min(rows, 20);

    if (!query || !query.trim()) {
      return { citations: [], totalResults: 0, status: "available" };
    }

    let qStr = query.trim();
    if (year) {
      qStr += ` AND year(${year})`;
    }

const params = new URLSearchParams({
  query: qStr,
  count: safeRows.toString(),
  start: offset.toString(),
  view: "STANDARD",
});

    const url = `${this.baseUrl}?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          "X-ELS-APIKey": apiKey,
          Accept: "application/json",
        },
      });

   if (!response.ok) {
  const errorBody = await response.text();

  console.log("[ScienceDirect] HTTP status:", response.status);
  console.log("[ScienceDirect] Error body:", errorBody);

  let errDetail = `ScienceDirect API request failed with status ${response.status}`;
        try {
          const errJson = await response.json();
          const msg = errJson["error-response"]?.["error-message"] || errJson["service-error"]?.["status"]?.["statusText"];
          if (msg) errDetail = `ScienceDirect: ${msg} (${response.status})`;
        } catch (_) {}

        return {
          citations: [],
          totalResults: 0,
          status: response.status === 401 ? "not_configured" : response.status === 429 ? "rate_limited" : "error",
          error: errDetail,
        };
      }

      const data = await response.json();
      const searchResults = data["results"];
      const entries = searchResults || [];
      const totalResults = parseInt(data["resultsFound"] || "0", 10);

      const citations: NormalizedCitation[] = entries.map((item: any) => {
        const authorsList: string[] = (item.authors || []).map((a: any) => a.name || "Unknown Author");
        const cleanDoi = normalizeDoi(item.doi);

        return {
          provider: "sciencedirect",
          providerId: item.pii || cleanDoi || null,
          title: item.title || "Untitled Document",
          authors: authorsList.length > 0 ? authorsList : ["Unknown Author"],
          publicationYear: item.coverDate ? parseInt(item.coverDate.slice(0, 4), 10) : null,
          publicationDate: item.coverDate || null,
          journal: item.publicationTitle || "ScienceDirect Journal",
          publisher: "Elsevier",
          documentType: item.contentType || "article",
          doi: cleanDoi,
          url: item.uri || (cleanDoi ? `https://doi.org/${cleanDoi}` : null),
          openAccessUrl: item.openaccess ? item.uri : null,
          isOpenAccess: Boolean(item.openaccess),
          citationCount: 0,
          indexedSources: ["ScienceDirect"],
          sourceProvider: "ScienceDirect",
          externalId: item.pii || cleanDoi || null,
          retrievedAt: new Date().toISOString(),
          sourceMetadata: {
            pii: item.pii,
          },
        };
      });

      return {
        citations,
        totalResults,
        status: "available",
      };
    } catch (err: any) {
      console.error("ScienceDirect search error:", err);
      return {
        citations: [],
        totalResults: 0,
        status: "error",
        error: err?.message || "ScienceDirect API unavailable.",
      };
    }
  }
}
