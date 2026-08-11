"use client";

import { Fragment, type ReactNode } from "react";
import { AssistantMarkdown } from "@/components/AssistantMarkdown";
import { SourceCitation } from "@/components/SourceCitation";
import { SOURCE_MARKER_REGEX } from "@/types/source-metadata";

export function AssistantMessageText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(SOURCE_MARKER_REGEX.source, "g");

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <AssistantMarkdown
          key={`md-${lastIndex}`}
          content={text.slice(lastIndex, match.index)}
        />
      );
    }

    const contactId = match[1];
    const fieldKey = match[2];
    parts.push(
      <SourceCitation
        key={`${match.index}-${contactId}-${fieldKey}`}
        contactId={contactId}
        fieldKey={fieldKey}
      />
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <AssistantMarkdown key={`md-${lastIndex}`} content={text.slice(lastIndex)} />
    );
  }

  if (parts.length === 0) {
    return <AssistantMarkdown content={text} />;
  }

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}
