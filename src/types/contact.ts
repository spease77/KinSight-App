import type { ContactProfile } from "@/types/contact-profile";
import type { ContactSourceMetadata } from "@/types/source-metadata";
import type { ContactNoteEntry } from "@/lib/contacts/notes-log";
import type { ContactType } from "@/lib/contacts/contact-type";
import type { RelationshipType } from "@/lib/contacts/relationship-tree";

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  lastContact: string;
  lastMeetingDate?: string;
  contactType?: ContactType | null;
  contactTypeNeedsConfirmation?: boolean;
  /** Canonical lowercase relationship preset (e.g. "wife", "mother"). */
  relationship?: string;
  relationshipType?: RelationshipType;
  relationshipLabel?: string;
  avatarUrl?: string;
  notes?: string;
  nextSteps?: string;
  topics?: string[];
  isTrackingPaused?: boolean;
}

export interface ContactDetail extends Contact {
  inquiryTranscript?: string;
  notesLog: ContactNoteEntry[];
  profile?: ContactProfile;
  sourceMetadata?: ContactSourceMetadata;
}
