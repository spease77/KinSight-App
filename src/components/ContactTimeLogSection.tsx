"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  formatDurationMinutes,
  formatLoggedDurationAction,
  resolveLoggedDurationMinutes,
  todayForDateInput,
} from "@/lib/time-logs/format-duration";
import { readApiJson } from "@/lib/api/read-json";
import { LogTimeNotesField } from "@/components/LogTimeNotesField";
import { LogTimeMeetingFormatField } from "@/components/LogTimeMeetingFormatField";
import { LogTimeDurationField } from "@/components/LogTimeDurationField";
import {
  DEFAULT_DURATION_ADJUSTMENT,
  DEFAULT_MEETING_FORMAT,
  type DurationAdjustment,
  type MeetingFormat,
} from "@/types/time-log";

interface ContactTimeLogSectionProps {
  contactId: string;
  onLogged?: () => void;
  variant?: "default" | "hero" | "heroPill";
  totalMinutes?: number;
}

export function ContactTimeLogSection({
  contactId,
  onLogged,
  variant = "default",
  totalMinutes = 0,
}: ContactTimeLogSectionProps) {
  const [loggedDate, setLoggedDate] = useState(() => todayForDateInput());
  const [minutes, setMinutes] = useState("");
  const [durationAdjustment, setDurationAdjustment] =
    useState<DurationAdjustment>(DEFAULT_DURATION_ADJUSTMENT);
  const [notes, setNotes] = useState("");
  const [meetingFormat, setMeetingFormat] =
    useState<MeetingFormat>(DEFAULT_MEETING_FORMAT);
  const [isSaving, setIsSaving] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTotal = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/time`, {
        cache: "no-store",
      });
      const data = await readApiJson<{
        totalMinutes?: number;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Could not load time logged.");
      }

      return data.totalMinutes ?? 0;
    } catch {
      return null;
    }
  }, [contactId]);

  useEffect(() => {
    void loadTotal();
  }, [loadTotal]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const durationMinutes = resolveLoggedDurationMinutes(
      minutes,
      durationAdjustment
    );
    if (durationMinutes === null) {
      setError("Enter how many minutes.");
      return;
    }

    if (!loggedDate.trim()) {
      setError("Enter the date for this time entry.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          durationMinutes,
          loggedDate: loggedDate.trim(),
          notes: notes.trim() || undefined,
          meetingFormat,
        }),
      });
      const data = await readApiJson<{ error?: string }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Could not save time.");
      }

      const action = formatLoggedDurationAction(durationMinutes);
      setMinutes("");
      setDurationAdjustment(DEFAULT_DURATION_ADJUSTMENT);
      setNotes("");
      setMeetingFormat(DEFAULT_MEETING_FORMAT);
      setLoggedDate(todayForDateInput());
      setShowEntryForm(false);
      setMessage(`${action.verb} ${action.label}.`);
      await loadTotal();
      onLogged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save time.");
    } finally {
      setIsSaving(false);
    }
  };

  const isHero = variant === "hero";
  const isHeroPill = variant === "heroPill";
  const triggerClassName = isHeroPill
    ? "contact-detail-hero__time-pill-action"
    : isHero
      ? "contact-detail-hero__log-time-btn"
      : "ui-btn-primary px-6 py-2.5 text-sm";

  const openEntryForm = () => {
    setError(null);
    setMessage(null);
    setShowEntryForm(true);
  };

  if (isHeroPill) {
    return (
      <div className="contact-detail-hero__time-wrap">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="contact-detail-hero__time-form"
        >
          <div className="contact-detail-hero__time-pill">
            <span className="contact-detail-hero__time-pill-metric">
              ⏱ {formatDurationMinutes(totalMinutes)}
            </span>
            <span
              className="contact-detail-hero__time-pill-divider"
              aria-hidden
            >
              |
            </span>
            {showEntryForm ? (
              <button
                type="submit"
                disabled={isSaving}
                className={triggerClassName}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            ) : (
              <button
                type="button"
                onClick={openEntryForm}
                className={triggerClassName}
              >
                + Log
              </button>
            )}
          </div>

          {showEntryForm && (
            <div className="contact-detail-hero__time-fields">
              <LogTimeMeetingFormatField
                value={meetingFormat}
                onChange={setMeetingFormat}
              />
              <label className="flex flex-col gap-1.5">
                <span className="ui-label">Date</span>
                <input
                  id={`log-time-date-${contactId}`}
                  type="date"
                  value={loggedDate}
                  onChange={(event) => setLoggedDate(event.target.value)}
                  className="ui-input px-3 py-2 text-sm"
                />
              </label>
              <LogTimeDurationField
                id={`log-time-duration-${contactId}`}
                minutes={minutes}
                adjustment={durationAdjustment}
                onMinutesChange={setMinutes}
                onAdjustmentChange={setDurationAdjustment}
              />
              <LogTimeNotesField
                id={`log-time-notes-${contactId}`}
                value={notes}
                onChange={setNotes}
              />
              <button
                type="button"
                onClick={() => setShowEntryForm(false)}
                className="ui-btn-outline px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </form>

        {message && <p className="contact-detail-hero__time-message">{message}</p>}
        {error && (
          <p className="contact-detail-hero__time-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center ${
        isHero ? "w-full max-w-md gap-2" : "gap-2"
      }`}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className={`flex w-full flex-col items-center ${
          isHero ? "gap-2.5" : "gap-3"
        }`}
      >
        {showEntryForm && (
          <div className="flex w-full flex-col gap-2">
            <LogTimeMeetingFormatField
              value={meetingFormat}
              onChange={setMeetingFormat}
            />
            <label className="flex flex-col gap-1.5">
              <span className="ui-label">Date</span>
              <input
                id={`log-time-date-${contactId}`}
                type="date"
                value={loggedDate}
                onChange={(event) => setLoggedDate(event.target.value)}
                className="ui-input px-3 py-2 text-sm"
              />
            </label>
            <LogTimeDurationField
              id={`log-time-duration-${contactId}`}
              minutes={minutes}
              adjustment={durationAdjustment}
              onMinutesChange={setMinutes}
              onAdjustmentChange={setDurationAdjustment}
            />
            <LogTimeNotesField
              id={`log-time-notes-${contactId}`}
              value={notes}
              onChange={setNotes}
            />
          </div>
        )}
        {showEntryForm ? (
          <button
            type="submit"
            disabled={isSaving}
            className={`${triggerClassName} disabled:opacity-50`}
          >
            {isSaving ? "Saving…" : "Log Time"}
          </button>
        ) : (
          <button
            type="button"
            onClick={openEntryForm}
            className={triggerClassName}
          >
            + Log Time
          </button>
        )}
      </form>

      {message && <p className="type-meta text-foreground">{message}</p>}
      {error && (
        <p className="text-center text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
