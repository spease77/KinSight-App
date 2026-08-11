import type { UIMessage } from "ai";
import {
  buildRequestContext,
  type AiRequestContext,
} from "@/lib/ai/request-context";
import { getMessageText } from "@/lib/ai/message-text";
import type {
  DetectContactsResult,
  ExistingContactUpdate,
  ProposedContactForReview,
} from "@/lib/contacts/detect-from-note";
import type { DetectedAgendaItem } from "@/lib/agenda/detect-from-note";
import {
  extractLatestRecordingId,
  stripRecordingTag,
} from "@/lib/agent/extract-recording-id";

export type LogMessageResult =
  | { ok: true; savedContacts: number; savedAgenda: number; message: string }
  | { ok: false; error: string };

function buildTranscriptForMessage(
  messages: UIMessage[],
  assistantMessageId: string
): { transcript: string; recordingId?: string; entryMethod: "voice" | "manual" } | null {
  const assistantIndex = messages.findIndex(
    (message) => message.id === assistantMessageId
  );
  if (assistantIndex < 0) return null;

  const assistantText = getMessageText(messages[assistantIndex]).trim();
  const priorMessage = messages[assistantIndex - 1];
  const userText =
    priorMessage?.role === "user"
      ? stripRecordingTag(getMessageText(priorMessage)).trim()
      : "";

  const transcript = [userText, assistantText].filter(Boolean).join("\n\n");
  if (!transcript) return null;

  const contextMessages = messages.slice(0, assistantIndex + 1);
  const recordingId = extractLatestRecordingId(contextMessages);
  const entryMethod = recordingId ? "voice" : "manual";

  return { transcript, recordingId, entryMethod };
}

function buildSuccessMessage(savedContacts: number, savedAgenda: number): string {
  if (savedContacts > 0 && savedAgenda > 0) return "Saved to KinSight!";
  if (savedAgenda > 0) return "Saved to Agenda!";
  return "Saved to Contacts!";
}

async function saveDetectedContacts(
  data: DetectContactsResult,
  transcript: string,
  recordingId: string | undefined,
  requestContext: AiRequestContext
): Promise<number> {
  const items: Array<
    | { kind: "create"; proposal: ProposedContactForReview }
    | { kind: "update"; update: ExistingContactUpdate }
  > = [
    ...(data.newContacts ?? []).map((proposal) => ({
      kind: "create" as const,
      proposal,
    })),
    ...(data.existingUpdates ?? []).map((update) => ({
      kind: "update" as const,
      update,
    })),
  ];

  let saved = 0;

  for (const item of items) {
    const body =
      item.kind === "create"
        ? {
            action: "create" as const,
            person: item.proposal.person,
            transcript,
            recordingId,
            requestContext,
          }
        : {
            action: "update" as const,
            contactId: item.update.contactId,
            person: item.update.person,
            transcript,
            recordingId,
            requestContext,
          };

    const res = await fetch("/api/contacts/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      throw new Error(payload.error ?? "Could not save contact");
    }

    saved += 1;
  }

  return saved;
}

async function saveDetectedAgendaItems(items: DetectedAgendaItem[]): Promise<number> {
  let saved = 0;

  for (const item of items) {
    const res = await fetch("/api/scheduled-interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: item.contactId,
        scheduledAt: item.scheduledAt,
        title: item.reminderText,
      }),
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      throw new Error(payload.error ?? "Could not save agenda reminder");
    }

    saved += 1;
  }

  return saved;
}

export async function logMessageToKinSight(
  messages: UIMessage[],
  assistantMessageId: string
): Promise<LogMessageResult> {
  const context = buildTranscriptForMessage(messages, assistantMessageId);
  if (!context) {
    return { ok: false, error: "No message content to log." };
  }

  const { transcript, recordingId, entryMethod } = context;
  const requestContext = buildRequestContext(entryMethod);

  const [contactRes, agendaRes] = await Promise.all([
    fetch("/api/detect-contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        recordingId,
        entry_method: entryMethod,
        requestContext,
      }),
    }),
    fetch("/api/detect-agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        entry_method: entryMethod,
        requestContext,
      }),
    }),
  ]);

  const contactData = (await contactRes.json()) as DetectContactsResult & {
    error?: string;
    requestContext?: AiRequestContext;
  };
  const agendaData = (await agendaRes.json()) as {
    items?: DetectedAgendaItem[];
    error?: string;
  };

  if (!contactRes.ok && !agendaRes.ok) {
    return {
      ok: false,
      error:
        contactData.error ??
        agendaData.error ??
        "Could not analyze this message for KinSight updates.",
    };
  }

  let savedContacts = 0;

  if (contactRes.ok) {
    savedContacts = await saveDetectedContacts(
      contactData,
      transcript,
      recordingId,
      contactData.requestContext ?? requestContext
    );
  }

  const savedAgenda = agendaRes.ok
    ? await saveDetectedAgendaItems(agendaData.items ?? [])
    : 0;

  if (savedContacts === 0 && savedAgenda === 0) {
    return {
      ok: false,
      error: "No contacts or reminders were found to save.",
    };
  }

  return {
    ok: true,
    savedContacts,
    savedAgenda,
    message: buildSuccessMessage(savedContacts, savedAgenda),
  };
}
