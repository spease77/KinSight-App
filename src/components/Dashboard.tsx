"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Header } from "@/components/Header";
import { MicrophoneButton } from "@/components/MicrophoneButton";
import { KinSightConversationPanel } from "@/components/KinSightConversationPanel";
import { ProposedContactModal } from "@/components/ProposedContactModal";
import { MicPermissionModal } from "@/components/MicPermissionModal";
import { unlockSpeechSynthesis, stopSpeaking } from "@/lib/audio/speech";
import type { MicrophoneAccessFailure } from "@/lib/audio/voice-support";
import { voiceUnsupportedMessage } from "@/lib/audio/voice-support";
import { useAgentSpeech } from "@/hooks/useAgentSpeech";
import { useVoicePipeline } from "@/hooks/useVoicePipeline";
import { useAudioVisualizer } from "@/hooks/useAudioVisualizer";
import { useProposedContactQueue } from "@/hooks/useProposedContactQueue";
import {
  buildRequestContext,
  type KinSightMessageMetadata,
} from "@/lib/ai/request-context";
import { withMessageText } from "@/lib/ai/message-text";
import { logMessageToKinSight } from "@/lib/kinsight/log-message";
import type { MessageLogStatus } from "@/components/AssistantMessageBubble";
import { useVoiceExperience } from "@/contexts/VoiceExperienceContext";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import type { OsVoiceSource } from "@/lib/voice/os-voice-deeplink";

interface DashboardProps {
  /** Bumps when the user returns to the Home tab from another screen. */
  homeSession?: number;
}

export function Dashboard({ homeSession = 0 }: DashboardProps) {
  const router = useRouter();
  const [replyText, setReplyText] = useState("");
  const [messageLogStates, setMessageLogStates] = useState<
    Record<string, MessageLogStatus>
  >({});
  const [messageLogSuccessLabels, setMessageLogSuccessLabels] = useState<
    Record<string, string>
  >({});
  const [micAccessFailure, setMicAccessFailure] =
    useState<MicrophoneAccessFailure | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        prepareSendMessagesRequest: ({ messages, body }) => {
          const latestUser = [...messages].reverse().find((m) => m.role === "user");
          const entry_method =
            (latestUser?.metadata as KinSightMessageMetadata | undefined)
              ?.entry_method ?? "manual";

          return {
            body: {
              ...body,
              messages,
              requestContext: buildRequestContext(entry_method),
            },
          };
        },
      }),
    []
  );

  const { messages, sendMessage, status, error: chatError, setMessages, stop } = useChat({
    id: `kinsight-home-${homeSession}`,
    transport,
    onFinish: ({ messages: allMessages, isError }) => {
      if (!isError) {
        void speakRef.current(allMessages);
      }
    },
  });

  const isChatLoading = status === "submitted" || status === "streaming";

  const {
    isSpeaking,
    speechEnabled,
    speakAssistantReply,
    interruptSpeech,
    toggleSpeechEnabled,
  } = useAgentSpeech();

  const speakRef = useRef(speakAssistantReply);
  speakRef.current = speakAssistantReply;

  const {
    analyzeNote,
    currentItem,
    queueTotal,
    queueIndex,
    isDetecting,
    isSaving,
    error: contactQueueError,
    hasQueue,
    confirmCurrent,
    skipCurrent,
  } = useProposedContactQueue();

  const processNote = useCallback(
    (
      text: string,
      options?: { recordingId?: string; entryMethod?: "voice" | "manual" }
    ) => {
      void analyzeNote(text, options);
    },
    [analyzeNote]
  );

  const handleTranscriptReady = useCallback(
    ({ text, recordingId }: { text: string; recordingId: string }) => {
      unlockSpeechSynthesis();
      processNote(text, { recordingId, entryMethod: "voice" });

      sendMessage({
        text: `🎤 [recording:${recordingId}] ${text}`,
        metadata: { entry_method: "voice" } satisfies KinSightMessageMetadata,
      });
    },
    [processNote, sendMessage]
  );

  const {
    isRecording,
    isTranscribing,
    isBusy,
    isSupported,
    supportChecked,
    unsupportedReason,
    transcript,
    error: voiceError,
    permissionFailure,
    mediaStream,
    toggleRecording,
    beginRecording,
    clearTranscript,
    clearPermissionFailure,
    setTranscriptText,
  } = useVoicePipeline({ onTranscriptReady: handleTranscriptReady });

  const {
    registerVoiceHandlers,
    syncPipelineActivity,
    flushPendingVoiceStart,
  } = useVoiceExperience();

  const { volumeLevel } = useAudioVisualizer({
    stream: mediaStream,
    enabled: isRecording,
  });

  const [conversationEngaged, setConversationEngaged] = useState(false);

  const stopRef = useRef(stop);
  const setMessagesRef = useRef(setMessages);
  const interruptSpeechRef = useRef(interruptSpeech);
  const clearTranscriptRef = useRef(clearTranscript);

  stopRef.current = stop;
  setMessagesRef.current = setMessages;
  interruptSpeechRef.current = interruptSpeech;
  clearTranscriptRef.current = clearTranscript;

  const resetToStateA = useCallback(() => {
    setConversationEngaged(false);
    setReplyText("");
    setMessageLogStates({});
    setMessageLogSuccessLabels({});
    setMessages([]);
    stop();
    interruptSpeech();
    stopSpeaking();
    clearTranscript();
  }, [clearTranscript, interruptSpeech, setMessages, stop]);

  const submitTextCommand = useCallback(
    async (text: string, _source?: OsVoiceSource) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      unlockSpeechSynthesis();
      setConversationEngaged(true);
      processNote(trimmed, { entryMethod: "manual" });
      sendMessage({
        text: trimmed,
        metadata: { entry_method: "manual" } satisfies KinSightMessageMetadata,
      });
    },
    [processNote, sendMessage]
  );

  useEffect(() => {
    registerVoiceHandlers({
      beginRecording,
      toggleRecording,
      submitTextCommand,
    });
    flushPendingVoiceStart();
    return () => registerVoiceHandlers(null);
  }, [
    beginRecording,
    flushPendingVoiceStart,
    registerVoiceHandlers,
    submitTextCommand,
    toggleRecording,
  ]);

  useEffect(() => {
    syncPipelineActivity({ isRecording, isTranscribing });
  }, [isRecording, isTranscribing, syncPipelineActivity]);

  useEffect(() => {
    if (
      messages.length > 0 ||
      isChatLoading ||
      isRecording ||
      isTranscribing ||
      isDetecting
    ) {
      setConversationEngaged(true);
    }
  }, [
    messages.length,
    isChatLoading,
    isRecording,
    isTranscribing,
    isDetecting,
  ]);

  useEffect(() => {
    // Fresh State A whenever the Home tab session resets (returning from another tab).
    resetToStateA();
  }, [homeSession, resetToStateA]);

  useEffect(() => {
    return () => {
      stopRef.current();
      setMessagesRef.current([]);
      interruptSpeechRef.current();
      stopSpeaking();
      clearTranscriptRef.current();
      setReplyText("");
    };
  }, []);

  const handleNotesSubmit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isChatLoading) return;

      unlockSpeechSynthesis();
      processNote(trimmed, { entryMethod: "manual" });

      sendMessage({
        text: trimmed,
        metadata: { entry_method: "manual" } satisfies KinSightMessageMetadata,
      });

      clearTranscript();
    },
    [clearTranscript, isChatLoading, processNote, sendMessage]
  );

  const handleReplySubmit = useCallback(() => {
    const text = replyText.trim();
    if (!text || isChatLoading) return;

    unlockSpeechSynthesis();
    sendMessage({
      text,
      metadata: { entry_method: "manual" } satisfies KinSightMessageMetadata,
    });
    setReplyText("");
  }, [replyText, isChatLoading, sendMessage]);

  const handleUpdateMessage = useCallback(
    (messageId: string, newText: string) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? withMessageText(message, newText) : message
        )
      );
    },
    [setMessages]
  );

  const handleLogToKinSight = useCallback(
    async (messageId: string) => {
      setMessageLogStates((current) => ({ ...current, [messageId]: "saving" }));

      const result = await logMessageToKinSight(messages, messageId);

      if (result.ok) {
        setMessageLogStates((current) => ({ ...current, [messageId]: "saved" }));
        setMessageLogSuccessLabels((current) => ({
          ...current,
          [messageId]: result.message,
        }));
        router.refresh();
        return;
      }

      setMessageLogStates((current) => ({ ...current, [messageId]: "error" }));
      window.setTimeout(() => {
        setMessageLogStates((current) => {
          if (current[messageId] !== "error") return current;
          return { ...current, [messageId]: "idle" };
        });
      }, 2500);
    },
    [messages, router]
  );

  const handleMicToggle = useCallback(
    (stream?: MediaStream) => {
      // Synchronous on the tap call stack — required for iOS Safari audio unlock.
      unlockSpeechSynthesis();

      if (isRecording) {
        toggleRecording();
        return;
      }

      if (!stream) return;

      interruptSpeech();
      toggleRecording(stream);
    },
    [interruptSpeech, isRecording, toggleRecording]
  );

  const handleMicAccessFailure = useCallback(
    (failure: MicrophoneAccessFailure) => {
      setMicAccessFailure(failure);
    },
    []
  );

  const activeMicFailure = micAccessFailure ?? permissionFailure;

  const hasConversationStarted = conversationEngaged;
  const { composerActive } = useKeyboardOpen();
  const hideHomeMic = !hasConversationStarted && composerActive;

  useEffect(() => {
    const scrollEl = document.querySelector<HTMLElement>(".app-scroll");
    if (!scrollEl) return;

    scrollEl.classList.add("home-scroll-locked");

    return () => {
      scrollEl.classList.remove("home-scroll-locked");
    };
  }, []);

  const header = (
    <Header
      showNewSession={hasConversationStarted}
      onNewSession={resetToStateA}
      sticky={hasConversationStarted}
    />
  );

  return (
    <>
      <div
        className={
          hasConversationStarted
            ? "home-dashboard home-dashboard--conversation flex flex-col"
            : "home-dashboard home-dashboard--state-a"
        }
      >
        <div className="home-dashboard__header shrink-0">{header}</div>

        <main
          className={`relative flex flex-col ${
            hasConversationStarted
              ? "min-h-0 flex-1"
              : "home-dashboard__main justify-start gap-6 px-5 pb-6 pt-4"
          }`}
        >
          <section
            aria-label="Voice capture"
            className={`relative z-10 flex w-full flex-col ${
              hasConversationStarted
                ? "min-h-0 flex-1 items-stretch"
                : "home-hero"
            }`}
          >
            {!hasConversationStarted && (
              <div
                className={
                  hideHomeMic
                    ? "home-hero-mic-zone home-hero-mic-zone--hidden"
                    : "home-hero-mic-zone"
                }
                aria-hidden={hideHomeMic}
              >
                <MicrophoneButton
                  isRecording={isRecording}
                  isSpeaking={isSpeaking}
                  isBusy={isBusy || isDetecting}
                  onToggle={handleMicToggle}
                  onMicAccessFailure={handleMicAccessFailure}
                  volumeLevel={volumeLevel}
                />
              </div>
            )}

            <KinSightConversationPanel
              transcript={transcript}
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              isAgentResponding={isChatLoading}
              isSpeaking={isSpeaking}
              isDetectingContacts={isDetecting}
              voiceError={voiceError}
              onTranscriptChange={setTranscriptText}
              onTranscriptClear={clearTranscript}
              onSubmitNotes={handleNotesSubmit}
              messages={messages}
              isLoading={isChatLoading}
              onUpdateMessage={handleUpdateMessage}
              onLogToKinSight={handleLogToKinSight}
              messageLogStates={messageLogStates}
              messageLogSuccessLabels={messageLogSuccessLabels}
              speechEnabled={speechEnabled}
              onToggleSpeech={toggleSpeechEnabled}
              replyValue={replyText}
              onReplyChange={setReplyText}
              onReplySubmit={handleReplySubmit}
              chatError={chatError}
              conversationStarted={hasConversationStarted}
              onMicToggle={handleMicToggle}
              onMicAccessFailure={handleMicAccessFailure}
              micDisabled={false}
              isMicBusy={isBusy || isDetecting}
              volumeLevel={volumeLevel}
            />

            {contactQueueError && !hasQueue && (
              <p
                className={`px-1 text-center text-xs text-red-400 ${
                  hasConversationStarted ? "w-full px-5" : "max-w-sm"
                }`}
                role="alert"
              >
                {contactQueueError}
              </p>
            )}

            {supportChecked && !isSupported && !hasConversationStarted && (
              <p className="type-meta max-w-sm text-center" role="status">
                {voiceUnsupportedMessage(unsupportedReason)}
              </p>
            )}
          </section>
        </main>
      </div>

      {activeMicFailure ? (
        <MicPermissionModal
          failure={activeMicFailure}
          onDismiss={() => {
            setMicAccessFailure(null);
            clearPermissionFailure();
          }}
        />
      ) : null}

      {currentItem && (
        <ProposedContactModal
          item={currentItem}
          index={queueIndex}
          total={queueTotal}
          isSaving={isSaving}
          error={contactQueueError}
          onConfirm={() => void confirmCurrent()}
          onSkip={() => void skipCurrent()}
        />
      )}
    </>
  );
}
