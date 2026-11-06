"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mic, X } from "lucide-react";
import { MicPermissionModal } from "@/components/MicPermissionModal";
import { VoiceCaptureModal } from "@/components/VoiceCaptureModal";
import { useVoiceDebrief } from "@/hooks/useVoiceDebrief";
import { readApiJson } from "@/lib/api/read-json";
import {
  dismissEndedMeeting,
  recentlyEndedMeetings,
} from "@/lib/agenda/ended-meetings";
import { isLinkedContactId, type ScheduledInteraction } from "@/types/scheduled-interaction";

interface PostMeetingDebriefBannerProps {
  interactions?: ScheduledInteraction[];
}

export function PostMeetingDebriefBanner({
  interactions: provided,
}: PostMeetingDebriefBannerProps) {
  const [loaded, setLoaded] = useState<ScheduledInteraction[] | null>(
    provided ?? null
  );
  const [dismissTick, setDismissTick] = useState(0);
  const debrief = useVoiceDebrief();

  useEffect(() => {
    if (provided) {
      setLoaded(provided);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/scheduled-interactions", {
          cache: "no-store",
        });
        const data = await readApiJson<{
          interactions?: ScheduledInteraction[];
        }>(res);
        if (!cancelled) setLoaded(data.interactions ?? []);
      } catch {
        if (!cancelled) setLoaded([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [provided]);

  const ended = useMemo(
    () => recentlyEndedMeetings(loaded ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, dismissTick]
  );
  const meeting = ended[0] ?? null;

  const dismiss = useCallback((eventId: string) => {
    dismissEndedMeeting(eventId);
    setDismissTick((value) => value + 1);
  }, []);

  if (!meeting) {
    return debrief.failure ? (
      <MicPermissionModal
        failure={debrief.failure}
        onDismiss={debrief.clearFailure}
      />
    ) : null;
  }

  return (
    <>
      <div className="post-meeting-banner" role="status">
        <p className="post-meeting-banner__copy">
          Meeting with {meeting.contactName} just ended. Record 30-sec debrief?
        </p>
        <div className="post-meeting-banner__actions">
          <button
            type="button"
            className="ui-btn-orange flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs"
            onClick={debrief.start}
          >
            <Mic className="h-3.5 w-3.5" strokeWidth={2} />
            Record
          </button>
          <button
            type="button"
            className="post-meeting-banner__dismiss"
            aria-label="Dismiss debrief reminder"
            onClick={() => dismiss(meeting.id)}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {debrief.failure ? (
        <MicPermissionModal
          failure={debrief.failure}
          onDismiss={debrief.clearFailure}
        />
      ) : null}

      <VoiceCaptureModal
        open={debrief.open}
        stream={debrief.stream}
        contactId={
          isLinkedContactId(meeting.contactId) ? meeting.contactId : undefined
        }
        calendarEventId={
          isLinkedContactId(meeting.id) ? meeting.id : undefined
        }
        externalEventId={meeting.externalEventId}
        provider={meeting.source}
        eventTitle={meeting.title}
        onClose={debrief.close}
        onComplete={() => {
          dismiss(meeting.id);
        }}
      />
    </>
  );
}
