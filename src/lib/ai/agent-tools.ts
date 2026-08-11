import { tool } from "ai";
import { z } from "zod";
import { formatContactDateForDisplay } from "@/lib/dates/contact-dates";
import { buildRelationshipCoachingBrief } from "@/lib/ai/relationship-coaching";
import type { AiRequestContext } from "@/lib/ai/request-context";
import {
  checkDatabaseHealth,
  createContactFromVoice,
  fetchContactById,
  fetchContacts,
  updateContactFromVoice,
  updateContactName,
} from "@/lib/supabase/contacts";
import { createAgendaItem } from "@/lib/supabase/scheduled-interactions";
import { buildAgendaSuccessMessage } from "@/lib/agenda/format-schedule-phrase";
import { resolveContactByName } from "@/lib/contacts/resolve-contact-by-name";

export type AgentToolsContext = {
  recordingId?: string;
  requestContext: AiRequestContext;
};

export function createAgentTools(ctx: AgentToolsContext) {
  const { recordingId, requestContext } = ctx;

  return {
    checkDatabase: tool({
      description:
        "Check if the contacts database is connected and working. Call this if list or save operations fail.",
      inputSchema: z.object({
        reason: z.string().optional().describe("Why the check is being run"),
      }),
      execute: async () => {
        return checkDatabaseHealth();
      },
    }),

    getContactDetails: tool({
      description:
        "Get full contact details, relationship profile, and coaching brief with suggested questions for the next conversation. Call whenever discussing a specific person — before or after saving updates.",
      inputSchema: z.object({
        contactId: z.string().uuid().describe("The contact's UUID"),
      }),
      execute: async ({ contactId }) => {
        const { contact, error } = await fetchContactById(contactId);

        if (error || !contact) {
          return { success: false, error: error ?? "Contact not found" };
        }

        const coaching = buildRelationshipCoachingBrief(contact);

        return {
          success: true,
          contact: {
            id: contact.id,
            name: contact.name,
            company: contact.company,
            role: contact.role,
            lastContact: contact.lastContact,
            lastMeetingDate: contact.lastMeetingDate,
            lastMeetingDateDisplay: contact.lastMeetingDate
              ? formatContactDateForDisplay(contact.lastMeetingDate)
              : undefined,
            notes: contact.notes,
            nextSteps: contact.nextSteps,
            topics: contact.topics,
            inquiryTranscript: contact.inquiryTranscript,
            notesLog: contact.notesLog,
            contactType: contact.contactType,
            contactTypeNeedsConfirmation: contact.contactTypeNeedsConfirmation,
            profile: contact.profile,
            sourceMetadata: contact.sourceMetadata,
          },
          coaching,
        };
      },
    }),

    listContacts: tool({
      description:
        "List all contacts in the database. Use when you need to find or confirm who the user is talking about.",
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .describe("Optional name or company to filter contacts"),
      }),
      execute: async ({ search }) => {
        const { contacts, error } = await fetchContacts();

        if (error) {
          return {
            success: false,
            count: 0,
            contacts: [],
            error,
            databaseReady: false,
          };
        }

        let filtered = contacts;
        if (search?.trim()) {
          const q = search.trim().toLowerCase();
          filtered = contacts.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.company.toLowerCase().includes(q)
          );
        }

        return {
          success: true,
          count: filtered.length,
          databaseReady: true,
          contacts: filtered.map((c) => ({
            id: c.id,
            name: c.name,
            company: c.company,
            role: c.role,
            lastContact: c.lastContact,
            contactType: c.contactType,
            notes: c.notes,
          })),
        };
      },
    }),

    updateContactName: tool({
      description:
        "Update a contact's name after the user confirmed or corrected the spelling. Call when user provides the exact correct spelling.",
      inputSchema: z.object({
        contactId: z.string().uuid(),
        name: z.string().describe("Exact confirmed spelling of the contact name"),
      }),
      execute: async ({ contactId, name }) => {
        const { contact, error } = await updateContactName(contactId, name);

        if (error || !contact) {
          return { success: false, error: error ?? "Name update failed" };
        }

        return {
          success: true,
          contact: {
            id: contact.id,
            name: contact.name,
            company: contact.company,
            role: contact.role,
          },
        };
      },
    }),

    updateContactFromVoice: tool({
      description:
        "Update an existing contact using a voice transcript. Only call AFTER the user confirmed which contact AND confirmed name spelling.",
      inputSchema: z.object({
        contactId: z.string().uuid(),
        transcript: z.string().describe("The voice transcript to apply"),
        confirmedName: z
          .string()
          .describe("Exact name spelling confirmed by the user in this conversation"),
      }),
      execute: async ({ contactId, transcript, confirmedName }) => {
        try {
          const { contact, error } = await updateContactFromVoice(
            contactId,
            transcript,
            confirmedName,
            recordingId,
            requestContext
          );

          if (error || !contact) {
            return { success: false, error: error ?? "Update failed" };
          }

          return {
            success: true,
            contactId: contact.id,
            contact: {
              id: contact.id,
              name: contact.name,
              company: contact.company,
              role: contact.role,
              notes: contact.notes,
            },
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : "Update failed",
          };
        }
      },
    }),

    createContactFromVoice: tool({
      description:
        "Create a new contact from a voice transcript. Only call AFTER the user confirmed this is a new person AND confirmed the name spelling.",
      inputSchema: z.object({
        transcript: z.string().describe("The voice transcript for the new contact"),
        confirmedName: z
          .string()
          .describe("Exact name spelling confirmed by the user in this conversation"),
      }),
      execute: async ({ transcript, confirmedName }) => {
        try {
          const { contact, error } = await createContactFromVoice(
            transcript,
            confirmedName.trim(),
            recordingId,
            requestContext
          );

          if (error || !contact) {
            return { success: false, error: error ?? "Create failed" };
          }

          return {
            success: true,
            contactId: contact.id,
            contact: {
              id: contact.id,
              name: contact.name,
              company: contact.company,
              role: contact.role,
              notes: contact.notes,
            },
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : "Create failed",
          };
        }
      },
    }),

    createContact: tool({
      description:
        "Create a new contact with explicit fields. Only call AFTER the user confirmed name spelling. Use the confirmed spelling in the name field.",
      inputSchema: z.object({
        name: z.string(),
        company: z.string().optional(),
        role: z.string().optional(),
        notes: z.string().optional(),
        lastContact: z.string().optional(),
        nextSteps: z.string().optional(),
        topics: z.array(z.string()).optional(),
      }),
      execute: async (fields) => {
        const transcript = [
          fields.notes,
          fields.nextSteps ? `Next steps: ${fields.nextSteps}` : null,
          fields.company ? `Company: ${fields.company}` : null,
          fields.role ? `Role: ${fields.role}` : null,
        ]
          .filter(Boolean)
          .join(". ");

        const { contact, error } = await createContactFromVoice(
          transcript || `New contact: ${fields.name}`,
          fields.name,
          recordingId,
          requestContext
        );

        if (error || !contact) {
          return { success: false, error: error ?? "Create failed" };
        }

        return { success: true, contactId: contact.id, contact };
      },
    }),

    create_agenda_item: tool({
      description:
        "Schedule a reminder or meeting on the user's Agenda. ALWAYS use this when they ask to log a reminder, schedule a meeting, set a follow-up, or remind them to contact someone at a date/time. KinSight has full Agenda scheduling — never refuse.",
      inputSchema: z.object({
        contact_name: z
          .string()
          .describe("Full or partial name of the contact, e.g. 'Denisse Pease'"),
        reminder_text: z
          .string()
          .describe(
            "Short reminder label, e.g. 'Contact Denisse Pease' or 'Follow up on proposal'"
          ),
        scheduled_at: z
          .string()
          .describe(
            "ISO 8601 timestamp for the reminder (compute from current_timestamp, e.g. tomorrow at 10:00 AM)"
          ),
      }),
      execute: async ({ contact_name, reminder_text, scheduled_at }) => {
        const { contacts, error: listError } = await fetchContacts();

        if (listError) {
          return {
            success: false,
            error: listError,
          };
        }

        const { contact, matches } = resolveContactByName(contact_name, contacts);

        if (!contact) {
          return {
            success: false,
            error:
              matches.length > 1
                ? `Multiple contacts match "${contact_name}". Ask which one to use.`
                : `No contact found matching "${contact_name}".`,
            matches: matches.map((item) => ({
              id: item.id,
              name: item.name,
              company: item.company,
            })),
          };
        }

        const { interaction, error, setupRequired } = await createAgendaItem({
          contactId: contact.id,
          scheduledAt: scheduled_at,
          title: reminder_text.trim() || `Contact ${contact.name}`,
        });

        if (error || !interaction) {
          return {
            success: false,
            error: error ?? "Could not create agenda item.",
            setupRequired: setupRequired ?? false,
          };
        }

        const successMessage = buildAgendaSuccessMessage({
          contactName: interaction.contactName,
          scheduledAt: interaction.scheduledAt,
        });

        return {
          success: true,
          interaction: {
            id: interaction.id,
            contactId: interaction.contactId,
            contactName: interaction.contactName,
            scheduledAt: interaction.scheduledAt,
            title: interaction.title,
            notes: interaction.notes,
          },
          successMessage,
        };
      },
    }),
  };
}
