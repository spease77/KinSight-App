import { parseContactImportText } from "@/lib/contacts/parse-contact-file";
import { syncPhoneContacts } from "@/lib/supabase/contacts";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024 * 1024;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function textFromUnknown(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Contact file is too large." }, 413);
    }

    const contentType = req.headers.get("content-type") ?? "";
    let text = raw;

    if (contentType.includes("application/json")) {
      try {
        const parsed = JSON.parse(raw) as {
          vcard?: unknown;
          csv?: unknown;
          text?: unknown;
        };
        text =
          textFromUnknown(parsed.vcard) ||
          textFromUnknown(parsed.csv) ||
          textFromUnknown(parsed.text) ||
          raw;
      } catch {
        return jsonResponse({ error: "Could not read that contact payload." }, 400);
      }
    }

    const contacts = parseContactImportText(text);
    if (contacts.length === 0) {
      return jsonResponse(
        { error: "No contacts found. Check the Shortcut sent names, phones, or emails." },
        400
      );
    }

    const result = await syncPhoneContacts(contacts);
    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse({
      success: true,
      added: result.added,
      merged: result.merged,
      skipped: result.skipped,
      summary: result.summary,
    });
  } catch (err) {
    console.error("Contact import-file error:", err);
    return jsonResponse(
      { error: "Could not import contacts. Please try again." },
      500
    );
  }
}
