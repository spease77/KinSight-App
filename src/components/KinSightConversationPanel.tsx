"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { isFileUIPart } from "ai";
import { FileText, Mic, Plus, Send, User } from "lucide-react";
import { ComposerAttachSheet } from "@/components/composer/ComposerAttachSheet";
import { ComposerAttachmentPreviews } from "@/components/composer/ComposerAttachmentPreviews";
import type { ComposerAttachmentPreview } from "@/lib/composer/attachments";
import { getMessageText } from "@/lib/ai/message-text";
import { stripRecordingTag } from "@/lib/agent/extract-recording-id";
import { AssistantMessageBubble } from "@/components/AssistantMessageBubble";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import type { MicrophoneAccessFailure } from "@/lib/audio/voice-support";

interface KinSightConversationPanelProps {
  transcript: string;
  isRecording: boolean;
  isTranscribing?: boolean;
  isAgentResponding?: boolean;
  isSpeaking?: boolean;
  isDetectingContacts?: boolean;
  voiceError: string | null;
  onTranscriptChange: (text: string) => void;
  onTranscriptClear: () => void;
  onSubmitNotes?: (text: string) => void;
  messages: UIMessage[];
  isLoading: boolean;
  onUpdateMessage?: (messageId: string, newText: string) => void;
  speechEnabled?: boolean;
  onToggleSpeech?: () => void;
  playbackBlocked?: boolean;
  onReplaySpeech?: () => void;
  replyValue: string;
  onReplyChange: (value: string) => void;
  onReplySubmit: () => void;
  chatError?: Error;
  conversationStarted?: boolean;
  onMicToggle?: (stream?: MediaStream) => void;
  onMicAccessFailure?: (failure: MicrophoneAccessFailure) => void;
  micDisabled?: boolean;
  isMicBusy?: boolean;
  volumeLevel?: number;
  onReplyFocus?: () => void;
  onReplyBlur?: () => void;
  homeComposerAnchored?: boolean;
  composerAttachments?: ComposerAttachmentPreview[];
  onAddComposerFiles?: (files: File[]) => void;
  onRemoveComposerAttachment?: (id: string) => void;
  composerAttachError?: string | null;
}

export function KinSightConversationPanel({
  transcript,
  isRecording,
  isTranscribing = false,
  isAgentResponding = false,
  isSpeaking = false,
  isDetectingContacts = false,
  voiceError,
  onTranscriptChange,
  onTranscriptClear,
  onSubmitNotes,
  messages,
  isLoading,
  onUpdateMessage,
  speechEnabled = true,
  onToggleSpeech,
  playbackBlocked = false,
  onReplaySpeech,
  replyValue,
  onReplyChange,
  onReplySubmit,
  chatError,
  conversationStarted = false,
  onMicToggle,
  onMicAccessFailure,
  micDisabled = false,
  isMicBusy = false,
  volumeLevel = 0,
  onReplyFocus,
  onReplyBlur,
  homeComposerAnchored = false,
  composerAttachments = [],
  onAddComposerFiles,
  onRemoveComposerAttachment,
  composerAttachError = null,
}: KinSightConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const canAttach = Boolean(onAddComposerFiles);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isProcessing =
    isTranscribing || isAgentResponding || isDetectingContacts;
  const showMessageHistory =
    conversationStarted && (messages.length > 0 || isLoading);

  const statusLabel = isTranscribing
    ? "Transcribing…"
    : isDetectingContacts
      ? "Finding people in your note…"
      : isAgentResponding
        ? "KinSight is thinking…"
        : isSpeaking
          ? "KinSight is speaking…"
          : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!conversationStarted) return;

    const scrollMessagesToEnd = () => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    };

    const input = replyInputRef.current;
    input?.addEventListener("focus", scrollMessagesToEnd);
    window.visualViewport?.addEventListener("resize", scrollMessagesToEnd);

    return () => {
      input?.removeEventListener("focus", scrollMessagesToEnd);
      window.visualViewport?.removeEventListener("resize", scrollMessagesToEnd);
    };
  }, [conversationStarted]);

  const handleReplySubmit = (e: FormEvent) => {
    e.preventDefault();
    onReplySubmit();
  };

  const openAttachSheet = useCallback(() => {
    if (!canAttach || isLoading) return;
    setAttachSheetOpen(true);
  }, [canAttach, isLoading]);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (list?.length && onAddComposerFiles) {
        onAddComposerFiles(Array.from(list));
      }
      event.target.value = "";
      setAttachSheetOpen(false);
    },
    [onAddComposerFiles]
  );

  const showAttachButton = canAttach;

  const attachPlusButton = (anchored: boolean) => (
    <button
      type="button"
      onClick={openAttachSheet}
      disabled={isLoading}
      className={
        anchored
          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-icon transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
      }
      aria-label="Add to message"
      aria-haspopup="dialog"
      aria-expanded={attachSheetOpen}
    >
      <Plus className={anchored ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2} />
    </button>
  );

  const canSend =
    (replyValue.trim().length > 0 || composerAttachments.length > 0) &&
    !isLoading;

  const askBarForm = (
    <form
      onSubmit={handleReplySubmit}
      className={
        conversationStarted
          ? "home-ask-bar home-ask-bar--conversation"
          : homeComposerAnchored
            ? "home-ask-bar home-ask-bar--state-a relative flex w-full items-center"
            : "home-ask-bar shrink-0"
      }
      suppressHydrationWarning
    >
      {conversationStarted && onMicToggle ? (
        <>
          <MicrophoneButton
            variant="compact"
            isRecording={isRecording}
            isBusy={isMicBusy}
            onToggle={onMicToggle}
            onMicAccessFailure={onMicAccessFailure}
            disabled={micDisabled}
            volumeLevel={volumeLevel}
          />
          {showAttachButton ? attachPlusButton(true) : null}
        </>
      ) : showAttachButton && homeComposerAnchored ? (
        attachPlusButton(true)
      ) : showAttachButton ? (
        attachPlusButton(false)
      ) : homeComposerAnchored ? (
        <span className="h-8 w-8 shrink-0" aria-hidden="true" />
      ) : (
        <span className="h-9 w-9 shrink-0" aria-hidden="true" />
      )}
      {isClient ? (
        <label
          className={
            homeComposerAnchored
              ? "home-ask-bar__field min-w-0 flex-1 cursor-text"
              : "home-ask-bar__field min-w-0 flex-1 cursor-text"
          }
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            replyInputRef.current?.focus({ preventScroll: true });
          }}
        >
          <input
            ref={replyInputRef}
            id="kinsight-ask"
            type="text"
            value={replyValue}
            onChange={(e) => onReplyChange(e.target.value)}
            onFocus={() => onReplyFocus?.()}
            onBlur={() => onReplyBlur?.()}
            placeholder={
              isLoading ? "KinSight is thinking…" : "Ask KinSight..."
            }
            disabled={isLoading}
            enterKeyHint="send"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="kinsight-ask"
            data-1p-ignore="true"
            data-lpignore="true"
            suppressHydrationWarning
            className={
              homeComposerAnchored
                ? "w-full min-w-0 border-0 bg-transparent py-2 pl-1 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50"
                : "w-full min-w-0 border-0 bg-transparent px-1 py-2 text-base text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50 sm:text-sm"
            }
          />
        </label>
      ) : (
        <div
          className="min-w-0 flex-1 px-1 py-2 text-base text-muted sm:text-sm"
          aria-hidden="true"
        >
          Ask KinSight...
        </div>
      )}
      <button
        type="submit"
        disabled={!canSend}
        className={
          homeComposerAnchored
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ui-btn-orange active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            : `
          flex h-9 w-9 shrink-0 items-center justify-center rounded-full ui-btn-orange
          active:scale-95 disabled:cursor-not-allowed disabled:opacity-40
        `
        }
        aria-label="Send message"
      >
        <Send className="h-4 w-4" strokeWidth={2} />
      </button>
    </form>
  );

  return (
    <section
      aria-label="KinSight chat"
      className={`flex min-h-0 flex-col ${
        conversationStarted
          ? "home-conversation-panel w-full flex-1 gap-0 px-0 pt-0"
          : "w-full gap-3"
      }`}
    >
      {showMessageHistory && (
        <div
          ref={scrollRef}
          className={`contacts-scroll flex flex-col gap-4 overflow-y-auto ${
            conversationStarted
              ? "kinsight-conversation-messages min-h-0 flex-1"
              : "ui-card ui-card-tint-green max-h-[34vh] border-border-green p-3 sm:max-h-[38vh]"
          }`}
        >
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const text = getMessageText(message);
            const fileParts = message.parts.filter(isFileUIPart);
            const isVoice = text.startsWith("🎤");
            const displayText = isVoice ? stripRecordingTag(text) : text;
            const isLastMessage = index === messages.length - 1;

            if (!displayText && fileParts.length === 0) return null;

            return (
              <div
                key={message.id}
                className={isUser ? "flex flex-row-reverse gap-2.5" : "w-full"}
              >
                {isUser && (
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-orange-muted"
                    aria-hidden="true"
                  >
                    {isVoice ? (
                      <Mic className="h-4 w-4 text-icon" strokeWidth={2} />
                    ) : (
                      <User className="h-4 w-4 text-icon" strokeWidth={2} />
                    )}
                  </div>
                )}
                {isUser ? (
                  <div className="max-w-[85%] space-y-2 rounded-xl bg-accent-orange-muted px-3.5 py-2.5 type-editorial text-sm text-foreground">
                    {fileParts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {fileParts.map((part, partIndex) =>
                          part.mediaType.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={`${message.id}-file-${partIndex}`}
                              src={part.url}
                              alt={part.filename ?? "Attached image"}
                              className="max-h-40 max-w-full rounded-lg object-cover"
                            />
                          ) : (
                            <div
                              key={`${message.id}-file-${partIndex}`}
                              className="flex items-center gap-2 rounded-lg bg-background/40 px-2 py-1.5 text-xs"
                            >
                              <FileText
                                className="h-4 w-4 shrink-0 text-icon"
                                strokeWidth={2}
                              />
                              <span className="truncate">
                                {part.filename ?? "Attached file"}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    {displayText ? <p>{displayText}</p> : null}
                  </div>
                ) : (
                  <AssistantMessageBubble
                    messageId={message.id}
                    text={displayText}
                    onUpdateText={onUpdateMessage}
                    editDisabled={isLoading && isLastMessage}
                  />
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="w-full px-0.5">
              <div className="flex w-full items-center gap-1 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-blue [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-orange [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-green [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {conversationStarted && statusLabel && (
            <p className="type-meta shrink-0 px-1 text-center text-foreground">
              {statusLabel}
            </p>
          )}

          {conversationStarted && voiceError && (
            <p className="shrink-0 px-1 text-center text-xs text-red-400" role="alert">
              {voiceError}
            </p>
          )}

          {conversationStarted && chatError && (
            <p className="shrink-0 px-1 text-center text-xs text-red-400" role="alert">
              {chatError.message || "KinSight couldn't respond. Please try again."}
            </p>
          )}
        </div>
      )}

      {canAttach && (
        <>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleFileInputChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleFileInputChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.md,.json,image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleFileInputChange}
          />
          <ComposerAttachSheet
            isOpen={attachSheetOpen}
            onClose={() => setAttachSheetOpen(false)}
            onUploadPhoto={() => galleryInputRef.current?.click()}
            onTakePhoto={() => cameraInputRef.current?.click()}
            onUploadFile={() => fileInputRef.current?.click()}
          />
        </>
      )}

      {conversationStarted ? (
        <div className="home-composer-dock shrink-0">
          {composerAttachments.length > 0 && onRemoveComposerAttachment && (
            <ComposerAttachmentPreviews
              attachments={composerAttachments}
              onRemove={onRemoveComposerAttachment}
              compact
            />
          )}
          {composerAttachError && (
            <p className="px-1 pb-1 text-xs text-red-400" role="alert">
              {composerAttachError}
            </p>
          )}
          {askBarForm}
        </div>
      ) : (
        <div className="home-composer-dock shrink-0">
          {composerAttachments.length > 0 && onRemoveComposerAttachment && (
            <ComposerAttachmentPreviews
              attachments={composerAttachments}
              onRemove={onRemoveComposerAttachment}
            />
          )}
          {composerAttachError && (
            <p className="px-1 pb-1 text-xs text-red-400" role="alert">
              {composerAttachError}
            </p>
          )}
          {askBarForm}
        </div>
      )}

      {statusLabel && !conversationStarted && (
        <p className="type-meta px-1 text-foreground">{statusLabel}</p>
      )}

      {!conversationStarted && voiceError && (
        <p className="px-1 text-xs text-red-400" role="alert">
          {voiceError}
        </p>
      )}

      {!conversationStarted && chatError && (
        <p className="px-1 text-xs text-red-400" role="alert">
          {chatError.message || "KinSight couldn't respond. Please try again."}
        </p>
      )}
    </section>
  );
}
