// ============================================================================
// src/lib/storage/inspection-storage.ts
// SIH PS26034 — Supabase Storage Integration for Private Inspection Images
//
// SECURITY GUARANTEE:
//   - Bucket 'inspection-images' is strictly PRIVATE.
//   - All read access must be performed via authenticated signed URLs.
//   - Never exposes public URLs.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export const INSPECTION_IMAGES_BUCKET = 'inspection-images';

type StorageClient = Pick<SupabaseClient, 'storage'>;

/**
 * Generates an unguessable, structured storage path for an inspection image.
 * Format: {inspectionId}/{timestamp}-{randomUUID}.{ext}
 */
export function generateStoragePath(inspectionId: string, originalFilename: string): string {
  const sanitizedExt = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(sanitizedExt) ? sanitizedExt : 'jpg';
  const randomSuffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15);

  return `${inspectionId}/${Date.now()}-${randomSuffix}.${cleanExt}`;
}

/**
 * Uploads an image buffer directly to the private 'inspection-images' bucket.
 */
export async function uploadInspectionImageToStorage(
  supabase: StorageClient,
  storagePath: string,
  buffer: Uint8Array,
  contentType: string
): Promise<{ error: Error | null; path: string }> {
  const { error } = await supabase.storage
    .from(INSPECTION_IMAGES_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    return { error, path: '' };
  }

  return { error: null, path: storagePath };
}

/**
 * Generates an authenticated, time-limited signed URL for private image preview.
 * Default expiration: 1 hour (3600 seconds).
 */
export async function getSignedInspectionImageUrl(
  supabase: StorageClient,
  storagePath: string,
  expiresInSeconds = 3600
): Promise<{ signedUrl: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(INSPECTION_IMAGES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return { signedUrl: null, error: error || new Error('Failed to generate signed URL') };
  }

  return { signedUrl: data.signedUrl, error: null };
}

/**
 * Deletes an image from the private storage bucket (used on discard / cleanup).
 */
export async function deleteInspectionImageFromStorage(
  supabase: StorageClient,
  storagePath: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage
    .from(INSPECTION_IMAGES_BUCKET)
    .remove([storagePath]);

  return { error };
}
