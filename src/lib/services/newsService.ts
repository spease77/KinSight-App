import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { MODELS } from "@/lib/ai/models";
import {
  EMPTY_COMPANY_NEWS,
  isNewsWithinWindow,
  resolveCompanyNewsDomain,
  type CompanyNewsResult,
} from "@/lib/contacts/company-news";
import { normalizeHostname } from "@/lib/contacts/contact-avatar-inputs";

type NewsSnippet = {
  title: string;
  url: string;
  content: string;
  published?: string;
};

const verifiedNewsSchema = z.object({
  has_news: z.boolean(),
  headline: z.string(),
  summary: z.string(),
  date: z.string(),
  source_url: z.string(),
  strategic_icebreaker: z.string(),
});

const NEWS_SEARCH_TIMEOUT_MS = 8_000;

function emptyNews(): CompanyNewsResult {
  return { ...EMPTY_COMPANY_NEWS };
}

function hostMatchesDomain(url: string, domain: string): boolean {
  const host = normalizeHostname(url);
  if (!host) return false;
  return host === domain || host.endsWith(`.${domain}`);
}

function mentionsCompany(text: string, companyName: string, domain: string): boolean {
  const haystack = text.toLowerCase();
  if (domain && haystack.includes(domain.toLowerCase())) return true;
  const name = companyName.trim().toLowerCase();
  return name.length >= 4 && haystack.includes(name);
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs = NEWS_SEARCH_TIMEOUT_MS
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Search failed (${response.status})`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function constrainedQuery(companyName: string, domain: string): string {
  const name = companyName.trim() || domain;
  return `site:${domain} OR ("${name}" AND (press release OR news OR announcement))`;
}

async function searchTavily(
  companyName: string,
  domain: string
): Promise<NewsSnippet[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];

  const query = constrainedQuery(companyName, domain);
  const payload = {
    api_key: apiKey,
    query,
    search_depth: "basic",
    include_domains: [domain],
    max_results: 8,
    days: 30,
    topic: "news",
  };

  const data = (await fetchJson("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })) as { results?: Array<Record<string, unknown>> };

  return (data.results ?? []).map((item) => ({
    title: typeof item.title === "string" ? item.title : "",
    url: typeof item.url === "string" ? item.url : "",
    content:
      typeof item.content === "string"
        ? item.content
        : typeof item.raw_content === "string"
          ? item.raw_content
          : "",
    published:
      typeof item.published_date === "string" ? item.published_date : undefined,
  }));
}

async function searchSerper(
  companyName: string,
  domain: string
): Promise<NewsSnippet[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) return [];

  const query = constrainedQuery(companyName, domain);
  const data = (await fetchJson("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      q: query,
      num: 10,
      tbs: "qdr:m",
    }),
  })) as {
    news?: Array<Record<string, unknown>>;
    organic?: Array<Record<string, unknown>>;
  };

  const rows = [...(data.news ?? []), ...(data.organic ?? [])];
  return rows.map((item) => ({
    title: typeof item.title === "string" ? item.title : "",
    url: typeof item.link === "string" ? item.link : "",
    content: typeof item.snippet === "string" ? item.snippet : "",
    published: typeof item.date === "string" ? item.date : undefined,
  }));
}

function filterSnippets(
  snippets: NewsSnippet[],
  companyName: string,
  domain: string
): NewsSnippet[] {
  const seen = new Set<string>();
  const filtered: NewsSnippet[] = [];

  for (const snippet of snippets) {
    const url = snippet.url.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const onDomain = hostMatchesDomain(url, domain);
    const text = `${snippet.title} ${snippet.content}`;
    if (!onDomain && !mentionsCompany(text, companyName, domain)) continue;

    filtered.push({
      title: snippet.title.trim(),
      url,
      content: snippet.content.trim().slice(0, 800),
      published: snippet.published?.trim(),
    });
    if (filtered.length >= 8) break;
  }

  return filtered;
}

function verificationPrompt(input: {
  companyName: string;
  domain: string;
  snippets: NewsSnippet[];
}): string {
  const today = new Date().toISOString().slice(0, 10);
  const snippetBlock = input.snippets
    .map((snippet, index) => {
      const published = snippet.published
        ? `Published: ${snippet.published}`
        : "Published: unknown";
      return `${index + 1}. ${snippet.title}
URL: ${snippet.url}
${published}
${snippet.content}`;
    })
    .join("\n\n");

  return `Target company: ${input.companyName || "(name unknown)"}
Target domain: ${input.domain}
Today: ${today}
Lookback: last 30 days only.

Search snippets:
${snippetBlock}`;
}

async function verifySnippets(input: {
  companyName: string;
  domain: string;
  snippets: NewsSnippet[];
}): Promise<CompanyNewsResult> {
  if (input.snippets.length === 0) return emptyNews();

  try {
    const { object } = await generateObject({
      model: openai(MODELS.parse),
      schema: verifiedNewsSchema,
      schemaName: "VerifiedCompanyNews",
      schemaDescription:
        "Domain-verified company news. has_news must be false unless the article is clearly about this exact company.",
      system: `You verify company news for a relationship CRM.

Rules:
1. Verify that the news explicitly references the target domain or exact company structure.
2. If the news belongs to a different company with a similar name, or if no official news exists on/about this specific domain in the last 30 days, return has_news: false.
3. NEVER guess or substitute news from a similarly named business.

Also reject careers pages, generic about pages, and anything whose date is unknown or older than 30 days.
If has_news is false, leave headline, summary, date, source_url, and strategic_icebreaker empty.
If has_news is true:
- headline: the article headline
- summary: 1-2 factual sentences
- date: ISO YYYY-MM-DD
- source_url: the article URL from the snippets
- strategic_icebreaker: one natural sentence the user could say in a meeting about this news. No hype.`,
      prompt: verificationPrompt(input),
    });

    if (!object.has_news) return emptyNews();

    const date = object.date.trim();
    const sourceUrl = object.source_url.trim();
    const headline = object.headline.trim();
    if (!headline || !sourceUrl || !isNewsWithinWindow(date)) {
      return emptyNews();
    }

    const onDomain = hostMatchesDomain(sourceUrl, input.domain);
    const aboutCompany = mentionsCompany(
      `${headline} ${object.summary} ${sourceUrl}`,
      input.companyName,
      input.domain
    );
    if (!onDomain && !aboutCompany) return emptyNews();

    return {
      has_news: true,
      headline,
      summary: object.summary.trim(),
      date,
      source_url: sourceUrl,
      strategic_icebreaker: object.strategic_icebreaker.trim(),
    };
  } catch (err) {
    console.error("verifySnippets error:", err);
    return emptyNews();
  }
}

/**
 * Domain-locked company news. Returns has_news: false unless a corporate
 * domain is known and an article about that exact company is verified.
 */
export async function fetchCompanyNews(input: {
  companyName?: string | null;
  contactEmail?: string | null;
  companyWebsite?: string | null;
}): Promise<CompanyNewsResult> {
  const domain = resolveCompanyNewsDomain({
    companyName: input.companyName,
    contactEmail: input.contactEmail,
    companyWebsite: input.companyWebsite,
  });

  if (!domain) return emptyNews();
  if (!process.env.TAVILY_API_KEY?.trim() && !process.env.SERPER_API_KEY?.trim()) {
    return emptyNews();
  }

  const companyName = input.companyName?.trim() || domain;
  const snippets: NewsSnippet[] = [];

  try {
    snippets.push(...(await searchTavily(companyName, domain)));
  } catch (err) {
    console.error("Tavily company news error:", err);
  }

  if (snippets.length === 0) {
    try {
      snippets.push(...(await searchSerper(companyName, domain)));
    } catch (err) {
      console.error("Serper company news error:", err);
    }
  }

  const filtered = filterSnippets(snippets, companyName, domain);
  return verifySnippets({ companyName, domain, snippets: filtered });
}

export { resolveCompanyNewsDomain };
