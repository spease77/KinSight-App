import { formatNoteLogTimestamp } from "@/lib/contacts/notes-log";
import { formatBehavioralTagLabel } from "@/lib/psychological-profile";
import { fetchContactsForExportByIds } from "@/lib/supabase/contacts";
import { fetchScheduledInteractionsByContactIds } from "@/lib/supabase/scheduled-interactions";
import type {
  ExportDataPayload,
  ExportRelationshipNote,
} from "@/types/export-data";
import type { ContactDetail } from "@/types/contact";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";

function buildRelationshipNotesFromContacts(
  contacts: ContactDetail[]
): ExportRelationshipNote[] {
  const notes: ExportRelationshipNote[] = [];

  for (const contact of contacts) {
    for (const entry of contact.notesLog ?? []) {
      if (!entry.content.trim()) continue;

      notes.push({
        id: entry.id,
        contactId: contact.id,
        contactName: contact.name,
        recordedAt: entry.recordedAt,
        content: entry.content,
        source: "activity_log",
      });
    }
  }

  return notes;
}

function buildRelationshipNotesFromInteractions(
  interactions: ScheduledInteraction[]
): ExportRelationshipNote[] {
  return interactions.map((interaction) => ({
    id: `interaction-${interaction.id}`,
    contactId: interaction.contactId,
    contactName: interaction.contactName,
    recordedAt: interaction.scheduledAt,
    content: [interaction.title, interaction.notes?.trim()]
      .filter(Boolean)
      .join("\n\n"),
    source: "scheduled_interaction" as const,
    title: interaction.title,
    behavioralTags: interaction.behavioralTags.map(formatBehavioralTagLabel),
  }));
}

export async function fetchExportDataForContacts(
  contactIds: string[]
): Promise<{ data: ExportDataPayload | null; error?: string }> {
  const { contacts, error: contactsError } =
    await fetchContactsForExportByIds(contactIds);

  if (contactsError) {
    return { data: null, error: contactsError };
  }

  const { interactions, error: interactionsError } =
    await fetchScheduledInteractionsByContactIds(contactIds);

  if (interactionsError) {
    return { data: null, error: interactionsError };
  }

  const relationshipNotes = [
    ...buildRelationshipNotesFromContacts(contacts),
    ...buildRelationshipNotesFromInteractions(interactions),
  ].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  return {
    data: {
      contacts,
      scheduledInteractions: interactions,
      relationshipNotes,
    },
  };
}

export function formatExportTimestamp(iso: string): string {
  return formatNoteLogTimestamp(iso);
}
