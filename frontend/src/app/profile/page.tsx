"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { AddAchievementModal } from "@/components/profile/AddAchievementModal";
import { useAuth } from "@/context/AuthContext";
import { Profile, ResearchAchievement, ResearchProject } from "@/types/database";
import {
  Building,
  Mail,
  Edit3,
  ExternalLink,
  Globe,
  Github,
  BookOpen,
  Award,
  Plus,
  Trash2,
  Lock,
  FolderKanban,
  Shield,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { user } = useAuth();

  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<ResearchAchievement[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddAchModalOpen, setIsAddAchModalOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/profile");
      const data = await res.json();

      if (res.ok) {
        setProfileData(data.profile);
        setAchievements(data.achievements || []);
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleDeleteAchievement = async (id: string) => {
    try {
      const res = await fetch(`/api/profile/achievements?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAchievements((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete achievement:", err);
    }
  };

  const userName = profileData?.name || user?.email?.split("@")[0] || "Researcher User";
  const userEmail = user?.email || "researcher@institution.edu";
  const roleName = profileData?.role || "Principal Investigator";

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Researcher Portfolio & Identity"
          description="Manage academic profile, research interests, skills, achievements, and visibility controls."
          badge={
            profileData?.profile_visibility === "private" ? (
              <Badge variant="neutral">
                <Lock className="w-3 h-3 inline mr-1" /> Private Profile
              </Badge>
            ) : (
              <Badge variant="accent">Verified Researcher</Badge>
            )
          }
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={<Edit3 className="w-4 h-4" />}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Portfolio
            </Button>
          }
        />

        {isLoading ? (
          <Card className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#0000CD]" />
            <span>Loading researcher profile...</span>
          </Card>
        ) : (
          <>
            {/* Profile Banner */}
            <Card className="p-8 border-[#E5E7EB] bg-gradient-to-r from-white via-blue-50/40 to-amber-50/20 relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
                <Avatar name={userName} status="online" size="lg" className="w-24 h-24 text-3xl shadow-md border-2 border-white" />

                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold font-heading text-[#111111]">
                      {userName}
                    </h2>
                    {profileData?.username && (
                      <span className="text-xs font-semibold text-[#0000CD] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                        @{profileData.username}
                      </span>
                    )}
                    <Badge variant="primary">{roleName}</Badge>
                  </div>

                  <p className="text-sm text-gray-700 font-medium max-w-3xl">
                    {profileData?.bio || "No researcher bio provided yet. Click Edit Portfolio to add an abstract of your work."}
                  </p>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-600 pt-2">
                    {profileData?.institution && (
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Building className="w-4 h-4 text-[#0000CD]" />
                        {profileData.institution} {profileData.department ? `— ${profileData.department}` : ""}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> {userEmail}
                    </span>
                  </div>

                  {/* Academic Links Bar */}
                  <div className="flex flex-wrap gap-2 pt-3">
                    {profileData?.website && (
                      <a
                        href={profileData.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-xs font-bold text-[#111111] rounded-xl border border-[#E5E7EB] hover:border-[#0000CD] transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 text-[#0000CD]" /> Website
                      </a>
                    )}
                    {profileData?.orcid && (
                      <a
                        href={`https://orcid.org/${profileData.orcid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-xs font-bold text-emerald-800 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ORCID: {profileData.orcid}
                      </a>
                    )}
                    {profileData?.google_scholar_url && (
                      <a
                        href={profileData.google_scholar_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-xs font-bold text-[#0000CD] rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Scholar
                      </a>
                    )}
                    {profileData?.github_url && (
                      <a
                        href={profileData.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-xs font-bold text-white rounded-xl hover:bg-black transition-colors"
                      >
                        <Github className="w-3.5 h-3.5" /> GitHub
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Impact Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="p-5 border-[#E5E7EB] text-center space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Active Projects
                </span>
                <span className="text-3xl font-extrabold font-heading text-[#0000CD]">
                  {projects.length}
                </span>
              </Card>

              <Card className="p-5 border-[#E5E7EB] text-center space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Publications & Records
                </span>
                <span className="text-3xl font-extrabold font-heading text-[#111111]">
                  {achievements.length}
                </span>
              </Card>

              <Card className="p-5 border-[#E5E7EB] text-center space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Research Domains
                </span>
                <span className="text-3xl font-extrabold font-heading text-[#FF7F00]">
                  {profileData?.research_interests?.length || 0}
                </span>
              </Card>

              <Card className="p-5 border-[#E5E7EB] text-center space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Skills & Tools
                </span>
                <span className="text-3xl font-extrabold font-heading text-emerald-600">
                  {profileData?.skills?.length || 0}
                </span>
              </Card>
            </div>

            {/* Research Identity & Skills Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Research Interests */}
              <Card className="p-6 border-[#E5E7EB] space-y-3">
                <h3 className="text-base font-bold font-heading text-[#111111] flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#0000CD]" />
                    Research Interests & Fields
                  </span>
                  <Badge variant="primary">Primary Domains</Badge>
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(profileData?.research_interests || []).length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No research domains specified yet.</p>
                  ) : (
                    profileData?.research_interests?.map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-[#EEF2FF] text-[#0000CD] text-xs font-semibold rounded-full border border-[#0000CD]/20"
                      >
                        {interest}
                      </span>
                    ))
                  )}
                </div>
              </Card>

              {/* Technical Skills & Methods */}
              <Card className="p-6 border-[#E5E7EB] space-y-3">
                <h3 className="text-base font-bold font-heading text-[#111111] flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#FF7F00]" />
                    Skills, Tools & Methods
                  </span>
                  <Badge variant="accent">Technical Stack</Badge>
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(profileData?.skills || []).length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No technical skills added yet.</p>
                  ) : (
                    profileData?.skills?.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-amber-50 text-[#FF7F00] text-xs font-semibold rounded-full border border-[#FF7F00]/20"
                      >
                        {skill}
                      </span>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Research Achievements & Publications Section */}
            <Card className="p-6 border-[#E5E7EB] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <h3 className="text-base font-bold font-heading text-[#111111] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#0000CD]" />
                  Publications, Grants & Achievements
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsAddAchModalOpen(true)}
                >
                  Add Record
                </Button>
              </div>

              {achievements.length === 0 ? (
                <div className="p-8 text-center bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 space-y-2">
                  <Award className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs font-semibold text-gray-600">No achievements or publications recorded yet.</p>
                  <Button variant="ghost" size="sm" onClick={() => setIsAddAchModalOpen(true)}>
                    Add First Manuscript / Award
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-4 rounded-xl bg-gray-50/80 border border-[#E5E7EB] flex items-center justify-between gap-4 hover:bg-white transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold font-heading text-[#111111]">
                            {ach.title}
                          </h4>
                          <Badge variant="neutral" className="text-[10px] capitalize">
                            {ach.category}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {ach.venue_or_issuer || "Academic Record"} {ach.year ? `• ${ach.year}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {ach.url && (
                          <a
                            href={ach.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-gray-500 hover:text-[#0000CD] hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteAchievement(ach.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* Profile Edit Modal */}
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profileData}
          onSavedSuccess={fetchProfile}
        />

        {/* Add Achievement Modal */}
        <AddAchievementModal
          isOpen={isAddAchModalOpen}
          onClose={() => setIsAddAchModalOpen(false)}
          onAddedSuccess={fetchProfile}
        />
      </div>
    </AppLayout>
  );
}
