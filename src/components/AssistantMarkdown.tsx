"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="assistant-markdown-heading mt-3 mb-2 first:mt-0 text-sm font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="assistant-markdown-subheading mt-2.5 mb-1.5 first:mt-0 text-sm font-semibold text-accent-primary-bright">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="assistant-markdown-paragraph mb-2 last:mb-0 leading-relaxed">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="assistant-markdown-list mb-2 list-disc space-y-1.5 pl-5 last:mb-0 marker:text-accent-primary-bright">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="assistant-markdown-list mb-2 list-decimal space-y-1.5 pl-5 last:mb-0 marker:text-muted">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="assistant-markdown-list-item leading-relaxed pl-0.5">
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="text-foreground/90">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-accent-primary-bright underline decoration-accent-primary/40 underline-offset-2"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote
      className="my-2 border-l-2 border-accent-primary/40 pl-3 text-muted"
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border-green/40" />,
  code: ({ children }) => (
    <code className="rounded bg-main/60 px-1 py-0.5 font-mono text-[0.8125rem] text-foreground">
      {children}
    </code>
  ),
};

export function AssistantMarkdown({ content }: { content: string }) {
  const trimmed = content.trim();
  if (!trimmed) return null;

  return (
    <div className="assistant-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
