"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Newspaper, Sparkles } from "lucide-react";
import { isLinkedContactId } from "@/types/scheduled-interaction";
import type { CompanyNewsResult } from "@/lib/contacts/company-news";
import type { PreMeetingCard } from "@/lib/contacts/intelligence-profile";
import { readApiJson } from "@/lib/api/read-json";

interface PreMeetingBriefingProps {
  contactId?: string | null;
  eventId?: string | null;
  externalEventId?: string | null;
  provider?: string | null;
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

export function PreMeetingBriefing({
  contactId,
  eventId,
  externalEventId,
  provider,
}: PreMeetingBriefingProps) {
  const [card, setCard] = useState<PreMeetingCard | null>(null);
  const [news, setNews] = useState<CompanyNewsResult | null>(null);

  useEffect(() => {
    if (!isLinkedContactId(contactId)) {
      setCard(null);
      setNews(null);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams();
    if (eventId?.trim()) params.set("eventId", eventId.trim());
    if (externalEventId?.trim()) {
      params.set("externalEventId", externalEventId.trim());
    }
    if (provider?.trim()) params.set("provider", provider.trim());
    const briefingQuery = params.toString();

    void (async () => {
      try {
        const res = await fetch(
          `/api/contacts/${contactId}/briefing${briefingQuery ? `?${briefingQuery}` : ""}`
        );
        const data = await readApiJson<{ card?: PreMeetingCard | null }>(res);
        if (!cancelled) setCard(data.card ?? null);
      } catch {
        if (!cancelled) setCard(null);
      }
    })();

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
  }, [contactId, eventId, externalEventId, provider]);

  if (!card && !news?.has_news) return null;

  const verifiedDomain = news?.source_url ? domainFromUrl(news.source_url) : null;

  return (
    <div className="pre-meeting-briefing-stack">
      {card ? (
        <article
          className="pre-meeting-briefing pre-meeting-briefing--advisor"
          aria-label="Pre-meeting briefing"
        >
          <div className="pre-meeting-briefing__header">
            <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} />
            <p className="pre-meeting-briefing__kicker">Before you walk in</p>
          </div>

          <p className="pre-meeting-briefing__summary">{card.summary}</p>

          {card.top_questions.length > 0 ? (
            <div>
              <p className="pre-meeting-briefing__opener-label">Ask</p>
              <ol className="pre-meeting-briefing__questions">
                {card.top_questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {card.caution_flags.length > 0 ? (
            <p className="pre-meeting-briefing__caution">
              <span className="pre-meeting-briefing__opener-label">Watch</span>
              {card.caution_flags[0]}
            </p>
          ) : null}

          {card.opening_move ? (
            <p className="pre-meeting-briefing__opener">
              <span className="pre-meeting-briefing__opener-label">Open with</span>
              {card.opening_move}
            </p>
          ) : null}
        </article>
      ) : null}

      {news?.has_news ? (
        <article className="pre-meeting-briefing" aria-label="Company news">
          <div className="pre-meeting-briefing__header">
            <Newspaper className="h-4 w-4 shrink-0" strokeWidth={2} />
            <p className="pre-meeting-briefing__kicker">Verified company news</p>
          </div>

          <h3 className="pre-meeting-briefing__headline">{news.headline}</h3>

          <div className="pre-meeting-briefing__meta">
            {news.date ? (
              <time dateTime={news.date}>{formatNewsDate(news.date)}</time>
            ) : null}
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
      ) : null}
    </div>
  );
}
