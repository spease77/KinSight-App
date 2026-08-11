import type { UIMessage } from "ai";
import { getMessageText } from "@/lib/ai/message-text";

export type EntryMethod = "voice" | "manual";

export type AiRequestContext = {
  /** Full local date/time string from the device or server clock */
  current_timestamp: string;
  /** e.g. Thursday */
  day_of_week: string;
  entry_method: EntryMethod;
};

export type KinSightMessageMetadata = {
  entry_method?: EntryMethod;
};

/** Build context from a Date (client or server local timezone). */
export function buildRequestContext(
  entry_method: EntryMethod,
  date: Date = new Date()
): AiRequestContext {
  const day_of_week = date.toLocaleDateString("en-US", { weekday: "long" });
  const current_timestamp = date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  return {
    current_timestamp,
    day_of_week,
    entry_method,
  };
}

export function buildContextPromptBlock(context: AiRequestContext): string {
  return `## Session context
- current_timestamp: ${context.current_timestamp}
- day_of_week: ${context.day_of_week}
- entry_method: ${context.entry_method}`;
}

export function inferEntryMethodFromText(text: string): EntryMethod {
  return text.trimStart().startsWith("🎤") ? "voice" : "manual";
}

export function getMessageEntryMethod(
  message: UIMessage
): EntryMethod | undefined {
  const metadata = message.metadata as KinSightMessageMetadata | undefined;
  return metadata?.entry_method;
}

/** Resolve context for the agent from the request body and latest user message. */
export function resolveAgentRequestContext(
  messages: UIMessage[],
  requestContext?: Partial<AiRequestContext> | null
): AiRequestContext {
  const latestUser = [...messages].reverse().find((m) => m.role === "user");
  const text = latestUser ? getMessageText(latestUser) : "";

  const entry_method =
    requestContext?.entry_method ??
    (latestUser ? getMessageEntryMethod(latestUser) : undefined) ??
    (text ? inferEntryMethodFromText(text) : "manual");

  if (
    requestContext?.current_timestamp &&
    requestContext?.day_of_week &&
    requestContext?.entry_method
  ) {
    return {
      current_timestamp: requestContext.current_timestamp,
      day_of_week: requestContext.day_of_week,
      entry_method: requestContext.entry_method,
    };
  }

  if (requestContext?.current_timestamp && requestContext?.day_of_week) {
    return {
      current_timestamp: requestContext.current_timestamp,
      day_of_week: requestContext.day_of_week,
      entry_method,
    };
  }

  return buildRequestContext(entry_method);
}
