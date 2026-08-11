import { OperationTimeoutError, withTimeout } from "@/lib/server/with-timeout";
import {
  createServiceRoleSupabase,
  isUsingServerSecretKey,
} from "@/lib/supabase/server";

export const CONTACT_PHOTOS_BUCKET = "contact-photos";

const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

const CONTACT_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

const ALLOWED_MIME_TYPES = new Set<string>(CONTACT_PHOTO_MIME_TYPES);

export function isAllowedContactPhotoMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

function extensionForMimeType(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes("png")) return "png";
  if (lower.includes("webp")) return "webp";
  if (lower.includes("gif")) return "gif";
  if (lower.includes("heic") || lower.includes("heif")) return "heic";
  return "jpg";
}

function formatContactPhotoStorageError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("bucket not found")) {
    return (
      "Photo storage is not set up in Supabase yet. Open the SQL Editor and run " +
      "supabase/migrations/010_contact_avatar.sql, then try again."
    );
  }

  if (lower.includes("row-level security") || lower.includes("policy")) {
    if (!isUsingServerSecretKey()) {
      return (
        "Add SUPABASE_SECRET_KEY to .env.local (Supabase Dashboard → Settings → API → Secret key), " +
        "restart the dev server, then try again."
      );
    }

    return (
      "Photo storage permissions are missing. Run supabase/migrations/011_contact_photos_storage_fix.sql " +
      "in the Supabase SQL Editor, then try again."
    );
  }

  return `Could not upload photo: ${message}`;
}

export async function ensureContactPhotosBucket(): Promise<{
  ok: boolean;
  error?: string;
}> {
  let supabase;
  try {
    supabase = createServiceRoleSupabase();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Missing service role key";
    return { ok: false, error: message };
  }

  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (!listError) {
    const exists = buckets?.some(
      (bucket) =>
        bucket.id === CONTACT_PHOTOS_BUCKET ||
        bucket.name === CONTACT_PHOTOS_BUCKET
    );
    if (exists) return { ok: true };
  }

  const { error: createError } = await supabase.storage.createBucket(
    CONTACT_PHOTOS_BUCKET,
    {
      public: false,
      fileSizeLimit: 5242880,
      allowedMimeTypes: [...CONTACT_PHOTO_MIME_TYPES],
    }
  );

  if (!createError) return { ok: true };

  const createMessage = createError.message.toLowerCase();
  if (
    createMessage.includes("already exists") ||
    createMessage.includes("duplicate")
  ) {
    return { ok: true };
  }

  console.error("ensureContactPhotosBucket error:", createError.message);
  return {
    ok: false,
    error: formatContactPhotoStorageError(createError.message),
  };
}

export async function getContactPhotoSignedUrl(
  storagePath: string,
  expiresIn = SIGNED_URL_TTL_SEC
): Promise<string | null> {
  let supabase;
  try {
    supabase = createServiceRoleSupabase();
  } catch {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(CONTACT_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("contact photo signed url error:", error?.message);
    return null;
  }

  return data.signedUrl;
}

export async function resolveContactAvatarUrl(row: {
  avatar_storage_path?: string | null;
  avatar_url?: string | null;
}): Promise<string | undefined> {
  if (row.avatar_storage_path?.trim()) {
    try {
      const fresh = await withTimeout(
        getContactPhotoSignedUrl(row.avatar_storage_path.trim()),
        3_000,
        "Avatar URL timed out"
      );
      if (fresh) return fresh;
    } catch (err) {
      if (!(err instanceof OperationTimeoutError)) {
        console.error("resolveContactAvatarUrl error:", err);
      }
    }
  }

  return row.avatar_url?.trim() || undefined;
}

export async function uploadContactAvatar(input: {
  contactId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<{
  storagePath: string | null;
  avatarUrl: string | null;
  error?: string;
}> {
  if (!isAllowedContactPhotoMimeType(input.mimeType)) {
    return {
      storagePath: null,
      avatarUrl: null,
      error: "Please upload a JPEG, PNG, WebP, or GIF image.",
    };
  }

  const bucketReady = await ensureContactPhotosBucket();
  if (!bucketReady.ok) {
    return {
      storagePath: null,
      avatarUrl: null,
      error: bucketReady.error ?? formatContactPhotoStorageError("Bucket not found"),
    };
  }

  let supabase;
  try {
    supabase = createServiceRoleSupabase();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Missing service role key";
    return { storagePath: null, avatarUrl: null, error: message };
  }

  const ext = extensionForMimeType(input.mimeType);
  const storagePath = `avatars/${input.contactId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(CONTACT_PHOTOS_BUCKET)
    .upload(storagePath, input.buffer, {
      contentType: input.mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error("contact photo upload error:", uploadError.message);
    return {
      storagePath: null,
      avatarUrl: null,
      error: formatContactPhotoStorageError(uploadError.message),
    };
  }

  const avatarUrl = await getContactPhotoSignedUrl(storagePath);
  if (!avatarUrl) {
    return {
      storagePath: null,
      avatarUrl: null,
      error: "Photo uploaded but could not generate a display URL.",
    };
  }

  return { storagePath, avatarUrl };
}

export async function deleteContactAvatarFile(storagePath: string): Promise<void> {
  const trimmed = storagePath.trim();
  if (!trimmed) return;

  try {
    const supabase = createServiceRoleSupabase();
    const { error } = await supabase.storage
      .from(CONTACT_PHOTOS_BUCKET)
      .remove([trimmed]);

    if (error) {
      console.error("deleteContactAvatarFile error:", error.message);
    }
  } catch (err) {
    console.error(
      "deleteContactAvatarFile error:",
      err instanceof Error ? err.message : err
    );
  }
}
