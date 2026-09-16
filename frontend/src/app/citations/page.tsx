"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { SaveCitationModal } from "@/components/citations/SaveCitationModal";
import { CitationDetailModal } from "@/components/citations/CitationDetailModal";
import { CitationNotesModal } from "@/components/citations/CitationNotesModal";
import { ConfirmDialog } from "@/components/research/ConfirmDialog";
import { NormalizedCitation, ProviderDiagnostic, formatAPA, formatIEEE, formatBibTeX } from "@/types/citation";
import { Citation, ResearchProject } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  BookmarkCheck,
  Search,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  Download,
  Trash2,
  Edit3,
  Loader2,
  Globe,
  FileCode2,
  Eye,
  ShieldCheck,
  Activity,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";

export default function CitationsPage() {
  const [activeTab, setActiveTab] = useState<"search" | "saved">("search");

  // Search literature states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NormalizedCitation[]>([]);
  const [diagnostics, setDiagnostics] = useState<ProviderDiagnostic[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"relevance" | "newest" | "oldest" | "cited">("relevance");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [openAccessOnly, setOpenAccessOnly] = useState(false);

  const [resultLimit, setResultLimit] = useState<number>(30);

  // Saved citations states
  const [savedCitations, setSavedCitations] = useState<Citation[]>([]);
  const [userProjects, setUserProjects] = useState<ResearchProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [savedSearchQuery, setSavedSearchQuery] = useState("");
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [savedStyleFormat, setSavedStyleFormat] = useState<"APA" | "IEEE">("APA");

  // Action Modals
  const [selectedCitationForDetail, setSelectedCitationForDetail] = useState<NormalizedCitation | null>(null);
  const [selectedCitationForSave, setSelectedCitationForSave] = useState<NormalizedCitation | null>(null);
  const [selectedCitationForNotes, setSelectedCitationForNotes] = useState<Citation | null>(null);
  const [deleteTargetCitation, setDeleteTargetCitation] = useState<Citation | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { user } = useAuth();
  const supabase = createClient();

  // Load user projects and saved citations
  const fetchSavedData = async () => {
    if (!user) return;
    setIsLoadingSaved(true);
    try {
      // 1. Fetch user research projects
      const { data: projData } = await supabase
        .from("research_projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("title");

      setUserProjects(projData || []);

      // 2. Fetch saved citations
      let query = supabase
        .from("citations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (selectedProjectId !== "all") {
        query = query.eq("project_id", selectedProjectId);
      }

      const { data: citData, error: citErr } = await query;
      if (citErr) throw citErr;
      setSavedCitations(citData || []);
    } catch (err: any) {
      console.error("Error fetching saved citations:", err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    fetchSavedData();
  }, [user, selectedProjectId]);

  // Execute Federated Scholarly Search via Next.js API Route
  const handleExecuteSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams({
        query: searchQuery.trim(),
        sortBy,
        rows: resultLimit.toString(),
      });
      if (selectedYear) params.set("year", selectedYear);
      if (openAccessOnly) params.set("openAccess", "true");

      const res = await fetch(`/api/citations/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch scholarly publications from federated providers.");
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSearchResults(data.citations || []);
      setTotalResults(data.totalResults || 0);
      setDiagnostics(data.diagnostics || []);
    } catch (err: any) {
      console.error("Federated scholarly search error:", err);
      setSearchError(err?.message || "Citation service is temporarily unavailable.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() && activeTab === "search") {
      handleExecuteSearch();
    }
  }, [sortBy, selectedYear, openAccessOnly, resultLimit]);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportBibTeXBundle = () => {
    if (savedCitations.length === 0) return;
    const bibtexBundle = savedCitations
      .map((c) => c.bibtex || formatBibTeX({ title: c.title, authors: c.authors, year: c.year, journal: c.journal, doi: c.doi }))
      .join("\n\n");

    const blob = new Blob([bibtexBundle], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-citations-${new Date().toISOString().slice(0, 10)}.bib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmDeleteCitation = async () => {
    if (!deleteTargetCitation) return;
    try {
      const { error: delErr } = await supabase
        .from("citations")
        .delete()
        .eq("id", deleteTargetCitation.id);

      if (delErr) throw delErr;
      await fetchSavedData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete saved citation.");
    } finally {
      setDeleteTargetCitation(null);
    }
  };

  const filteredSavedCitations = savedCitations.filter(
    (c) =>
      c.title.toLowerCase().includes(savedSearchQuery.toLowerCase()) ||
      c.authors.toLowerCase().includes(savedSearchQuery.toLowerCase()) ||
      (c.doi && c.doi.toLowerCase().includes(savedSearchQuery.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Federated Scholarly Citation Search"
          description="Search non-fictitious academic literature across OpenAlex, Crossref, CORE, IEEE, Scopus, and ScienceDirect with deduplication and provenance tracking."
          badge={<Badge variant="accent">{savedCitations.length} Saved Citations</Badge>}
          actions={
            <div className="flex items-center gap-3">
              {savedCitations.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleExportBibTeXBundle}
                >
                  Export BibTeX (.bib)
                </Button>
              )}
            </div>
          }
        />

        {/* Tab Selector */}
        <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-2">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-heading transition-colors flex items-center gap-2 ${
              activeTab === "search"
                ? "bg-[#0000CD] text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-[#E5E7EB]"
            }`}
          >
            <Search className="w-4 h-4" /> Search Scholarly Literature
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-heading transition-colors flex items-center gap-2 ${
              activeTab === "saved"
                ? "bg-[#0000CD] text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-[#E5E7EB]"
            }`}
          >
            <BookmarkCheck className="w-4 h-4" /> Saved Citations ({savedCitations.length})
          </button>
        </div>

        {/* TAB 1: FEDERATED SCHOLARLY SEARCH */}
        {activeTab === "search" && (
          <div className="space-y-6">
            {/* Search Input Bar & Controls */}
            <Card className="p-5 space-y-4 border-[#E5E7EB]">
              <form onSubmit={handleExecuteSearch} className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full">
                  <SearchInput
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClear={() => setSearchQuery("")}
                    placeholder="Search titles, authors, keywords, or DOI (e.g. YOLOv11 navigation)..."
                  />
                </div>
                <Button
                  variant="primary"
                  type="submit"
                  icon={isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? "Searching..." : "Search Literature"}
                </Button>
              </form>

              {/* Filters & Sorting */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5E7EB] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-600">Sort By:</span>
                  {(["relevance", "newest", "oldest", "cited"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-colors ${
                        sortBy === s
                          ? "bg-blue-50 text-[#0000CD] border border-[#0000CD]/30"
                          : "bg-white text-gray-600 border border-[#E5E7EB] hover:bg-gray-50"
                      }`}
                    >
                      {s === "relevance" ? "ResearchCompany Relevance" : s === "cited" ? "Most Cited" : s}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={openAccessOnly}
                      onChange={(e) => setOpenAccessOnly(e.target.checked)}
                      className="rounded text-[#0000CD] focus:ring-0"
                    />
                    <span>Open Access Only</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-600">Year:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-white border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 font-medium text-gray-700 focus:outline-none focus:border-[#0000CD]"
                    >
                      <option value="">All Years</option>
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                      <option value="2020">2020</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-600">Fetch Limit:</span>
                    <select
                      value={resultLimit}
                      onChange={(e) => setResultLimit(parseInt(e.target.value, 10))}
                      className="bg-white border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 font-medium text-gray-700 focus:outline-none focus:border-[#0000CD]"
                    >
                      <option value="15">15 per source</option>
                      <option value="30">30 per source</option>
                      <option value="50">50 per source</option>
                      <option value="100">100 per source</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Provider Status Diagnostics Header */}
            {diagnostics.length > 0 && (
              <div className="p-3 bg-gray-50 border border-[#E5E7EB] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-gray-600 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#0000CD]" /> Provider Status:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {diagnostics.map((d) => (
                    <span
                      key={d.provider}
                      className={`px-2.5 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1 ${
                        d.status === "available"
                          ? "bg-emerald-50 text-emerald-700"
                          : d.status === "not_configured"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-red-50 text-red-700"
                      }`}
                      title={d.error || `Retrieved ${d.resultCount} results in ${d.executionTimeMs}ms`}
                    >
                      {d.provider}: {d.status === "available" ? `${d.resultCount} hits` : d.status}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Results Output */}
            {searchError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 text-center">
                {searchError}
              </div>
            )}

            {isSearching ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#0000CD] animate-spin mx-auto" />
                <p className="text-xs font-medium text-gray-500">
                  Querying OpenAlex, Crossref, CORE, IEEE, Scopus & ScienceDirect APIs concurrently...
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-12 bg-white border border-[#E5E7EB] rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0000CD] flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-sm font-bold font-heading text-[#111111]">
                    {searchQuery ? "No verified scholarly results found" : "Search Federated Scholarly Literature"}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {searchQuery
                      ? "No verified provider records matched your search query. Try broadening your keywords."
                      : "Type keywords, paper titles, authors, or DOIs to search across multiple verified scholarly databases."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Found {totalResults.toLocaleString()} deduplicated scholarly records</span>
                </div>

                <div className="space-y-4">
                  {searchResults.map((cit, idx) => (
                    <motion.div
                      key={cit.doi || cit.providerId || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-5 space-y-3.5 border-[#E5E7EB] hover:border-[#0000CD]/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <h3
                              onClick={() => setSelectedCitationForDetail(cit)}
                              className="text-base font-bold font-heading text-[#111111] hover:text-[#0000CD] cursor-pointer transition-colors leading-snug"
                            >
                              {cit.title}
                            </h3>
                            <p className="text-xs font-semibold text-gray-600">
                              {cit.authors.join(", ")}
                            </p>
                            <p className="text-xs text-gray-500">
                              {cit.journal || "Journal / Conference"} {cit.publicationYear ? `(${cit.publicationYear})` : ""}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <Badge variant="primary" className="text-[10px]">
                              Relevance: {cit.researchcompanyRelevance || 50}
                            </Badge>
                            {cit.isOpenAccess && (
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                                Open Access
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Indexed Source Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Sources:
                          </span>
                          {cit.indexedSources.map((source) => (
                            <span
                              key={source}
                              className="px-2 py-0.5 bg-blue-50 text-[#0000CD] font-bold rounded-md text-[10px] border border-[#0000CD]/20"
                            >
                              {source}
                            </span>
                          ))}
                          {cit.citationCount ? (
                            <span className="text-[11px] text-gray-500 font-medium ml-2">
                              &bull; {cit.citationCount} Citations
                            </span>
                          ) : null}
                        </div>

                        {/* APA Quick Preview */}
                        <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-700 font-mono leading-relaxed flex items-center justify-between gap-3">
                          <span className="truncate">{formatAPA(cit)}</span>
                          <button
                            onClick={() => handleCopyText(`search-${idx}`, formatAPA(cit))}
                            className="p-1.5 bg-white border border-[#E5E7EB] text-gray-600 hover:text-[#0000CD] rounded-lg shrink-0"
                            title="Copy APA Citation"
                          >
                            {copiedId === `search-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Footer Controls */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          {cit.doi ? (
                            <a
                              href={`https://doi.org/${cit.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0000CD] hover:underline font-semibold flex items-center gap-1"
                            >
                              DOI: {cit.doi} <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-gray-400">No DOI available</span>
                          )}

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => setSelectedCitationForDetail(cit)}
                            >
                              Details & Provenance
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<BookmarkCheck className="w-3.5 h-3.5" />}
                              onClick={() => setSelectedCitationForSave(cit)}
                            >
                              Save to Project
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SAVED CITATIONS */}
        {activeTab === "saved" && (
          <div className="space-y-6">
            {/* Filter & Style Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E7EB]">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-full sm:w-60">
                  <SearchInput
                    value={savedSearchQuery}
                    onChange={(e) => setSavedSearchQuery(e.target.value)}
                    onClear={() => setSavedSearchQuery("")}
                    placeholder="Search saved citations..."
                  />
                </div>

                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#0000CD]"
                >
                  <option value="all">All Research Projects</option>
                  {userProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Style:</span>
                {(["APA", "IEEE"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSavedStyleFormat(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      savedStyleFormat === st
                        ? "bg-[#0000CD] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Saved List */}
            {isLoadingSaved ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#0000CD] animate-spin mx-auto" />
                <p className="text-xs font-medium text-gray-500">Loading saved project citations...</p>
              </div>
            ) : filteredSavedCitations.length === 0 ? (
              <div className="p-12 bg-white border border-[#E5E7EB] rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0000CD] flex items-center justify-center mx-auto">
                  <BookmarkCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-sm font-bold font-heading text-[#111111]">No saved citations found</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Search federated scholarly publications and click "Save to Project" to add them here.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => setActiveTab("search")}>
                  Search Literature Now
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSavedCitations.map((cit) => {
                  const projectObj = userProjects.find((p) => p.id === cit.project_id);
                  const formattedText =
                    savedStyleFormat === "APA"
                      ? cit.apa || formatAPA(cit)
                      : formatIEEE(cit);

                  return (
                    <motion.div key={cit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="p-5 space-y-3.5 border-[#E5E7EB] hover:border-[#0000CD]/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <h3 className="text-base font-bold font-heading text-[#111111] leading-snug">
                              {cit.title}
                            </h3>
                            <p className="text-xs font-semibold text-gray-600">{cit.authors}</p>
                            <p className="text-xs text-gray-500">
                              {cit.journal} {cit.year ? `(${cit.year})` : ""}
                            </p>
                          </div>

                          {projectObj && (
                            <Badge variant="primary" className="shrink-0 text-[10px]">
                              {projectObj.title}
                            </Badge>
                          )}
                        </div>

                        {/* Formatted Reference Box */}
                        <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-700 font-mono leading-relaxed flex items-center justify-between gap-3">
                          <span className="truncate">{formattedText}</span>
                          <button
                            onClick={() => handleCopyText(cit.id, formattedText)}
                            className="p-1.5 bg-white border border-[#E5E7EB] text-gray-600 hover:text-[#0000CD] rounded-lg shrink-0"
                            title="Copy Formatted Reference"
                          >
                            {copiedId === cit.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Private Notes Callout */}
                        {cit.notes && (
                          <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs text-amber-900 space-y-1">
                            <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider text-amber-800">
                              <Edit3 className="w-3 h-3" /> Private Notes:
                            </span>
                            <p className="leading-relaxed">{cit.notes}</p>
                          </div>
                        )}

                        {/* Footer Options */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          {cit.doi ? (
                            <a
                              href={`https://doi.org/${cit.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0000CD] hover:underline font-semibold flex items-center gap-1"
                            >
                              DOI: {cit.doi} <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-gray-400">No DOI</span>
                          )}

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Edit3 className="w-3.5 h-3.5" />}
                              onClick={() => setSelectedCitationForNotes(cit)}
                            >
                              {cit.notes ? "Edit Notes" : "Add Notes"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
                              onClick={() => setDeleteTargetCitation(cit)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <SaveCitationModal
        isOpen={Boolean(selectedCitationForSave)}
        onClose={() => setSelectedCitationForSave(null)}
        citation={selectedCitationForSave}
        projects={userProjects}
        onSavedSuccess={fetchSavedData}
      />

      <CitationDetailModal
        isOpen={Boolean(selectedCitationForDetail)}
        onClose={() => setSelectedCitationForDetail(null)}
        citation={selectedCitationForDetail}
        onSaveTrigger={(c) => setSelectedCitationForSave(c)}
      />

      <CitationNotesModal
        isOpen={Boolean(selectedCitationForNotes)}
        onClose={() => setSelectedCitationForNotes(null)}
        citation={selectedCitationForNotes}
        onSavedSuccess={fetchSavedData}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTargetCitation)}
        onClose={() => setDeleteTargetCitation(null)}
        onConfirm={handleConfirmDeleteCitation}
        title="Remove Saved Citation?"
        description={`Remove "${deleteTargetCitation?.title}" from your project references list? This will not affect external source journals.`}
        confirmText="Confirm Remove"
        isDangerous
      />
    </AppLayout>
  );
}
