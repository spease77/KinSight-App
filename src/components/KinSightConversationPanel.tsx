"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { Mic, Plus, Send, User, Volume2, VolumeX } from "lucide-react";
import { getMessageText } from "@/lib/ai/message-text";
import { stripRecordingTag } from "@/lib/agent/extract-recording-id";
import { AssistantMessageBubble, type MessageLogStatus } from "@/components/AssistantMessageBubble";
import { messageHasLoggableIntelligence } from "@/lib/ai/loggable-message";
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
  onLogToKinSight?: (messageId: string) => void;
  messageLogStates?: Record<string, MessageLogStatus>;
  messageLogSuccessLabels?: Record<string, string>;
  speechEnabled?: boolean;
  onToggleSpeech?: () => void;
  replyValue: string;
  onReplyChange: (value: string) => void;
  onReplySubmit: () => void;
  /** Deferred until tap gesture ends — avoids iOS focus loss when dock goes fixed. */
  onDockKeyboardOpen?: () => void;
  onDockKeyboardClose?: () => void;
  chatError?: Error;
  conversationStarted?: boolean;
  /** True when the composer dock should pin above the soft keyboard. */
  dockKeyboardOpen?: boolean;
  onMicToggle?: (stream?: MediaStream) => void;
  onMicAccessFailure?: (failure: MicrophoneAccessFailure) => void;
  micDisabled?: boolean;
  isMicBusy?: boolean;
  volumeLevel?: number;
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
  onLogToKinSight,
  messageLogStates = {},
  messageLogSuccessLabels = {},
  speechEnabled = true,
  onToggleSpeech,
  replyValue,
  onReplyChange,
  onReplySubmit,
  onDockKeyboardOpen,
  onDockKeyboardClose,
  chatError,
  conversationStarted = false,
  dockKeyboardOpen = false,
  onMicToggle,
  onMicAccessFailure,
  micDisabled = false,
  isMicBusy = false,
  volumeLevel = 0,
}: KinSightConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const dockActivationPendingRef = useRef(false);

  const scheduleDockActivation = useCallback(() => {
    if (!onDockKeyboardOpen) return;

    dockActivationPendingRef.current = true;

    const activate = () => {
      if (!dockActivationPendingRef.current) return;
      dockActivationPendingRef.current = false;
      onDockKeyboardOpen();
    };

    // Defer layout shifts until the tap gesture finishes — iOS drops focus
    // when the dock jumps to fixed positioning mid-gesture.
    window.addEventListener("pointerup", activate, { once: true, capture: true });
    window.addEventListener("touchend", activate, { once: true, capture: true });
  }, [onDockKeyboardOpen]);

  const cancelDockActivation = useCallback(() => {
    dockActivationPendingRef.current = false;
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

  const handleReplySubmit = (e: FormEvent) => {
    e.preventDefault();
    onReplySubmit();
  };

  const askBarForm = (
    <form
      onSubmit={handleReplySubmit}
      className={
        conversationStarted
          ? "home-ask-bar home-ask-bar--conversation"
          : "home-ask-bar shrink-0"
      }
      suppressHydrationWarning
    >
      {conversationStarted && onMicToggle ? (
        <MicrophoneButton
          variant="compact"
          isRecording={isRecording}
          isBusy={isMicBusy}
          onToggle={onMicToggle}
          onMicAccessFailure={onMicAccessFailure}
          disabled={micDisabled}
          volumeLevel={volumeLevel}
        />
      ) : (
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-icon transition-colors hover:bg-card-hover hover:text-foreground"
          aria-label="Add to message"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </button>
      )}
      {isClient ? (
        <label
          className="home-ask-bar__field min-w-0 flex-1 cursor-text"
          onMouseDown={(event) => {
            if (event.target !== replyInputRef.current) {
              event.preventDefault();
            }
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
            onFocus={() => {
              scheduleDockActivation();
            }}
            onBlur={() => {
              cancelDockActivation();
              onDockKeyboardClose?.();
            }}
            placeholder={
              isLoading ? "KinSight is thinking…" : "Ask about a contact..."
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
            className="w-full min-w-0 border-0 bg-transparent px-1 py-2 text-base text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50 sm:text-sm"
          />
        </label>
      ) : (
        <div
          className="min-w-0 flex-1 px-1 py-2 text-base text-muted sm:text-sm"
          aria-hidden="true"
        >
          Ask about a contact...
        </div>
      )}
      <button
        type="submit"
        disabled={!replyValue.trim() || isLoading}
        className="
          flex h-9 w-9 shrink-0 items-center justify-center rounded-full ui-btn-orange
          active:scale-95 disabled:cursor-not-allowed disabled:opacity-40
        "
        aria-label="Send message"
      >
        <Send className="h-4 w-4" strokeWidth={2} />
      </button>
    </form>
  );

  return (
    <section
      aria-label="KinSight chat"
      className={`flex min-h-0 flex-col gap-3 ${
        conversationStarted
          ? "w-full flex-1 px-5 pt-2"
          : "w-full max-w-sm"
      }`}
    >
      {conversationStarted && (isSpeaking || onToggleSpeech) && (
        <div className="flex items-center justify-end gap-2 px-1">
          {isSpeaking && (
            <span className="type-meta text-foreground">Speaking…</span>
          )}
          {onToggleSpeech && (
            <button
              type="button"
              onClick={onToggleSpeech}
              className="text-icon transition-colors hover:text-foreground"
              aria-label={speechEnabled ? "Mute voice" : "Enable voice"}
            >
              {speechEnabled ? (
                <Volume2 className="h-4 w-4 text-icon" strokeWidth={2} />
              ) : (
                <VolumeX className="h-4 w-4 text-icon" strokeWidth={2} />
              )}
            </button>
          )}
        </div>
      )}

      {showMessageHistory && (
        <div
          ref={scrollRef}
          className={`contacts-scroll ui-card ui-card-tint-green flex flex-col gap-3 overflow-y-auto border-border-green p-3 ${
            conversationStarted
              ? "min-h-0 flex-1"
              : "max-h-[34vh] sm:max-h-[38vh]"
          }`}
        >
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const text = getMessageText(message);
            const isVoice = text.startsWith("🎤");
            const displayText = isVoice ? stripRecordingTag(text) : text;
            const isLastMessage = index === messages.length - 1;

            if (!displayText) return null;

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
                  <div className="max-w-[85%] rounded-xl bg-accent-orange-muted px-3.5 py-2.5 type-editorial text-sm text-foreground">
                    {displayText}
                  </div>
                ) : (
                  <AssistantMessageBubble
                    messageId={message.id}
                    text={displayText}
                    onUpdateText={onUpdateMessage}
                    editDisabled={isLoading && isLastMessage}
                    showLogButton={messageHasLoggableIntelligence(displayText)}
                    logStatus={messageLogStates[message.id] ?? "idle"}
                    logSuccessMessage={
                      messageLogSuccessLabels[message.id] ?? "Saved to Contacts!"
                    }
                    onLogToKinSight={onLogToKinSight}
                  />
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="w-full">
              <div className="flex w-full items-center gap-1 rounded-xl border border-border bg-card-hover px-3.5 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-blue [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-orange [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-green [animation-delay:300ms]" />
              </div>
            </div>
          )}
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

      {conversationStarted ? (
        <div className="home-composer-dock mt-auto shrink-0">{askBarForm}</div>
      ) : (
        <>
          {dockKeyboardOpen ? (
            <div
              className="home-composer-dock-spacer"
              aria-hidden="true"
            />
          ) : null}
          <div
            className={`home-composer-dock shrink-0${
              dockKeyboardOpen ? " home-composer-dock--keyboard-open" : ""
            }`}
          >
            {askBarForm}
          </div>
        </>
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
