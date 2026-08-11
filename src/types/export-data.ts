import type { ContactDetail } from "@/types/contact";
import type { ScheduledInteraction } from "@/types/scheduled-interaction";

export type ExportRelationshipNote = {
  id: string;
  contactId: string;
  contactName: string;
  recordedAt: string;
  content: string;
  source: "activity_log" | "scheduled_interaction";
  title?: string | null;
  behavioralTags?: string[];
};

export type ExportDataPayload = {
  contacts: ContactDetail[];
  scheduledInteractions: ScheduledInteraction[];
  relationshipNotes: ExportRelationshipNote[];
};
