# Supabase Audit & Database Gap Analysis — ResearchCompany

**Date:** August 25, 2026  
**Status:** Audit Completed  
**Project:** ResearchCompany (Next.js 16 + Supabase SSR + TypeScript)  

---

## 1. Current Supabase Setup

The project includes an initial Supabase integration configured as follows:

* **Packages Installed:** `@supabase/ssr` (`^0.5.2`) and `@supabase/supabase-js` (`^2.49.1`).
* **Client Setup (`src/lib/supabase/`):**
  * `client.ts`: Browser client factory using `createBrowserClient`.
  * `server.ts`: Server client factory using `createServerClient` and Next.js `cookies()`.
  * `middleware.ts`: Session refresher and route guard using `createServerClient`.
* **Next.js Proxy (`src/proxy.ts`):** Next.js 16 request proxy wrapping `updateSession` to refresh auth cookies and enforce access rules on protected routes (`/dashboard`, `/assistant`, `/research`, `/citations`, `/messages`, `/schedule`, `/settings`, `/profile`).
* **Environment Configuration (`.env.local`):**
  * `NEXT_PUBLIC_SUPABASE_URL` is set to a valid Supabase project URL (`https://tnnkmbuqvknamrbwakpl.supabase.co`).
  * `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set to a valid publishable/anon JWT key.
  * `SUPABASE_SECRET_KEY` and `SUPABASE_JWKS_URL` are present in `.env.local`.

---

## 2. Authentication Status

* **Architecture:** Uses `@supabase/ssr` with Next.js App Router server/client boundary and cookie-based session management.
* **Authentication Provider (`src/context/AuthContext.tsx`):**
  * `login`: Calls `supabase.auth.signInWithPassword`.
  * `signup`: Calls `supabase.auth.signUp` with user metadata (`name`) and inserts a row into `public.profiles`.
  * `logout`: Calls `supabase.auth.signOut` and redirects to `/login`.
  * `session persistence & state`: Configured via `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()`.
* **Protected Routes Guard (`src/lib/supabase/middleware.ts` & `src/proxy.ts`):** Automatically redirects unauthenticated users targeting protected routes to `/login`, and redirects authenticated users accessing `/login` or `/signup` to `/dashboard`.
* **Fallback / Preview Auth Mode:** Includes a client-side simulation fallback when keys are unconfigured (`isConfigured === false`), allowing frontend preview without crashing.

---

## 3. Existing Database Tables

Inspecting local repository migration files (`database/`):
* Discovered migration file: `database/01_create_profiles_table.sql`.
* Only **1 database table** has a formal migration script in the codebase: `public.profiles`.

---

## 4. Required ResearchCompany Tables & Gap Analysis

Comparison of the intended ResearchCompany relational schema against what is currently defined in migration scripts and code:

| Component | Current State | Required Action |
| :--- | :--- | :--- |
| **Supabase Auth** | `EXISTS AND SUFFICIENT` | Functional SSR Auth structure present; verify production trigger handling. |
| **profiles** | `EXISTS BUT NEEDS MODIFICATION` | Migration script exists, but lacks `email`, `role`, and `bio` fields required by the user profile page. |
| **research_projects** | `MISSING` | Create table (`id`, `owner_id`, `title`, `description`, `status`, `created_at`, `updated_at`). |
| **folders** | `MISSING` | Create table (`id`, `project_id`, `name`, `parent_id`, `created_at`). |
| **files** | `MISSING` | Create table (`id`, `project_id`, `folder_id`, `user_id`, `name`, `file_path`, `size_bytes`, `mime_type`, `tags`, `vector_indexed`, `created_at`). |
| **citations** | `MISSING` | Create table (`id`, `project_id`, `user_id`, `title`, `authors`, `journal`, `year`, `doi`, `apa`, `bibtex`, `citation_count`, `created_at`). |
| **conversations** | `MISSING` | Create table (`id`, `project_id`, `user_id`, `title`, `created_at`, `updated_at`). |
| **messages** | `MISSING` | Create table (`id`, `conversation_id`, `sender_id`, `sender_type`, `text`, `created_at`). |
| **schedule_events** | `MISSING` | Create table (`id`, `project_id`, `user_id`, `title`, `description`, `category`, `due_date`, `status`, `created_at`). |
| **Storage** | `MISSING` | Create `research-files` storage bucket and set upload/view RLS policies. |
| **RLS** | `EXISTS BUT INCOMPLETE` | Only defined for `profiles`. RLS policies must be written for all 8 tables. |
| **Realtime** | `MISSING` | Enable Supabase Realtime publication on `messages` table. |
| **TypeScript DB types** | `MISSING` | Generate/define `database.types.ts` matching full database schema. |

---

## 5. RLS Status & Security Audit

* **Profiles Table (`public.profiles`):**
  * `RLS`: Enabled.
  * `SELECT`: Policy `"Public profiles are viewable by authenticated users."` (`auth.role() = 'authenticated'`).
  * `UPDATE`: Policy `"Users can update their own profile."` (`auth.uid() = user_id`).
  * `INSERT`: Policy `"Users can insert their own profile."` (`auth.uid() = user_id`).
* **Remaining Tables:**
  * No RLS policies exist yet because tables (`research_projects`, `folders`, `files`, `citations`, `conversations`, `messages`, `schedule_events`) have not been created in migration SQL scripts.
* **Intended Hierarchy for RLS Enforcement:**
  $$\text{auth.users} \rightarrow \text{profiles} \rightarrow \text{research\_projects (owner\_id)} \rightarrow \text{project resources}$$

---

## 6. Storage Status

* **Status:** No Storage buckets or policies are referenced in existing SQL files or client code.
* **Intended Bucket:** `research-files` for literature PDFs, datasets, protocol notes, and attachments.

---

## 7. Realtime Status

* **Status:** Supabase Realtime client listeners (`supabase.channel(...)`) are not yet integrated into the messaging UI (`src/app/messages/page.tsx`).
* **Required Action:** Enable Realtime on `public.messages` in future migration steps.

---

## 8. TypeScript Database Types Audit

* **Status:** No `database.types.ts`, `supabase.types.ts`, or `types/database.ts` file exists in the project.
* **Impact:** Database calls rely on string table names without TypeScript type safety.
* **Required Action:** Add strongly-typed definitions matching the 8 core tables.

---

## 9. Problems Found

1. **Missing Database Tables:** 7 out of 8 domain entities (`research_projects`, `folders`, `files`, `citations`, `conversations`, `messages`, `schedule_events`) only exist as client-side mock arrays in page components (`src/app/*/page.tsx`).
2. **Missing Database Types File:** TypeScript lacks generated/typed DB schemas.
3. **Double Profile Creation Risk:** `AuthContext.tsx` manually executes `supabase.from("profiles").insert(...)` during signup while `01_create_profiles_table.sql` also defines an `AFTER INSERT ON auth.users` trigger (`handle_new_user`). Manual insertion can produce primary key or unique constraint conflicts if the trigger fires simultaneously.
4. **Hardcoded UI Dashboard Data:** Dashboard metrics (storage usage: 1.2 GB, file count: 148, queries: 24, unread messages: 3) are static props.

---

## 10. Dashboard Dummy Data Audit

The following dashboard values currently use hardcoded mock data and should eventually be powered by Supabase queries:

* **User Name:** Hardcoded fallback, currently reads from `profile?.name` or `user.email`.
* **Storage Usage:** Static `"1.2 GB"`.
* **File Count:** Static `"148 Files stored"`.
* **Queries Count:** Static `"24 Queries processed this week"`.
* **Citations Count:** Static `"42 Saved"` and `"142 Papers"`.
* **Unread Messages:** Static `"3 Unread"`.
* **Active Projects:** Static `"8 Workspace Repos"`.

---

## 11. Recommended Next Task

**Task 03B — Complete Database Migration Script & TypeScript Types**
1. Draft `02_create_research_company_schema.sql` containing DDL for `research_projects`, `folders`, `files`, `citations`, `conversations`, `messages`, and `schedule_events` with appropriate foreign key relationships and CASCADE constraints.
2. Define Row Level Security (RLS) policies enforcing owner-based project isolation across all tables.
3. Add `src/types/database.ts` providing explicit TypeScript interfaces for Supabase operations.
