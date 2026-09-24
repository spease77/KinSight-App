"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Header } from "@/components/Header";
import { PageHeader } from "@/components/PageHeader";
import { HomeVoiceCapture } from "@/components/HomeVoiceCapture";
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
    playbackBlocked,
    speakAssistantReply,
    replayBlockedSpeech,
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
      const trimmed = text.trim();
      if (!trimmed || isChatLoading) return;

      unlockSpeechSynthesis();
      setConversationEngaged(true);

      const messageText = recordingId
        ? `🎤 [recording:${recordingId}] ${trimmed}`
        : `🎤 ${trimmed}`;

      processNote(trimmed, {
        recordingId: recordingId || undefined,
        entryMethod: "voice",
      });

      sendMessage({
        text: messageText,
        metadata: { entry_method: "voice" } satisfies KinSightMessageMetadata,
      });
      setReplyText("");
    },
    [isChatLoading, processNote, sendMessage]
  );

  const handleRecordingComplete = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setReplyText(trimmed);
  }, []);

  const {
    isRecording,
    isStarting,
    isTranscribing,
    isBusy,
    isSupported,
    supportChecked,
    unsupportedReason,
    transcript,
    liveTranscript,
    error: voiceError,
    permissionFailure,
    mediaStream,
    toggleRecording,
    stopVoiceCapture,
    beginRecording,
    clearTranscript,
    clearPermissionFailure,
    setTranscriptText,
  } = useVoicePipeline({
    onTranscriptReady: handleTranscriptReady,
    onRecordingComplete: handleRecordingComplete,
  });

  useEffect(() => {
    if (isRecording) {
      if (liveTranscript) setReplyText(liveTranscript);
      return;
    }
    const draft = transcript.trim();
    if (draft) setReplyText(draft);
  }, [isRecording, liveTranscript, transcript]);

  const {
    registerVoiceHandlers,
    syncPipelineActivity,
    flushPendingVoiceStart,
  } = useVoiceExperience();

  const { volumeLevel, waveformBands } = useAudioVisualizer({
    stream: mediaStream,
    enabled: isRecording || isStarting,
  });

  const [conversationEngaged, setConversationEngaged] = useState(false);

  const stopRef = useRef(stop);
  const setMessagesRef = useRef(setMessages);
  const interruptSpeechRef = useRef(interruptSpeech);
  const clearTranscriptRef = useRef(clearTranscript);
  const isRecordingRef = useRef(isRecording);

  stopRef.current = stop;
  setMessagesRef.current = setMessages;
  interruptSpeechRef.current = interruptSpeech;
  clearTranscriptRef.current = clearTranscript;
  isRecordingRef.current = isRecording;

  const resetToStateA = useCallback(() => {
    setConversationEngaged(false);
    setReplyText("");
    setMessageLogStates({});
    setMessageLogSuccessLabels({});
    setMessages([]);
    stop();
    interruptSpeech();
    stopSpeaking();
    stopVoiceCapture();
    clearTranscript();
  }, [clearTranscript, interruptSpeech, setMessages, stop, stopVoiceCapture]);

  const resetToStateARef = useRef(resetToStateA);
  resetToStateARef.current = resetToStateA;

  const prevHomeSessionRef = useRef(homeSession);

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
    // Stay on State A while recording/transcribing so the hero mic keeps showing
    // "Listening…" instead of flipping to an empty conversation layout.
    if (messages.length > 0 || isChatLoading || isDetecting) {
      setConversationEngaged(true);
    }
  }, [messages.length, isChatLoading, isDetecting]);

  useEffect(() => {
    if (prevHomeSessionRef.current === homeSession) {
      return;
    }
    prevHomeSessionRef.current = homeSession;
    resetToStateARef.current();
  }, [homeSession]);

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
      unlockSpeechSynthesis();

      if (isRecordingRef.current) {
        stopVoiceCapture();
        return;
      }

      if (!stream) return;

      interruptSpeech();
      void beginRecording(stream);
    },
    [beginRecording, interruptSpeech, stopVoiceCapture]
  );

  const handleMicAccessFailure = useCallback(
    (failure: MicrophoneAccessFailure) => {
      setMicAccessFailure(failure);
    },
    []
  );

  const activeMicFailure = micAccessFailure ?? permissionFailure;

  const hasConversationStarted = conversationEngaged;
  useKeyboardOpen();

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
    />
  );

  return (
    <>
      {hasConversationStarted ? (
        <div className="home-dashboard home-dashboard--conversation flex flex-col">
          <PageHeader className="home-dashboard__header shrink-0">
            {header}
          </PageHeader>

          <main className="relative flex min-h-0 flex-1 flex-col">
            <section
              aria-label="Voice capture"
              className="relative z-10 flex min-h-0 flex-1 flex-col items-stretch"
            >
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
                playbackBlocked={playbackBlocked}
                onReplaySpeech={replayBlockedSpeech}
                replyValue={replyText}
                onReplyChange={setReplyText}
                onReplySubmit={handleReplySubmit}
                chatError={chatError}
                conversationStarted={hasConversationStarted}
                onMicToggle={handleMicToggle}
                onMicAccessFailure={handleMicAccessFailure}
                micDisabled={false}
                isMicBusy={isBusy}
                volumeLevel={volumeLevel}
              />

              {contactQueueError && !hasQueue && (
                <p className="w-full px-0 text-center text-xs text-red-400" role="alert">
                  {contactQueueError}
                </p>
              )}
            </section>
          </main>
        </div>
      ) : (
        <div className="home-dashboard home-dashboard--state-a flex h-full flex-col px-0 pt-0">
          <PageHeader className="home-dashboard__header home-page-header shrink-0">
            {header}
          </PageHeader>

          <main className="home-dashboard__main relative flex min-h-0 flex-1 flex-col">
            <section
              aria-label="Voice capture"
              className="home-hero flex min-h-0 flex-1 flex-col"
            >
              <div className="home-hero__content">
                <>
                    <div className="home-hero__spacer" aria-hidden="true" />
                    <div className="home-hero-mic-zone relative flex w-full shrink-0 items-center justify-center">
                      <HomeVoiceCapture
                        isRecording={isRecording}
                        isStarting={isStarting}
                        isTranscribing={isTranscribing}
                        isBusy={isBusy}
                        volumeLevel={volumeLevel}
                        waveformBands={waveformBands}
                        liveTranscript={liveTranscript}
                        transcript={transcript}
                        onStart={(stream) => {
                          interruptSpeech();
                          void beginRecording(stream);
                        }}
                        onStop={() => stopVoiceCapture()}
                        onMicAccessFailure={handleMicAccessFailure}
                      />
                    </div>
                    <div className="home-hero__spacer home-hero__spacer--lower" aria-hidden="true" />
                </>

                {voiceError && (
                  <p className="max-w-md px-2 text-center text-xs text-red-400" role="alert">
                    {voiceError}
                  </p>
                )}

                {contactQueueError && !hasQueue && (
                  <p className="max-w-md px-1 text-center text-xs text-red-400" role="alert">
                    {contactQueueError}
                  </p>
                )}

                {supportChecked && !isSupported && (
                  <p className="type-meta max-w-md text-center" role="status">
                    {voiceUnsupportedMessage(unsupportedReason)}
                  </p>
                )}
              </div>
            </section>

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
              playbackBlocked={playbackBlocked}
              onReplaySpeech={replayBlockedSpeech}
              replyValue={replyText}
              onReplyChange={setReplyText}
              onReplySubmit={handleReplySubmit}
              chatError={chatError}
              conversationStarted={hasConversationStarted}
              onMicToggle={handleMicToggle}
              onMicAccessFailure={handleMicAccessFailure}
              micDisabled={false}
              isMicBusy={isBusy}
              volumeLevel={volumeLevel}
              homeComposerAnchored
            />
          </main>
        </div>
      )}

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
