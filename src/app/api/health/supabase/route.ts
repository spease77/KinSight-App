import { createServerSupabase, readEnv } from "@/lib/supabase/server";

async function rawSupabaseFetch(
  url: string,
  secret: string
): Promise<{ ok: boolean; status: number | null; error: string | null }> {
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: secret,
        authorization: `Bearer ${secret}`,
        connection: "close",
      },
    });
    return { ok: response.ok, status: response.status, error: null };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : "raw fetch failed",
    };
  }
}

function keyKind(value: string | undefined): string {
  if (!value) return "missing";
  if (value.startsWith("eyJ")) return "legacy-jwt";
  if (value.startsWith("sb_secret_")) return "sb-secret";
  if (value.startsWith("sb_publishable_")) return "sb-publishable";
  return "unknown";
}

function errorCause(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  if (err.cause instanceof Error) return err.cause.message;
  if (err.cause != null) return String(err.cause);
  return null;
}

export async function GET() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secret =
    readEnv("SUPABASE_SECRET_KEY") ?? readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const publishable =
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const env = {
    hasUrl: Boolean(url),
    urlHost: url ? new URL(url).host : null,
    secretKeyKind: keyKind(secret),
    publishableKeyKind: keyKind(publishable),
    secretKeyLength: secret?.length ?? 0,
    publishableKeyLength: publishable?.length ?? 0,
  };

  let rawFetch: { ok: boolean; status: number | null; error: string | null } = {
    ok: false,
    status: null,
    error: null,
  };

  if (url && secret) {
    rawFetch = await rawSupabaseFetch(url, secret);
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .select("id")
      .limit(1);

    return Response.json({
      ok: !error,
      contactSampleCount: data?.length ?? 0,
      supabaseError: error?.message ?? null,
      env,
      rawFetch,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");

    return Response.json(
      {
        ok: false,
        message: error.message,
        cause: errorCause(err),
        env,
        rawFetch,
      },
      { status: 500 }
    );
  }
}
