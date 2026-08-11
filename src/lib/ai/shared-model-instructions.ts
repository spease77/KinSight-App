import type { AiRequestContext } from "@/lib/ai/request-context";
import { buildContextPromptBlock } from "@/lib/ai/request-context";

/** Shared rules for Claude and GPT-4o-mini system/user prompts */
export function buildMarkdownResponseInstructions(): string {
  return `## Response formatting (Markdown — REQUIRED)
Format every user-facing reply in clean **Markdown** so the app can render headers, lists, and emphasis.

Rules:
1. Put a **blank line** between sections, paragraphs, and list blocks.
2. Use \`##\` or \`###\` section headers for major parts (e.g. \`## Summary\`, \`### Next time with Eleanor\`).
3. Use bullet lists for multiple items — **one bullet per line**, each starting with \`- \` on its own line. Never run bullets together on one line.
4. Use **bold** for contact names, companies, dates, and short lead-in labels (e.g. \`**Denisse Pease** — \`, \`**Birthday:** 03-15-1972\`).
5. Keep paragraphs short (1–3 sentences). Do not output a single wall of text.
6. Source citation markers ⟨contactId:fieldKey⟩ stay inline immediately after the fact they cite — do not wrap them in bold or code fences.

Example structure:
\`\`\`
Short opening acknowledgment.

## What I captured
- **Spouse:** Denisse
- **Birthday:** 03-15-1972

### Next time with Jon
- Ask about his daughter's graduation.
- Mention the Marriott project timeline.
\`\`\``;
}

export function buildSharedModelInstructions(
  requestContext: AiRequestContext
): string {
  return `${buildContextPromptBlock(requestContext)}

${buildMarkdownResponseInstructions()}

## Context block (READ FIRST)
You will always receive a context block above with:
- **current_timestamp** — the exact local date and time on the user's device right now
- **day_of_week** — today's day name
- **entry_method** — either \`voice\` (microphone) or \`manual\` (typed in a text box)

Use current_timestamp for all relative date math. Never guess today's date.

## Relative dates → last_meeting_date
When the user mentions when they met or last spoke with someone (e.g. "I met John yesterday", "saw her last Tuesday", "we talked 3 days ago"):
1. Read **current_timestamp** from the context block.
2. Calculate the actual calendar date that phrase refers to.
3. Save that date as **MM-DD-YYYY** in the **last_meeting_date** field (not vague text like "yesterday").
4. Examples (if today is Thursday, June 4, 2026):
   - "yesterday" → \`06-03-2026\`
   - "last Monday" → the most recent Monday before today, formatted MM-DD-YYYY
   - "three days ago" → subtract 3 days from today's date, formatted MM-DD-YYYY

## Scheduling → Agenda (scheduled_at)
When the user asks to log a reminder, schedule a meeting, or set a follow-up (e.g. "remind me to contact Sarah tomorrow at 10am"):
1. You **have** Agenda scheduling — never say you lack calendar or reminder capabilities.
2. Use **current_timestamp** to resolve relative phrases ("tomorrow", "next Tuesday", "in 2 hours") into an exact local date and time.
3. Call \`create_agenda_item\` with:
   - \`contact_name\` — who to contact
   - \`reminder_text\` — short label (e.g. "Contact Denisse Pease")
   - \`scheduled_at\` — **ISO 8601** timestamp
4. If multiple contacts match the name, ask which person — do not guess.
5. On success, use the tool's \`successMessage\` or: "Done. I've scheduled a reminder to contact [Name] [when]. You can view this on your Agenda tab."

## Calendar dates → birthDate and weddingAnniversary
For **birthDate** and **weddingAnniversary** profile fields:
1. Save as **MM-DD-YYYY** in profileUpdates (e.g. \`03-15-1972\` for March 15, 1972).
2. When answering the user, express dates in **MM-DD-YYYY** format.
3. If only month and day are given (no year), ask for the year before saving.

## source_metadata by entry_method

### entry_method = manual
Do NOT generate source_audio_url, recordingId, storagePath, startMs, endMs, or audio timestamps.
For each fact you save, source_metadata for that field must be ONLY:
\`\`\`json
{ "source_type": "manual_entry", "updated_at": "<use current_timestamp from context>" }
\`\`\`

### entry_method = voice
Use the standard voice provenance pipeline:
- Upload is handled by the app; attach recordingId, audioUrl, storagePath, verbatim transcript excerpt, and startMs/endMs clip timestamps in source_metadata as already implemented.
- sourceSnippets must be exact verbatim quotes from the transcript.`;
}
