"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { readApiJson } from "@/lib/api/read-json";
import { isUpcomingBriefingWindow } from "@/lib/agenda/ended-meetings";
import type { PreMeetingCard as PreMeetingCardData } from "@/lib/contacts/intelligence-profile";
import { isLinkedContactId } from "@/types/scheduled-interaction";

type PreMeetingCardVariant = "full" | "compact";

interface PreMeetingCardProps {
  contactId?: string | null;
  contactName?: string | null;
  eventId?: string | null;
  externalEventId?: string | null;
  provider?: string | null;
  variant?: PreMeetingCardVariant;
  /** When true, compact cards only fetch for upcoming meetings. */
  upcomingOnly?: boolean;
  eventStartAt?: string | null;
  durationMinutes?: number | null;
}

function briefingQuery(input: {
  eventId?: string | null;
  externalEventId?: string | null;
  provider?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.eventId?.trim()) params.set("eventId", input.eventId.trim());
  if (input.externalEventId?.trim()) {
    params.set("externalEventId", input.externalEventId.trim());
  }
  if (input.provider?.trim()) params.set("provider", input.provider.trim());
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function PreMeetingCard({
  contactId,
  contactName,
  eventId,
  externalEventId,
  provider,
  variant = "full",
  upcomingOnly = false,
  eventStartAt,
  durationMinutes,
}: PreMeetingCardProps) {
  const [card, setCard] = useState<PreMeetingCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const linked = isLinkedContactId(contactId);
  const shouldFetch =
    linked &&
    (!upcomingOnly ||
      (Boolean(eventStartAt) &&
        isUpcomingBriefingWindow({
          scheduledAt: eventStartAt as string,
          durationMinutes: durationMinutes ?? 60,
        })));

  const loadCard = useCallback(
    async (refresh: boolean) => {
      if (!linked || !contactId) {
        setCard(null);
        return;
      }
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const query = briefingQuery({ eventId, externalEventId, provider });
        const res = refresh
          ? await fetch(`/api/contacts/${contactId}/briefing${query}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventId,
                externalEventId,
                provider,
                refresh: true,
              }),
            })
          : await fetch(`/api/contacts/${contactId}/briefing${query}`);
        const data = await readApiJson<{ card?: PreMeetingCardData | null }>(
          res
        );
        setCard(data.card ?? null);
      } catch {
        if (!refresh) setCard(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [contactId, eventId, externalEventId, linked, provider]
  );

  useEffect(() => {
    if (!shouldFetch) {
      setCard(null);
      setLoading(false);
      return;
    }
    void loadCard(false);
  }, [loadCard, shouldFetch]);

  if (!linked) return null;
  if (variant === "compact" && !card && !loading) return null;

  const headerName = contactName?.trim() || "Contact";

  return (
    <article
      className={`pre-meeting-card${variant === "compact" ? " pre-meeting-card--compact" : ""}`}
      aria-label={`Briefing: ${headerName}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="pre-meeting-card__top">
        <p className="pre-meeting-card__header">
          <span className="pre-meeting-card__dot" aria-hidden="true" />
          Briefing: {headerName}
        </p>
        <button
          type="button"
          className="pre-meeting-card__refresh"
          onClick={() => void loadCard(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
          )}
          Refresh Intelligence
        </button>
      </div>

      {loading && !card ? (
        <p className="pre-meeting-card__muted">Preparing briefing…</p>
      ) : null}

      {card ? (
        <>
          <div>
            <p className="pre-meeting-card__label">The Read</p>
            <p className="pre-meeting-card__body">{card.summary}</p>
          </div>

          {variant === "full" && card.top_questions.length > 0 ? (
            <div>
              <p className="pre-meeting-card__label">Top Questions to Ask</p>
              <ul className="pre-meeting-card__questions">
                {card.top_questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {card.caution_flags[0] ? (
            <p className="pre-meeting-card__watch">
              <span className="pre-meeting-card__watch-badge">Watch Out For</span>
              {card.caution_flags[0]}
            </p>
          ) : null}

          {variant === "full" && card.opening_move ? (
            <div>
              <p className="pre-meeting-card__label">Open with</p>
              <p className="pre-meeting-card__body">{card.opening_move}</p>
            </div>
          ) : null}
        </>
      ) : null}

      {!card && !loading ? (
        <p className="pre-meeting-card__muted">
          No briefing yet. Refresh to generate one.
        </p>
      ) : null}
    </article>
  );
}
