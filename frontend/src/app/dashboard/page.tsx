"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  Bot,
  FolderKanban,
  BookmarkCheck,
  MessageSquare,
  ArrowRight,
  Sparkles,
  PlayCircle,
  FileText,
  Clock,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const { user, profile } = useAuth();
  const supabase = createClient();

  const userName = profile?.name || user?.email?.split("@")[0] || "";

  useEffect(() => {
    async function getProjectsCount() {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from("research_projects")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id);

        if (!error && count !== null) {
          setProjectCount(count);
        }
      } catch (err) {
        console.error("Error fetching project count:", err);
      }
    }
    getProjectsCount();
  }, [user]);

  const dashboardCards = [
    {
      id: "assistant",
      title: "AI Assistant",
      description:
        "Contextual AI retrieval and synthesis across your papers, data notes, and citations.",
      icon: Bot,
      href: "/assistant",
      color: "bg-blue-50 text-[#0000CD]",
      badge: "Active",
      stats: "24 Queries processed this week",
    },
    {
      id: "files",
      title: "Research Files",
      description:
        "Centralized repository for datasets, PDF literature, experimental protocols, and lab logs.",
      icon: FolderKanban,
      href: "/research",
      color: "bg-indigo-50 text-indigo-600",
      badge: projectCount !== null ? `${projectCount} Projects` : "Projects List",
      stats: projectCount !== null ? `${projectCount} Active Research Projects` : "Manage projects & folders",
    },
    {
      id: "citations",
      title: "Citations",
      description:
        "Automated reference management, APA/MLA citation formatting, and BibTeX exporter.",
      icon: BookmarkCheck,
      href: "/citations",
      color: "bg-amber-50 text-[#FF7F00]",
      badge: "42 Saved",
      stats: "Last export 2 hours ago",
    },
    {
      id: "communication",
      title: "Communication",
      description:
        "User-to-user research discussion, peer review annotations, and team workspace chat.",
      icon: MessageSquare,
      href: "/messages",
      color: "bg-emerald-50 text-emerald-600",
      badge: "3 Unread",
      stats: "2 Active research channels",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-10 py-4">
        {/* Main Welcome Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4 pt-6 pb-2">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF2FF] border border-[#0000CD]/20 text-[#0000CD] text-xs font-semibold select-none"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF7F00]" />
            <span>Research Workspace Initialized</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-extrabold font-heading text-[#111111] tracking-tight"
          >
            Selamat Datang{userName ? `, ${userName}` : ""}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-600 leading-relaxed font-normal"
          >
            Welcome to your unified research environment. Select a workspace module below or explore your active research files, citations, and AI assistance.
          </motion.p>
        </section>

        {/* 4 Interactive Workspace Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <Card
                  interactive
                  hoverHighlight
                  className="h-full flex flex-col justify-between p-6 group transition-all duration-200 border-[#E5E7EB] hover:border-[#0000CD]/40"
                  onClick={() => setSelectedCard(card.id)}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.color} shadow-xs group-hover:scale-105 transition-transform duration-200`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <Badge variant={card.id === "citations" ? "accent" : "primary"}>
                        {card.badge}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold font-heading text-[#111111] group-hover:text-[#0000CD] transition-colors flex items-center gap-2">
                        {card.title}
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#0000CD]" />
                      </h3>
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {card.stats}
                    </span>
                    <Link
                      href={card.href}
                      className="font-semibold text-[#0000CD] hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open Module &rarr;
                    </Link>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </section>

        {/* Reserved Visual Area for Future Background Image / Video Showcase */}
        <section className="pt-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-[#0000CD]/90 text-white p-8 sm:p-10 border-0 shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,127,0,0.15),transparent_50%)] pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              <div className="lg:col-span-2 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold">
                  <PlayCircle className="w-4 h-4 text-[#FF7F00]" />
                  <span>Media Showcase Reserved Area</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                  Interactive Research Stream & Visual Analytics
                </h2>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
                  This section reserves a visual workspace area designed to display dynamic video demonstrations, live simulation renderings, or background research ambient visuals in future releases.
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <Button
                    variant="accent"
                    icon={<PlayCircle className="w-4 h-4" />}
                    onClick={() => setSelectedCard("showcase")}
                  >
                    Preview Showcase
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                    icon={<FileText className="w-4 h-4" />}
                    onClick={() => setSelectedCard("docs")}
                  >
                    Documentation
                  </Button>
                </div>
              </div>

              {/* Reserved Media Player Graphic Frame */}
              <div className="relative flex items-center justify-center">
                <div className="w-full aspect-video rounded-2xl bg-slate-950/60 border border-white/15 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center group hover:border-[#FF7F00]/50 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-[#FF7F00]/20 border border-[#FF7F00] flex items-center justify-center text-[#FF7F00] mb-3 group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">
                    Video Processing Placeholder
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    MP4 / WebM / HLS Feed Standby
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Quick Activity Overview Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0000CD] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block uppercase">
                Active Projects
              </span>
              <span className="text-xl font-bold font-heading text-[#111111]">
                {projectCount !== null ? `${projectCount} Projects` : "0 Projects"}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#FF7F00] flex items-center justify-center">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block uppercase">
                Verified Citations
              </span>
              <span className="text-xl font-bold font-heading text-[#111111]">
                142 Papers
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block uppercase">
                AI Index Status
              </span>
              <span className="text-xl font-bold font-heading text-[#111111]">
                Up to date
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Interactive Quick Modal for Cards */}
      <Modal
        isOpen={Boolean(selectedCard)}
        onClose={() => setSelectedCard(null)}
        title={
          selectedCard
            ? dashboardCards.find((c) => c.id === selectedCard)?.title ||
              "Module Quick View"
            : ""
        }
        description="Module quick overview and placeholder details."
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600 leading-relaxed">
            You clicked on the{" "}
            <strong className="text-[#0000CD]">
              {dashboardCards.find((c) => c.id === selectedCard)?.title ||
                selectedCard}
            </strong>{" "}
            card. The frontend shell is ready for future integration.
          </p>
          <div className="pt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSelectedCard(null)}>
              Close
            </Button>
            {selectedCard &&
              dashboardCards.find((c) => c.id === selectedCard)?.href && (
                <Link
                  href={
                    dashboardCards.find((c) => c.id === selectedCard)!.href
                  }
                >
                  <Button variant="primary">Navigate to Module</Button>
                </Link>
              )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
