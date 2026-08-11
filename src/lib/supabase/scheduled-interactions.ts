import {

  extractBehavioralTagsFromProfile,

  resolveInteractionBehavioralTags,

} from "@/lib/psychological-profile";

import {

  isContactType,

  readContactTypeFromProfile,

} from "@/lib/contacts/contact-type";

import { createServerSupabase, humanizeSupabaseFetchError } from "@/lib/supabase/server";

import type { Database } from "@/types/database";

import {

  INTERACTION_SOURCES,

  type InteractionSource,

  type ScheduledInteraction,

} from "@/types/scheduled-interaction";

type ContactInteractionContextRow = Pick<
  Database["public"]["Tables"]["contacts"]["Row"],
  "id" | "name" | "contact_type" | "profile"
>;



const SCHEDULED_INTERACTION_SELECT =

  "id, contact_id, scheduled_at, title, behavioral_tags, notes, source, external_event_id, last_synced_at, contacts(id, name, contact_type, profile)";



type ScheduledInteractionRow = {

  id: string;

  contact_id: string;

  scheduled_at: string;

  title: string;

  behavioral_tags: string[] | null;

  notes: string | null;

  source?: string | null;

  external_event_id?: string | null;

  last_synced_at?: string | null;

  contacts: {

    id: string;

    name: string;

    contact_type: string | null;

    profile: Record<string, string> | null;

  } | null;

};



function isScheduledInteractionsTableMissing(message: string): boolean {

  const lower = message.toLowerCase();

  return (

    (lower.includes("schema cache") ||

      lower.includes("could not find") ||

      lower.includes("does not exist")) &&

    lower.includes("scheduled_interactions")

  );

}



function isInteractionSource(value: string | null | undefined): value is InteractionSource {

  return (

    typeof value === "string" &&

    (INTERACTION_SOURCES as readonly string[]).includes(value)

  );

}



function mapRow(row: ScheduledInteractionRow): ScheduledInteraction | null {

  const contact = row.contacts;

  if (!contact) return null;



  const profileType = readContactTypeFromProfile(contact.profile);

  const contactType =

    contact.contact_type && isContactType(contact.contact_type)

      ? contact.contact_type

      : profileType.contactType;



  return {

    id: row.id,

    contactId: row.contact_id,

    contactName: contact.name,

    contactType,

    scheduledAt: row.scheduled_at,

    title: row.title,

    durationMinutes: null,

    behavioralTags: resolveInteractionBehavioralTags({

      storedTags: row.behavioral_tags,

      profile: contact.profile,

    }),

    notes: row.notes,

    source: isInteractionSource(row.source) ? row.source : "kinsight",

    externalEventId: row.external_event_id ?? null,

    lastSyncedAt: row.last_synced_at ?? null,

  };

}



export async function fetchScheduledInteractions(): Promise<{

  interactions: ScheduledInteraction[];

  error?: string;

  setupRequired?: boolean;

}> {

  try {

    const supabase = createServerSupabase();



    const { data, error } = await supabase

      .from("scheduled_interactions")

      .select(SCHEDULED_INTERACTION_SELECT)

      .order("scheduled_at", { ascending: true });



    if (error) {

      if (isScheduledInteractionsTableMissing(error.message)) {

        console.warn(

          "scheduled_interactions table missing — run migration 015_scheduled_interactions.sql"

        );

        return { interactions: [], setupRequired: true };

      }



      console.error("scheduled_interactions fetch error:", error.message);

      return { interactions: [], error: humanizeSupabaseFetchError(error.message) };

    }



    const interactions = ((data ?? []) as ScheduledInteractionRow[])

      .map(mapRow)

      .filter((item): item is ScheduledInteraction => item !== null);



    return { interactions };

  } catch (err) {

    console.error("scheduled_interactions fetch error:", err);

    return {

      interactions: [],

      error:

        err instanceof Error

          ? err.message

          : "Could not load scheduled interactions.",

    };

  }

}



export async function fetchScheduledInteractionsByContactIds(

  contactIds: string[]

): Promise<{

  interactions: ScheduledInteraction[];

  error?: string;

  setupRequired?: boolean;

}> {

  const uniqueIds = [...new Set(contactIds.map((id) => id.trim()))].filter(

    Boolean

  );



  if (uniqueIds.length === 0) {

    return { interactions: [] };

  }



  try {

    const supabase = createServerSupabase();



    const { data, error } = await supabase

      .from("scheduled_interactions")

      .select(SCHEDULED_INTERACTION_SELECT)

      .in("contact_id", uniqueIds)

      .order("scheduled_at", { ascending: true });



    if (error) {

      if (isScheduledInteractionsTableMissing(error.message)) {

        return { interactions: [], setupRequired: true };

      }



      console.error("scheduled_interactions fetch by contact error:", error.message);

      return { interactions: [], error: humanizeSupabaseFetchError(error.message) };

    }



    const interactions = ((data ?? []) as ScheduledInteractionRow[])

      .map(mapRow)

      .filter((item): item is ScheduledInteraction => item !== null);



    return { interactions };

  } catch (err) {

    console.error("scheduled_interactions fetch by contact error:", err);

    return {

      interactions: [],

      error:

        err instanceof Error

          ? err.message

          : "Could not load scheduled interactions.",

    };

  }

}



export async function createAgendaItem(input: {

  contactId: string;

  scheduledAt: string;

  title: string;

  notes?: string | null;

}): Promise<{

  interaction?: ScheduledInteraction;

  error?: string;

  setupRequired?: boolean;

}> {

  const title = input.title.trim();

  if (!title) {

    return { error: "Agenda item title is required." };

  }



  const scheduledDate = new Date(input.scheduledAt);

  if (Number.isNaN(scheduledDate.getTime())) {

    return { error: "scheduledAt must be a valid ISO 8601 date-time." };

  }



  try {

    const supabase = createServerSupabase();



    const { data: contactData, error: contactError } = await supabase

      .from("contacts")

      .select("id, name, contact_type, profile")

      .eq("id", input.contactId)

      .maybeSingle();



    if (contactError) {

      return { error: contactError.message };

    }



    if (!contactData) {

      return { error: "Contact not found." };

    }

    const contactRow = contactData as ContactInteractionContextRow;



    const behavioralTags = extractBehavioralTagsFromProfile(

      contactRow.profile ?? null

    );



    const { data, error } = await supabase

      .from("scheduled_interactions")

      .insert({

        contact_id: input.contactId,

        scheduled_at: scheduledDate.toISOString(),

        title,

        behavioral_tags: behavioralTags,

        notes: input.notes?.trim() || null,

        source: "kinsight",

        external_event_id: null,

        last_synced_at: null,

      } as never)

      .select(SCHEDULED_INTERACTION_SELECT)

      .single();



    if (error) {

      if (isScheduledInteractionsTableMissing(error.message)) {

        return {

          setupRequired: true,

          error:

            "Agenda is not set up yet — run migration 015_scheduled_interactions.sql",

        };

      }



      console.error("scheduled_interactions insert error:", error.message);

      return { error: error.message };

    }



    const interaction = mapRow(data as ScheduledInteractionRow);

    if (!interaction) {

      return { error: "Could not load the new agenda item." };

    }



    return { interaction };

  } catch (err) {

    console.error("scheduled_interactions insert error:", err);

    return {

      error:

        err instanceof Error

          ? err.message

          : "Could not create agenda item.",

    };

  }

}

