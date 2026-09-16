import {
  CitationProvider,
  CitationSearchOptions,
  NormalizedCitation,
  ProviderStatus,
  normalizeDoi,
} from "@/types/citation";

export class ScopusProvider implements CitationProvider {
  id = "scopus";
  name = "Scopus";
  capabilities = {
    supportsSemanticSearch: false,
    supportsDoiLookup: true,
    requiresApiKey: true,
  };

  private baseUrl = "https://api.elsevier.com/content/search/scopus";

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
        error: "Scopus integration unavailable — API credentials not configured.",
      };
    }

    const { query, rows = 15, offset = 0, year } = options;

    if (!query || !query.trim()) {
      return { citations: [], totalResults: 0, status: "available" };
    }

    let qStr = `TITLE-ABS-KEY("${query.trim()}")`;
    if (year) {
      qStr += ` AND PUBYEAR IS ${year}`;
    }

    const params = new URLSearchParams({
      query: qStr,
      count: rows.toString(),
      start: offset.toString(),
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
        return {
          citations: [],
          totalResults: 0,
          status: response.status === 429 ? "rate_limited" : "error",
          error: `Scopus API request failed with status ${response.status}`,
        };
      }

      const data = await response.json();
      const searchResults = data["search-results"];
      const entries = searchResults?.entry || [];
      const totalResults = parseInt(searchResults?.["opensearch:totalResults"] || "0", 10);

      const citations: NormalizedCitation[] = entries.map((item: any) => {
        const creator = item["dc:creator"] || "Unknown Author";
        const cleanDoi = normalizeDoi(item["prism:doi"]);
        const citeCount = parseInt(item["citedby-count"] || "0", 10);

        return {
          provider: "scopus",
          providerId: item["dc:identifier"] || cleanDoi || null,
          title: item["dc:title"] || "Untitled Document",
          authors: [creator],
          publicationYear: item["prism:coverDate"] ? parseInt(item["prism:coverDate"].slice(0, 4), 10) : null,
          publicationDate: item["prism:coverDate"] || null,
          journal: item["prism:publicationName"] || "Scopus Indexed Journal",
          publisher: item["publisher"] || "Elsevier",
          documentType: item["subtypeDescription"] || "article",
          doi: cleanDoi,
          url: item.link?.find((l: any) => l["@ref"] === "scopus")?.["@href"] || (cleanDoi ? `https://doi.org/${cleanDoi}` : null),
          isOpenAccess: Boolean(item.openaccess === "1"),
          citationCount: citeCount,
          indexedSources: ["Scopus"],
          sourceProvider: "Scopus",
          externalId: item["dc:identifier"] || cleanDoi || null,
          retrievedAt: new Date().toISOString(),
          sourceMetadata: {
            eid: item["eid"],
            scopus_id: item["dc:identifier"],
          },
        };
      });

      return {
        citations,
        totalResults,
        status: "available",
      };
    } catch (err: any) {
      console.error("Scopus search error:", err);
      return {
        citations: [],
        totalResults: 0,
        status: "error",
        error: err?.message || "Scopus API unavailable.",
      };
    }
  }
}
