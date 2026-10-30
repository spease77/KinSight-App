import { OperationTimeoutError, withTimeout } from "@/lib/server/with-timeout";
import {
  createServiceRoleSupabase,
  isUsingServerSecretKey,
} from "@/lib/supabase/server";

/** Live bucket created in 010_contact_avatar.sql (spec name: contact-avatars). */
export const CONTACT_PHOTOS_BUCKET = "contact-photos";
export const CONTACT_AVATARS_BUCKET = CONTACT_PHOTOS_BUCKET;

const MAX_REMOTE_AVATAR_BYTES = 5 * 1024 * 1024;

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

function isBlockedAvatarHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local")
  ) {
    return true;
  }

  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/.test(host);
}

export function assertSafeRemoteAvatarUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Enter a valid image URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Image URL must start with https://");
  }

  if (isBlockedAvatarHost(parsed.hostname)) {
    throw new Error("That image URL is not allowed.");
  }

  return parsed;
}

export async function downloadRemoteAvatarImage(rawUrl: string): Promise<{
  buffer: Buffer;
  mimeType: string;
} | { error: string }> {
  let parsed: URL;
  try {
    parsed = assertSafeRemoteAvatarUrl(rawUrl);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Enter a valid image URL.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "image/*" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { error: "Could not download that image. Try another URL." };
    }

    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      ?.trim()
      .toLowerCase();
    const rawMime = contentType?.startsWith("image/")
      ? contentType
      : "image/jpeg";
    const mimeType = rawMime === "image/jpg" ? "image/jpeg" : rawMime;

    if (!isAllowedContactPhotoMimeType(mimeType)) {
      return { error: "That URL is not a JPEG, PNG, WebP, or GIF image." };
    }

    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) > MAX_REMOTE_AVATAR_BYTES) {
      return { error: "Image must be 5 MB or smaller." };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_REMOTE_AVATAR_BYTES) {
      return { error: "Image must be 5 MB or smaller." };
    }

    if (buffer.byteLength < 32) {
      return { error: "That URL did not return an image." };
    }

    return { buffer, mimeType };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Timed out downloading that image." };
    }
    return { error: "Could not download that image. Try another URL." };
  } finally {
    clearTimeout(timer);
  }
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
