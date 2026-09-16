-- ResearchCompany Task 05: Storage Bucket & Storage Object RLS Policies
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Insert private research-files bucket into storage.buckets if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'research-files',
    'research-files',
    false, -- Private storage
    52428800, -- 50 MB limit in bytes
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800;

-- 2. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies on storage.objects for research-files if any
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can read their own research files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own research files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own research files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own research files" ON storage.objects;
END $$;

-- 4. Create Owner RLS Policies for research-files bucket (enforces user_id folder prefix)
CREATE POLICY "Users can read their own research files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'research-files' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload their own research files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'research-files' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own research files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'research-files' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own research files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'research-files' AND 
    auth.role() = 'authenticated' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
