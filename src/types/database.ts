import type { ContactNoteEntry } from "@/lib/contacts/notes-log";
import type { ContactType } from "@/lib/contacts/contact-type";

export type ContactStatus = "hot" | "warm" | "cold";

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          name: string;
          company: string | null;
          role: string | null;
          status: ContactStatus;
          contact_type: ContactType | null;
          contact_type_needs_confirmation: boolean;
          avatar_storage_path: string | null;
          avatar_url: string | null;
          notes: string | null;
          last_contact: string | null;
          last_meeting_date: string | null;
          next_steps: string | null;
          topics: string[] | null;
          inquiry_transcript: string | null;
          notes_log: ContactNoteEntry[];
          profile: Record<string, string>;
          source_metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          is_tracking_paused: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          company?: string | null;
          role?: string | null;
          status?: ContactStatus;
          contact_type?: ContactType | null;
          contact_type_needs_confirmation?: boolean;
          avatar_storage_path?: string | null;
          avatar_url?: string | null;
          notes?: string | null;
          last_contact?: string | null;
          last_meeting_date?: string | null;
          next_steps?: string | null;
          topics?: string[] | null;
          inquiry_transcript?: string | null;
          notes_log?: ContactNoteEntry[];
          profile?: Record<string, string>;
          source_metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
          is_tracking_paused?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          company?: string | null;
          role?: string | null;
          status?: ContactStatus;
          contact_type?: ContactType | null;
          contact_type_needs_confirmation?: boolean;
          avatar_storage_path?: string | null;
          avatar_url?: string | null;
          notes?: string | null;
          last_contact?: string | null;
          last_meeting_date?: string | null;
          next_steps?: string | null;
          topics?: string[] | null;
          inquiry_transcript?: string | null;
          notes_log?: ContactNoteEntry[];
          profile?: Record<string, string>;
          source_metadata?: Record<string, unknown>;
          updated_at?: string;
          is_tracking_paused?: boolean;
        };
      };
      user_settings: {
        Row: {
          id: string;
          global_notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          global_notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          global_notifications_enabled?: boolean;
          updated_at?: string;
        };
      };
      maintenance_reminder_log: {
        Row: {
          id: string;
          contact_id: string;
          days_remaining_threshold: number;
          last_logged_at: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          days_remaining_threshold: number;
          last_logged_at: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          days_remaining_threshold?: number;
          last_logged_at?: string;
          sent_at?: string;
        };
      };
      voice_recordings: {
        Row: {
          id: string;
          contact_id: string | null;
          storage_path: string;
          mime_type: string;
          duration_ms: number | null;
          transcript: string;
          audio_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id?: string | null;
          storage_path: string;
          mime_type?: string;
          duration_ms?: number | null;
          transcript?: string;
          audio_url?: string | null;
          created_at?: string;
        };
        Update: {
          contact_id?: string | null;
          storage_path?: string;
          mime_type?: string;
          duration_ms?: number | null;
          transcript?: string;
          audio_url?: string | null;
        };
      };
      time_logs: {
        Row: {
          id: string;
          contact_id: string;
          duration_minutes: number;
          logged_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          duration_minutes: number;
          logged_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          contact_id?: string;
          duration_minutes?: number;
          logged_at?: string;
          notes?: string | null;
        };
      };
      scheduled_interactions: {
        Row: {
          id: string;
          contact_id: string;
          scheduled_at: string;
          title: string;
          behavioral_tags: string[];
          notes: string | null;
          source: string;
          external_event_id: string | null;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          scheduled_at: string;
          title: string;
          behavioral_tags?: string[];
          notes?: string | null;
          source?: string;
          external_event_id?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          contact_id?: string;
          scheduled_at?: string;
          title?: string;
          behavioral_tags?: string[];
          notes?: string | null;
          source?: string;
          external_event_id?: string | null;
          last_synced_at?: string | null;
        };
      };
    };
  };
}
