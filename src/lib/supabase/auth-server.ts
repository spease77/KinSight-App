import { createClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { readEnv } from "@/lib/supabase/server";

function createAuthSupabaseClient() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function decodeSupabaseAuthCookie(value: string): string | undefined {
  try {
    const raw = value.startsWith("base64-")
      ? Buffer.from(value.slice("base64-".length), "base64").toString("utf-8")
      : value;
    const session = JSON.parse(raw) as { access_token?: string };
    return typeof session.access_token === "string"
      ? session.access_token
      : undefined;
  } catch {
    return undefined;
  }
}

async function getAccessTokenFromCookies(): Promise<string | undefined> {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!url) return undefined;

  const cookieStore = await cookies();
  const projectRef = new URL(url).hostname.split(".")[0];
  const baseName = `sb-${projectRef}-auth-token`;

  const single = cookieStore.get(baseName)?.value;
  if (single) {
    const token = decodeSupabaseAuthCookie(single);
    if (token) return token;
  }

  const chunks: string[] = [];
  for (let index = 0; ; index += 1) {
    const chunk = cookieStore.get(`${baseName}.${index}`)?.value;
    if (!chunk) break;
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return decodeSupabaseAuthCookie(chunks.join(""));
}

export async function getAuthenticatedUser(
  req: Request
): Promise<User | null> {
  const supabase = createAuthSupabaseClient();
  if (!supabase) {
    return null;
  }

  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : undefined;
  const accessToken = bearerToken ?? (await getAccessTokenFromCookies());

  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export interface FeedbackSenderIdentity {
  name: string;
  email: string | null;
}

export function getFeedbackSenderIdentity(
  user: User | null
): FeedbackSenderIdentity {
  if (!user) {
    return {
      name: "Anonymous User (Unauthenticated)",
      email: null,
    };
  }

  const metadata = user.user_metadata ?? {};
  const fullName =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    [
      typeof metadata.first_name === "string" ? metadata.first_name.trim() : "",
      typeof metadata.last_name === "string" ? metadata.last_name.trim() : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return {
    name: fullName || user.email || "Anonymous User (Unauthenticated)",
    email: user.email ?? null,
  };
}
