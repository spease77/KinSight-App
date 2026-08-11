"use client";

import { FormEvent, useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { Bot, Mic, Send, User, Volume2, VolumeX } from "lucide-react";
import { getMessageText } from "@/lib/ai/message-text";
import { stripRecordingTag } from "@/lib/agent/extract-recording-id";
import { AssistantMessageText } from "@/components/AssistantMessageText";

interface ChatPanelProps {
  messages: UIMessage[];
  isLoading: boolean;
  isSpeaking?: boolean;
  speechEnabled?: boolean;
  onToggleSpeech?: () => void;
  onReplay?: () => void;
  replyValue: string;
  onReplyChange: (value: string) => void;
  onReplySubmit: () => void;
  error?: Error;
}

export function ChatPanel({
  messages,
  isLoading,
  isSpeaking = false,
  speechEnabled = true,
  onToggleSpeech,
  onReplay,
  replyValue,
  onReplyChange,
  onReplySubmit,
  error,
}: ChatPanelProps) {
  const hasAssistantReply = messages.some((m) => m.role === "assistant");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onReplySubmit();
  };

  return (
    <section
      aria-labelledby="chat-heading"
      className="flex w-full max-w-sm flex-col gap-2"
    >
      <div className="flex items-center justify-between px-1">
        <h2
          id="chat-heading"
          className="type-section-title font-sans text-lg tracking-tight"
        >
          KinSight Conversation
        </h2>
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <span className="type-meta text-accent-blue">
              Speaking…
            </span>
          )}
          {onToggleSpeech && (
            <button
              type="button"
              onClick={onToggleSpeech}
              className="text-muted transition-colors hover:text-accent-blue"
              aria-label={speechEnabled ? "Mute voice" : "Enable voice"}
            >
              {speechEnabled ? (
                <Volume2 className="h-4 w-4 text-accent-blue" strokeWidth={2} />
              ) : (
                <VolumeX className="h-4 w-4 text-accent-blue" strokeWidth={2} />
              )}
            </button>
          )}
        </div>
      </div>

      {messages.length === 0 && !isLoading && !error ? (
        <p className="ui-card type-editorial border-dashed px-4 py-5 text-center text-sm text-muted">
          Record a voice note and KinSight will respond — confirm name spelling,
          capture details, and suggest what to ask next time.
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="contacts-scroll ui-card flex max-h-[34vh] flex-col gap-3 overflow-y-auto bg-main p-3 sm:max-h-[38vh]"
        >
          {messages.map((message) => {
            const isUser = message.role === "user";
            const text = getMessageText(message);
            const isVoice = text.startsWith("🎤");
            const displayText = isVoice ? stripRecordingTag(text) : text;

            if (!displayText) return null;

            return (
              <div
                key={message.id}
                className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`
                    flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                    ${isUser ? "bg-accent-blue-muted" : "border border-border bg-card-hover"}
                  `}
                  aria-hidden="true"
                >
                  {isUser ? (
                    isVoice ? (
                      <Mic className="h-4 w-4 text-accent-blue" strokeWidth={2} />
                    ) : (
                      <User className="h-4 w-4 text-accent-blue" strokeWidth={2} />
                    )
                  ) : (
                    <Bot className="h-4 w-4 text-accent-green" strokeWidth={2} />
                  )}
                </div>
                <div
                  className={`
                    max-w-[85%] rounded-xl px-3.5 py-2.5 type-editorial text-sm
                    ${
                      isUser
                        ? "bg-accent-blue-muted text-foreground"
                        : "border border-border bg-card-hover text-foreground"
                    }
                  `}
                >
                  {isUser ? (
                    displayText
                  ) : (
                    <AssistantMessageText text={displayText} />
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card-hover">
                <Bot className="h-4 w-4 text-accent-green" strokeWidth={2} />
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border bg-card-hover px-3.5 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-blue [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-orange [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-green [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>
      )}

      {hasAssistantReply && onReplay && speechEnabled && !isLoading && (
        <button
          type="button"
          onClick={onReplay}
          disabled={isSpeaking}
          className="
            ui-card flex w-full items-center justify-center gap-2 px-3 py-2.5
            text-xs font-medium text-muted transition-all
            hover:border-accent-blue/50 hover:text-accent-blue
            disabled:opacity-40
          "
        >
          <Volume2 className="h-3.5 w-3.5 text-accent-blue" strokeWidth={2} />
          {isSpeaking ? "Speaking…" : "Hear last response"}
        </button>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={replyValue}
          onChange={(e) => onReplyChange(e.target.value)}
          placeholder={
            isLoading ? "KinSight is thinking…" : "Type your reply…"
          }
          disabled={isLoading}
          className="ui-input min-w-0 flex-1 px-4 py-3 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!replyValue.trim() || isLoading}
          className="
            flex h-11 w-11 shrink-0 items-center justify-center ui-btn-primary
            active:scale-95 disabled:cursor-not-allowed disabled:opacity-40
          "
          aria-label="Send reply"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>

      {error && (
        <p className="px-1 text-xs text-red-400" role="alert">
          {error.message || "KinSight couldn't respond. Please try again."}
        </p>
      )}
    </section>
  );
}
