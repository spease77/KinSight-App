import type { UIMessage } from "ai";
import { getMessageText } from "@/lib/ai/message-text";
import { RECORDING_TAG_REGEX } from "@/types/source-metadata";

export function extractLatestRecordingId(
  messages: UIMessage[]
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;

    const text = getMessageText(message);
    const match = text.match(RECORDING_TAG_REGEX);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

export function stripRecordingTag(text: string): string {
  return text.replace(RECORDING_TAG_REGEX, "").trim();
}
