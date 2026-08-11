import type { UIMessage } from "ai";

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function withMessageText(message: UIMessage, text: string): UIMessage {
  const nonTextParts = message.parts.filter((part) => part.type !== "text");

  return {
    ...message,
    parts: [{ type: "text", text }, ...nonTextParts],
  };
}
