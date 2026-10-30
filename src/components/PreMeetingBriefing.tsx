"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import { isLinkedContactId } from "@/types/scheduled-interaction";
import type { CompanyNewsResult } from "@/lib/contacts/company-news";
import { readApiJson } from "@/lib/api/read-json";

interface PreMeetingBriefingProps {
  contactId?: string | null;
}

function formatNewsDate(raw: string): string {
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return raw;
  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

export function PreMeetingBriefing({ contactId }: PreMeetingBriefingProps) {
  const [news, setNews] = useState<CompanyNewsResult | null>(null);

  useEffect(() => {
    if (!isLinkedContactId(contactId)) {
      setNews(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/contacts/${contactId}/news`);
        const data = await readApiJson<{ news?: CompanyNewsResult }>(res);
        if (cancelled) return;
        if (data.news?.has_news) {
          setNews(data.news);
        } else {
          setNews(null);
        }
      } catch {
        if (!cancelled) setNews(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (!news?.has_news) return null;

  const verifiedDomain = domainFromUrl(news.source_url);

  return (
    <article className="pre-meeting-briefing" aria-label="Company news">
      <div className="pre-meeting-briefing__header">
        <Newspaper className="h-4 w-4 shrink-0" strokeWidth={2} />
        <p className="pre-meeting-briefing__kicker">Verified company news</p>
      </div>

      <h3 className="pre-meeting-briefing__headline">{news.headline}</h3>

      <div className="pre-meeting-briefing__meta">
        {news.date ? <time dateTime={news.date}>{formatNewsDate(news.date)}</time> : null}
        {verifiedDomain ? (
          <span className="pre-meeting-briefing__badge">{verifiedDomain}</span>
        ) : null}
      </div>

      {news.summary ? (
        <p className="pre-meeting-briefing__summary">{news.summary}</p>
      ) : null}

      {news.strategic_icebreaker ? (
        <p className="pre-meeting-briefing__opener">
          <span className="pre-meeting-briefing__opener-label">Opener</span>
          {news.strategic_icebreaker}
        </p>
      ) : null}

      {news.source_url ? (
        <a
          href={news.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="pre-meeting-briefing__source"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          Read source
        </a>
      ) : null}
    </article>
  );
}
