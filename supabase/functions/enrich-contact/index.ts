import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EnrichRequest {
  linkedin_url?: string;
}

interface ProxycurlExperience {
  title?: string;
  company?: string;
  ends_at?: unknown;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractCurrentExperience(
  experiences: unknown
): ProxycurlExperience | null {
  if (!Array.isArray(experiences)) return null;

  for (const item of experiences) {
    if (!item || typeof item !== "object") continue;
    const experience = item as ProxycurlExperience;
    if (experience.ends_at == null) {
      return experience;
    }
  }

  return null;
}

function parseOccupation(occupation: string): {
  jobTitle: string;
  companyName: string;
} {
  const trimmed = occupation.trim();
  if (!trimmed) return { jobTitle: "", companyName: "" };

  const atIndex = trimmed.toLowerCase().lastIndexOf(" at ");
  if (atIndex === -1) {
    return { jobTitle: trimmed, companyName: "" };
  }

  return {
    jobTitle: trimmed.slice(0, atIndex).trim(),
    companyName: trimmed.slice(atIndex + 4).trim(),
  };
}

function buildLocation(data: Record<string, unknown>): string {
  const parts = [
    typeof data.city === "string" ? data.city.trim() : "",
    typeof data.state === "string" ? data.state.trim() : "",
    typeof data.country_full_name === "string"
      ? data.country_full_name.trim()
      : typeof data.country === "string"
        ? data.country.trim()
        : "",
  ].filter(Boolean);

  return parts.join(", ");
}

function extractProfileData(data: Record<string, unknown>) {
  const firstName =
    typeof data.first_name === "string" ? data.first_name.trim() : "";
  const lastName =
    typeof data.last_name === "string" ? data.last_name.trim() : "";
  const fullName =
    typeof data.full_name === "string"
      ? data.full_name.trim()
      : [firstName, lastName].filter(Boolean).join(" ");

  const currentExperience = extractCurrentExperience(data.experiences);
  let jobTitle =
    typeof currentExperience?.title === "string"
      ? currentExperience.title.trim()
      : "";
  let companyName =
    typeof currentExperience?.company === "string"
      ? currentExperience.company.trim()
      : "";

  if (typeof data.occupation === "string" && data.occupation.trim()) {
    const parsed = parseOccupation(data.occupation);
    if (!jobTitle) jobTitle = parsed.jobTitle;
    if (!companyName) companyName = parsed.companyName;
  }

  if (!jobTitle && typeof data.headline === "string") {
    jobTitle = data.headline.trim();
  }

  const summary =
    typeof data.summary === "string" ? data.summary.trim() : "";
  const location = buildLocation(data);

  return {
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    job_title: jobTitle,
    company_name: companyName,
    location,
    summary,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const apiKey = Deno.env.get("PROXYCURL_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      { error: "Proxycurl API key is not configured on the server." },
      500
    );
  }

  let body: EnrichRequest;
  try {
    body = (await req.json()) as EnrichRequest;
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const linkedinUrl = body.linkedin_url?.trim();
  if (!linkedinUrl) {
    return jsonResponse({ error: "linkedin_url is required." }, 400);
  }

  if (!/linkedin\.com/i.test(linkedinUrl)) {
    return jsonResponse(
      { error: "Enter a valid LinkedIn profile URL." },
      400
    );
  }

  try {
    const proxycurlUrl = new URL("https://nubela.co/proxycurl/api/v2/linkedin");
    proxycurlUrl.searchParams.set("url", linkedinUrl);
    proxycurlUrl.searchParams.set("fallback_to_cache", "on-error");
    proxycurlUrl.searchParams.set("use_cache", "if-present");

    const proxycurlResponse = await fetch(proxycurlUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (proxycurlResponse.status === 404) {
      return jsonResponse({ error: "LinkedIn profile not found." }, 404);
    }

    if (!proxycurlResponse.ok) {
      const detail = await proxycurlResponse.text();
      console.error("Proxycurl error:", proxycurlResponse.status, detail);
      return jsonResponse(
        { error: "Could not fetch LinkedIn profile data." },
        502
      );
    }

    const proxycurlData = (await proxycurlResponse.json()) as Record<
      string,
      unknown
    >;
    const enriched = extractProfileData(proxycurlData);

    if (
      !enriched.full_name &&
      !enriched.job_title &&
      !enriched.company_name &&
      !enriched.summary
    ) {
      return jsonResponse(
        { error: "No usable profile data was returned for this URL." },
        404
      );
    }

    return jsonResponse(enriched);
  } catch (error) {
    console.error("enrich-contact error:", error);
    return jsonResponse(
      { error: "Unexpected error while enriching contact." },
      500
    );
  }
});
