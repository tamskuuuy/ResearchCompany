"use client";

import React, { useState, useEffect, use } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Profile, ResearchAchievement, ResearchProject } from "@/types/database";
import {
  Building,
  Mail,
  ExternalLink,
  Globe,
  Github,
  BookOpen,
  Award,
  Lock,
  FolderKanban,
  CheckCircle2,
  Loader2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = use(params);
  const username = resolvedParams.username;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<ResearchAchievement[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Researcher profile not found.");
        }

        setProfile(data.profile);
        setProjects(data.projects || []);
        setAchievements(data.achievements || []);
        setIsOwner(data.isOwner || false);
      } catch (err: any) {
        console.error("Public profile fetch error:", err);
        setError(err?.message || "Failed to load profile.");
      } finally {
        setIsLoading(false);
      }
    };

    if (username) {
      fetchPublicProfile();
    }
  }, [username]);

  if (isLoading) {
    return (
      <AppLayout>
        <Card className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#0000CD]" />
          <span>Loading researcher portfolio...</span>
        </Card>
      </AppLayout>
    );
  }

  if (error || !profile) {
    return (
      <AppLayout>
        <Card className="p-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold font-heading text-[#111111]">
            Profile Unavailable
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">{error}</p>
        </Card>
      </AppLayout>
    );
  }

  const userName = profile.name;
  const roleName = profile.role || "Principal Investigator";

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={`${userName}`}
          description={`Public Academic Portfolio & Research Identity`}
          badge={<Badge variant="accent">Verified Portfolio</Badge>}
        />

        {/* Profile Banner */}
        <Card className="p-8 border-[#E5E7EB] bg-gradient-to-r from-white via-blue-50/40 to-amber-50/20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar name={userName} status="online" size="lg" className="w-24 h-24 text-3xl shadow-md border-2 border-white" />

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold font-heading text-[#111111]">
                  {userName}
                </h2>
                {profile.username && (
                  <span className="text-xs font-semibold text-[#0000CD] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                    @{profile.username}
                  </span>
                )}
                <Badge variant="primary">{roleName}</Badge>
              </div>

              <p className="text-sm text-gray-700 font-medium max-w-3xl">
                {profile.bio || "No abstract provided."}
              </p>

              <div className="flex flex-wrap gap-4 text-xs text-gray-600 pt-2">
                {profile.institution && (
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Building className="w-4 h-4 text-[#0000CD]" />
                    {profile.institution} {profile.department ? `— ${profile.department}` : ""}
                  </span>
                )}
                {profile.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> {profile.email}
                  </span>
                )}
              </div>

              {/* Links Bar */}
              <div className="flex flex-wrap gap-2 pt-3">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-xs font-bold text-[#111111] rounded-xl border border-[#E5E7EB]"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#0000CD]" /> Website
                  </a>
                )}
                {profile.orcid && (
                  <a
                    href={`https://orcid.org/${profile.orcid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-xs font-bold text-emerald-800 rounded-xl border border-emerald-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ORCID: {profile.orcid}
                  </a>
                )}
                {profile.google_scholar_url && (
                  <a
                    href={profile.google_scholar_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-xs font-bold text-[#0000CD] rounded-xl border border-blue-200"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Scholar
                  </a>
                )}
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-xs font-bold text-white rounded-xl"
                  >
                    <Github className="w-3.5 h-3.5" /> GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Research Domains & Skills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 border-[#E5E7EB] space-y-3">
            <h3 className="text-base font-bold font-heading text-[#111111] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0000CD]" />
              Research Domains
            </h3>
            <div className="flex flex-wrap gap-2">
              {(profile.research_interests || []).map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-[#EEF2FF] text-[#0000CD] text-xs font-semibold rounded-full border border-[#0000CD]/20"
                >
                  {interest}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-6 border-[#E5E7EB] space-y-3">
            <h3 className="text-base font-bold font-heading text-[#111111] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FF7F00]" />
              Technical Stack & Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {(profile.skills || []).map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-amber-50 text-[#FF7F00] text-xs font-semibold rounded-full border border-[#FF7F00]/20"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* Publications & Achievements */}
        {achievements.length > 0 && (
          <Card className="p-6 border-[#E5E7EB] space-y-4">
            <h3 className="text-base font-bold font-heading text-[#111111] flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
              <Award className="w-5 h-5 text-[#0000CD]" />
              Featured Publications & Awards
            </h3>

            <div className="space-y-3">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="p-4 rounded-xl bg-gray-50 border border-[#E5E7EB] flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold font-heading text-[#111111]">
                      {ach.title}
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      {ach.venue_or_issuer || "Academic Record"} {ach.year ? `• ${ach.year}` : ""}
                    </p>
                  </div>
                  {ach.url && (
                    <a
                      href={ach.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-gray-500 hover:text-[#0000CD] rounded-lg"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
