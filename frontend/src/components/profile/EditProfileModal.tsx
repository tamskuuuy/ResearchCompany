"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Profile } from "@/types/database";
import {
  User,
  Building,
  GraduationCap,
  Link as LinkIcon,
  Shield,
  BookOpen,
  Award,
  Save,
  Loader2,
  Plus,
  X,
  Globe,
  Github,
} from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSavedSuccess: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSavedSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<
    "identity" | "research" | "links" | "privacy"
  >("identity");

  // Identity Form State
  const [name, setName] = useState(profile?.name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [role, setRole] = useState(profile?.role || "Principal Investigator");
  const [bio, setBio] = useState(profile?.bio || "");
  const [institution, setInstitution] = useState(profile?.institution || "");
  const [department, setDepartment] = useState(profile?.department || "");
  const [academicLevel, setAcademicLevel] = useState(profile?.academic_level || "Faculty / Senior Scientist");
  const [location, setLocation] = useState(profile?.location || "");

  // Links & Socials State
  const [website, setWebsite] = useState(profile?.website || "");
  const [orcid, setOrcid] = useState(profile?.orcid || "");
  const [googleScholarUrl, setGoogleScholarUrl] = useState(profile?.google_scholar_url || "");
  const [researchgateUrl, setResearchgateUrl] = useState(profile?.researchgate_url || "");
  const [githubUrl, setGithubUrl] = useState(profile?.github_url || "");

  // Research Identity Tag Arrays State
  const [interests, setInterests] = useState<string[]>(profile?.research_interests || ["RAG Architectures", "NLP"]);
  const [skills, setSkills] = useState<string[]>(profile?.skills || ["PyTorch", "Next.js", "Vector DBs"]);
  const [newInterestInput, setNewInterestInput] = useState("");
  const [newSkillInput, setNewSkillInput] = useState("");

  // Privacy Options State
  const [visibility, setVisibility] = useState<"public" | "authenticated" | "private">(
    profile?.profile_visibility || "public"
  );
  const [showEmail, setShowEmail] = useState(profile?.show_email || false);
  const [showProjects, setShowProjects] = useState(profile?.show_projects ?? true);
  const [showAchievements, setShowAchievements] = useState(profile?.show_achievements ?? true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or profile prop changes
  React.useEffect(() => {
    if (isOpen && profile) {
      setName(profile.name || "");
      setUsername(profile.username || "");
      setRole(profile.role || "Principal Investigator");
      setBio(profile.bio || "");
      setInstitution(profile.institution || "");
      setDepartment(profile.department || "");
      setAcademicLevel(profile.academic_level || "Faculty / Senior Scientist");
      setLocation(profile.location || "");
      setWebsite(profile.website || "");
      setOrcid(profile.orcid || "");
      setGoogleScholarUrl(profile.google_scholar_url || "");
      setResearchgateUrl(profile.researchgate_url || "");
      setGithubUrl(profile.github_url || "");
      setInterests(profile.research_interests || ["RAG Architectures", "NLP"]);
      setSkills(profile.skills || ["PyTorch", "Next.js", "Vector DBs"]);
      setVisibility(profile.profile_visibility || "public");
      setShowEmail(profile.show_email || false);
      setShowProjects(profile.show_projects ?? true);
      setShowAchievements(profile.show_achievements ?? true);
    }
  }, [isOpen, profile]);

  const handleAddTag = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    setInput: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (value.trim() && !list.includes(value.trim())) {
      setList([...list, value.trim()]);
      setInput("");
    }
  };

  const handleRemoveTag = (
    tagToRemove: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList(list.filter((t) => t !== tagToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const targetName = name.trim() || profile?.name || "Researcher User";

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: targetName,
          username: username.trim() || undefined,
          role,
          bio: bio.trim(),
          institution: institution.trim(),
          department: department.trim(),
          academic_level: academicLevel,
          location: location.trim(),
          website: website.trim(),
          orcid: orcid.trim(),
          google_scholar_url: googleScholarUrl.trim(),
          researchgate_url: researchgateUrl.trim(),
          github_url: githubUrl.trim(),
          research_interests: interests,
          skills: skills,
          profile_visibility: visibility,
          show_email: showEmail,
          show_projects: showProjects,
          show_achievements: showAchievements,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      onSavedSuccess();
      onClose();
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(err?.message || "Failed to save profile modifications.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Researcher Portfolio"
      description="Customize academic identity, research domains, links, and privacy settings."
    >
      <form onSubmit={handleSave} className="space-y-4 py-2">
        {/* Navigation Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
          {[
            { id: "identity", label: "Identity", icon: User },
            { id: "research", label: "Research & Skills", icon: BookOpen },
            { id: "links", label: "Academic Links", icon: LinkIcon },
            { id: "privacy", label: "Privacy & Controls", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-[#0000CD] shadow-xs"
                    : "text-gray-500 hover:text-[#111111]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Tab 1: Identity */}
        {activeTab === "identity" && (
          <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold font-heading text-[#111111]">
                  Display Name *
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-heading text-[#111111]">
                  Username handle (@username)
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. elena_nlp"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold font-heading text-[#111111]">
                  Primary Role / Title
                </label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Principal Investigator, PhD Candidate"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-heading text-[#111111]">
                  Academic Level
                </label>
                <select
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
                >
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Faculty / Senior Scientist">Faculty / Senior Scientist</option>
                  <option value="Postdoctoral Researcher">Postdoctoral Researcher</option>
                  <option value="PhD Candidate / Doctoral Researcher">PhD Candidate</option>
                  <option value="Master's Researcher">Master's Researcher</option>
                  <option value="Undergraduate Researcher">Undergraduate Researcher</option>
                  <option value="Independent Researcher">Independent Researcher</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold font-heading text-[#111111]">
                  Institution / Organization
                </label>
                <Input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. MIT CSAIL, Stanford University"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold font-heading text-[#111111]">
                  Department / Lab
                </label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. AI & Language Processing Lab"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold font-heading text-[#111111]">
                Researcher Bio & Abstract
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
                placeholder="Brief summary of your research focus, methodology, and ongoing projects..."
              />
            </div>
          </div>
        )}

        {/* Tab 2: Research & Skills */}
        {activeTab === "research" && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {/* Research Interests Tags */}
            <div className="space-y-2">
              <label className="text-xs font-bold font-heading text-[#111111]">
                Research Interests & Fields
              </label>
              <div className="flex gap-2">
                <Input
                  value={newInterestInput}
                  onChange={(e) => setNewInterestInput(e.target.value)}
                  placeholder="Add domain (e.g. Machine Learning, RAG, BioInformatics)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag(newInterestInput, interests, setInterests, setNewInterestInput);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    handleAddTag(newInterestInput, interests, setInterests, setNewInterestInput)
                  }
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {interests.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF2FF] text-[#0000CD] text-xs font-semibold rounded-full border border-[#0000CD]/20"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag, interests, setInterests)}
                      className="hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Technical Skills & Methodologies */}
            <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
              <label className="text-xs font-bold font-heading text-[#111111]">
                Technical Skills & Tools
              </label>
              <div className="flex gap-2">
                <Input
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="Add skill (e.g. Python, PyTorch, Supabase, LaTeX)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag(newSkillInput, skills, setSkills, setNewSkillInput);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    handleAddTag(newSkillInput, skills, setSkills, setNewSkillInput)
                  }
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-[#FF7F00] text-xs font-semibold rounded-full border border-[#FF7F00]/20"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(skill, skills, setSkills)}
                      className="hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Academic Links */}
        {activeTab === "links" && (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="text-xs font-bold font-heading text-[#111111] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#0000CD]" />
                Personal / Lab Website
              </label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://lab.mit.edu/~elena"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold font-heading text-[#111111]">
                ORCID Identifier (0000-0000-0000-0000)
              </label>
              <Input
                value={orcid}
                onChange={(e) => setOrcid(e.target.value)}
                placeholder="0000-0002-1825-0097"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold font-heading text-[#111111]">
                Google Scholar Profile URL
              </label>
              <Input
                value={googleScholarUrl}
                onChange={(e) => setGoogleScholarUrl(e.target.value)}
                placeholder="https://scholar.google.com/citations?user=..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold font-heading text-[#111111]">
                ResearchGate Profile URL
              </label>
              <Input
                value={researchgateUrl}
                onChange={(e) => setResearchgateUrl(e.target.value)}
                placeholder="https://www.researchgate.net/profile/..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold font-heading text-[#111111] flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-gray-700" />
                GitHub Profile URL
              </label>
              <Input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
              />
            </div>
          </div>
        )}

        {/* Tab 4: Privacy & Visibility Controls */}
        {activeTab === "privacy" && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-heading text-[#111111]">
                Overall Profile Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
              >
                <option value="public">Public (Visible to anyone with your link)</option>
                <option value="authenticated">Authenticated (Visible only to ResearchCompany researchers)</option>
                <option value="private">Private (Only visible to you)</option>
              </select>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#E5E7EB]">
              <label className="text-xs font-bold font-heading text-[#111111] block">
                Section Level Privacy Toggles
              </label>

              <label className="flex items-center gap-3 text-xs font-medium text-[#111111] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEmail}
                  onChange={(e) => setShowEmail(e.target.checked)}
                  className="rounded text-[#0000CD] focus:ring-[#0000CD]"
                />
                <span>Display email address on public profile</span>
              </label>

              <label className="flex items-center gap-3 text-xs font-medium text-[#111111] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProjects}
                  onChange={(e) => setShowProjects(e.target.checked)}
                  className="rounded text-[#0000CD] focus:ring-[#0000CD]"
                />
                <span>Display active research projects on public profile</span>
              </label>

              <label className="flex items-center gap-3 text-xs font-medium text-[#111111] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAchievements}
                  onChange={(e) => setShowAchievements(e.target.checked)}
                  className="rounded text-[#0000CD] focus:ring-[#0000CD]"
                />
                <span>Display publication & achievement list on public profile</span>
              </label>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Modifications"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
