import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

async function supabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("connection", "close");
  return fetch(input, { ...init, headers });
}

export function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Strip accidental wrapping quotes from dashboard / CLI paste.
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

const supabaseClientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: supabaseFetch,
  },
} as const;

export function createServerSupabase(): SupabaseClient<Database> {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    readEnv("SUPABASE_SECRET_KEY") ??
    readEnv("SUPABASE_SERVICE_ROLE_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !key) {
    throw new Error("Supabase URL or key is missing from environment variables.");
  }

  return createClient<Database>(url, key, supabaseClientOptions);
}

/** Service role client — bypasses storage RLS. Required for photo uploads. */
export function createServiceRoleSupabase(): SupabaseClient<Database> {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    readEnv("SUPABASE_SECRET_KEY") ?? readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SECRET_KEY is missing. Add it to .env.local from Supabase Dashboard → Settings → API Keys → Secret key, then restart the dev server."
    );
  }

  return createClient<Database>(url, key, supabaseClientOptions);
}

export function isUsingServerSecretKey(): boolean {
  return Boolean(
    readEnv("SUPABASE_SECRET_KEY") ?? readEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}

/** Turn low-level Node fetch errors into actionable setup guidance. */
export function humanizeSupabaseFetchError(message: string): string {
  if (!message.toLowerCase().includes("fetch failed")) {
    return message;
  }

  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  let host = "your Supabase project";
  if (url) {
    try {
      host = new URL(url).host;
    } catch {
      host = url;
    }
  }

  return `Cannot reach Supabase (${host}). The project may be paused, deleted, or the URL in .env.local is wrong. Open Supabase Dashboard → Project Settings → API, copy the Project URL and API keys into .env.local, then restart npm run dev.`;
}
