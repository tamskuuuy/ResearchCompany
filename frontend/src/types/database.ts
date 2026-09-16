export type ProjectStatus = "active" | "archived" | "completed";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  institution?: string | null;
  department?: string | null;
  academic_level?: string | null;
  location?: string | null;
  website?: string | null;
  orcid?: string | null;
  google_scholar_url?: string | null;
  researchgate_url?: string | null;
  github_url?: string | null;
  research_interests?: string[];
  research_fields?: string[];
  skills?: string[];
  preferred_methods?: string[];
  profile_visibility?: "public" | "authenticated" | "private";
  show_email?: boolean;
  show_projects?: boolean;
  show_achievements?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResearchAchievement {
  id: string;
  user_id: string;
  title: string;
  venue_or_issuer?: string | null;
  year?: string | null;
  url?: string | null;
  category: "publication" | "award" | "grant" | "patent";
  created_at: string;
}

export interface ResearchProject {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  files_count?: number;
  citations_count?: number;
}

export interface Folder {
  id: string;
  project_id: string;
  parent_folder_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FileItem {
  id: string;
  project_id: string;
  folder_id: string | null;
  user_id: string;
  name: string;
  file_path: string;
  size_bytes: number;
  mime_type: string | null;
  tags: string[];
  vector_indexed: boolean;
  indexing_status?: "pending" | "processing" | "completed" | "failed" | null;
  indexing_error?: string | null;
  extracted_at?: string | null;
  indexed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  file_id: string;
  project_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  character_count: number;
  created_at: string;
  embedding?: number[] | null;
  embedding_model?: string | null;
  content_hash?: string | null;
}

export interface Citation {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  authors: string;
  journal: string | null;
  year: string | null;
  doi: string | null;
  apa: string | null;
  bibtex: string | null;
  citations_count: number;
  source_provider?: string | null;
  external_id?: string | null;
  publication_year?: number | null;
  publisher?: string | null;
  url?: string | null;
  abstract?: string | null;
  notes?: string | null;
  is_open_access?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: "user" | "ai";
  text: string;
  created_at: string;
}

export interface ResearchMilestone {
  id: string;
  project_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  target_date: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  _tempTarget?: string;
}

export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ResearchTask {
  id: string;
  project_id?: string | null;
  milestone_id?: string | null;
  created_by: string;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_at?: string | null;
  due_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  _tempStart?: string;
  _tempDue?: string;
  research_projects?: {
    id: string;
    title: string;
    status: string;
  } | null;
  research_milestones?: {
    id: string;
    title: string;
    target_date: string;
  } | null;
}

export interface ResearchReminder {
  id: string;
  user_id: string;
  task_id?: string | null;
  milestone_id?: string | null;
  reminder_at: string;
  sent_at?: string | null;
  created_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  actor_user_id?: string | null;
  type: string;
  title: string;
  message: string;
  conversation_id?: string | null;
  message_id?: string | null;
  research_project_id?: string | null;
  task_id?: string | null;
  milestone_id?: string | null;
  file_id?: string | null;
  read_at?: string | null;
  created_at: string;
  actor_profile?: {
    name: string;
    avatar_url?: string | null;
  } | null;
}

export interface UserSettings {
  id: string;
  user_id: string;
  default_project_visibility: "public" | "private" | "team";
  default_task_priority: TaskPriority;
  default_task_status: TaskStatus;
  default_citation_format: "APA" | "MLA" | "IEEE" | "Chicago";
  timezone: string;
  timeline_view: "DAY" | "WEEK" | "MONTH";
  ai_provider: "auto" | "openrouter" | "openai";
  ai_model: string;
  ai_temperature: number;
  retrieval_enabled: boolean;
  top_k: number;
  similarity_threshold: number;
  response_style: "concise" | "balanced" | "detailed";
  include_citations_by_default: boolean;
  prefer_project_context: boolean;
  notify_messages: boolean;
  notify_task_assignments: boolean;
  notify_deadlines: boolean;
  notify_milestones: boolean;
  in_app_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEvent {
  id: string;
  project_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  due_date: string | null;
  status: "upcoming" | "in-progress" | "completed";
  created_at: string;
  updated_at: string;
}

export interface CollaborationChannel {
  id: string;
  project_id: string | null;
  created_by: string;
  title: string;
  type: "dm" | "project_group";
  created_at: string;
  updated_at: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
}

export interface UserMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Profile>;
      };
      research_projects: {
        Row: ResearchProject;
        Insert: Omit<ResearchProject, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ResearchProject>;
      };
      folders: {
        Row: Folder;
        Insert: Omit<Folder, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Folder>;
      };
      files: {
        Row: FileItem;
        Insert: Omit<FileItem, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<FileItem>;
      };
      citations: {
        Row: Citation;
        Insert: Omit<Citation, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Citation>;
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Conversation>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Message>;
      };
      schedule_events: {
        Row: ScheduleEvent;
        Insert: Omit<ScheduleEvent, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ScheduleEvent>;
      };
      collaboration_channels: {
        Row: CollaborationChannel;
        Insert: Omit<CollaborationChannel, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CollaborationChannel>;
      };
      channel_members: {
        Row: ChannelMember;
        Insert: Omit<ChannelMember, "id" | "joined_at" | "last_read_at"> & {
          id?: string;
          joined_at?: string;
          last_read_at?: string;
        };
        Update: Partial<ChannelMember>;
      };
      user_messages: {
        Row: UserMessage;
        Insert: Omit<UserMessage, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<UserMessage>;
      };
    };
  };
}
