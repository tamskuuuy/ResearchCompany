import { createClient } from "@/lib/supabase/client";

export const BUCKET_NAME = "research-files";
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "File is too large. Maximum size is 50 MB.",
    };
  }
  return { valid: true };
}

/**
 * Generate predictable, unique storage path:
 * user_id/project_id/folder_id_or_root/file_id-filename
 */
export function buildStoragePath(
  userId: string,
  projectId: string,
  folderId: string | null,
  fileId: string,
  fileName: string
): string {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const folderSegment = folderId || "root";
  return `${userId}/${projectId}/${folderSegment}/${fileId}-${sanitizedName}`;
}

export async function uploadFileToStorage(
  file: File,
  storagePath: string
): Promise<{ path?: string; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }
  return { path: data.path };
}

export async function getSignedDownloadUrl(
  storagePath: string,
  expiresInSeconds: number = 60
): Promise<{ signedUrl?: string; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    return { error: error.message };
  }
  return { signedUrl: data.signedUrl };
}

export async function deleteFileFromStorage(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
