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
import { useVoiceExperience } from "@/contexts/VoiceExperienceContext";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { useKinSightConversationStore } from "@/hooks/useKinSightConversationStore";
import { ConversationHistorySheet } from "@/components/conversations/ConversationHistorySheet";
import { listConversationSummaries, getConversation } from "@/lib/conversations/storage";
import type { OsVoiceSource } from "@/lib/voice/os-voice-deeplink";
import {
  createAttachmentPreviews,
  filesToFileList,
  revokeAttachmentPreviews,
  validateComposerFiles,
  type ComposerAttachmentPreview,
} from "@/lib/composer/attachments";

interface DashboardProps {
  /** Bumps when the user returns to the Home tab from another screen. */
  homeSession?: number;
}

export function Dashboard({ homeSession: _homeSession = 0 }: DashboardProps) {
  const router = useRouter();
  const [replyText, setReplyText] = useState("");
  const [micAccessFailure, setMicAccessFailure] =
    useState<MicrophoneAccessFailure | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [composerAttachments, setComposerAttachments] = useState<
    ComposerAttachmentPreview[]
  >([]);
  const [composerAttachError, setComposerAttachError] = useState<string | null>(
    null
  );

  const {
    hydrated: conversationsHydrated,
    conversations,
    activeConversationId,
    selectConversation,
    startNewConversation,
    persistMessages,
    schedulePersistMessages,
    removeConversation,
  } = useKinSightConversationStore();

  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;

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
              conversationMemory: listConversationSummaries(
                activeConversationIdRef.current
              ),
            },
          };
        },
      }),
    []
  );

  const chatSessionId = conversationsHydrated
    ? activeConversationId
    : "kinsight-home-loading";

  const { messages, sendMessage, status, error: chatError, setMessages, stop } = useChat({
    id: chatSessionId,
    transport,
    onFinish: ({ messages: allMessages, isError }) => {
      if (!isError && activeConversationIdRef.current) {
        persistMessages(activeConversationIdRef.current, allMessages);
      }
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
  const lastLoadedConversationRef = useRef<string | null>(null);

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
    setComposerAttachments((prev) => {
      revokeAttachmentPreviews(prev);
      return [];
    });
    setComposerAttachError(null);
    setMessages([]);
    stop();
    interruptSpeech();
    stopSpeaking();
    stopVoiceCapture();
    clearTranscript();

    const created = startNewConversation();
    lastLoadedConversationRef.current = created.id;
  }, [
    clearTranscript,
    interruptSpeech,
    setMessages,
    startNewConversation,
    stop,
    stopVoiceCapture,
  ]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      stop();
      interruptSpeech();
      stopSpeaking();
      stopVoiceCapture();
      clearTranscript();

      const selected = selectConversation(id);
      lastLoadedConversationRef.current = id;
      setMessages(selected?.messages ?? []);
      setConversationEngaged((selected?.messages.length ?? 0) > 0);
      setReplyText("");
      setComposerAttachments((prev) => {
        revokeAttachmentPreviews(prev);
        return [];
      });
      setComposerAttachError(null);
    },
    [
      clearTranscript,
      interruptSpeech,
      selectConversation,
      setMessages,
      stop,
      stopVoiceCapture,
    ]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      const next = removeConversation(id);
      if (next?.id) {
        lastLoadedConversationRef.current = next.id;
        setMessages(next.messages ?? []);
        setConversationEngaged((next.messages?.length ?? 0) > 0);
      } else {
        lastLoadedConversationRef.current = null;
        setMessages([]);
        setConversationEngaged(false);
      }
      setReplyText("");
      setComposerAttachments((prev) => {
        revokeAttachmentPreviews(prev);
        return [];
      });
      setComposerAttachError(null);
    },
    [removeConversation, setMessages]
  );

  useEffect(() => {
    if (!conversationsHydrated || !activeConversationId) return;
    if (lastLoadedConversationRef.current === activeConversationId) return;

    const selected = getConversation(activeConversationId);
    lastLoadedConversationRef.current = activeConversationId;
    setMessages(selected?.messages ?? []);
    setConversationEngaged((selected?.messages?.length ?? 0) > 0);
  }, [activeConversationId, conversationsHydrated, setMessages]);

  useEffect(() => {
    if (!conversationsHydrated || !activeConversationId) return;
    if (messages.length === 0) return;
    schedulePersistMessages(activeConversationId, messages);
  }, [
    activeConversationId,
    conversationsHydrated,
    messages,
    schedulePersistMessages,
  ]);

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
    return () => {
      stopRef.current();
      setMessagesRef.current([]);
      interruptSpeechRef.current();
      stopSpeaking();
      clearTranscriptRef.current();
      setReplyText("");
      setComposerAttachments((prev) => {
        revokeAttachmentPreviews(prev);
        return [];
      });
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
    const files = composerAttachments.map((item) => item.file);
    if ((!text && files.length === 0) || isChatLoading) return;

    unlockSpeechSynthesis();
    setConversationEngaged(true);

    const metadata = {
      entry_method: "manual",
    } satisfies KinSightMessageMetadata;

    if (text) {
      processNote(text, { entryMethod: "manual" });
    }

    if (files.length > 0) {
      const fileList = filesToFileList(files);
      if (text) {
        sendMessage({ text, files: fileList, metadata });
      } else {
        sendMessage({ files: fileList, metadata });
      }
    } else {
      sendMessage({ text, metadata });
    }

    setComposerAttachments((prev) => {
      revokeAttachmentPreviews(prev);
      return [];
    });
    setComposerAttachError(null);
    setReplyText("");
  }, [
    composerAttachments,
    isChatLoading,
    processNote,
    replyText,
    sendMessage,
  ]);

  const handleAddComposerFiles = useCallback((incoming: File[]) => {
    setComposerAttachments((prev) => {
      const validation = validateComposerFiles(incoming, prev.length);
      if (!validation.ok) {
        setComposerAttachError(validation.error);
        return prev;
      }
      setComposerAttachError(null);
      return [...prev, ...createAttachmentPreviews(validation.files)];
    });
  }, []);

  const handleRemoveComposerAttachment = useCallback((id: string) => {
    setComposerAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
    setComposerAttachError(null);
  }, []);

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
      onOpenKinSightMenu={() => setHistoryOpen(true)}
      speechEnabled={speechEnabled}
      onToggleSpeech={toggleSpeechEnabled}
      playbackBlocked={playbackBlocked}
      onReplaySpeech={replayBlockedSpeech}
      isSpeaking={isSpeaking}
    />
  );

  return (
    <>
      {hasConversationStarted ? (
        <div className="home-dashboard home-dashboard--conversation flex flex-col">
          <PageHeader className="home-dashboard__header home-page-header home-conversation-header shrink-0">
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
                speechEnabled={speechEnabled}
                onToggleSpeech={toggleSpeechEnabled}
                playbackBlocked={playbackBlocked}
                onReplaySpeech={replayBlockedSpeech}
                replyValue={replyText}
                onReplyChange={setReplyText}
                onReplySubmit={handleReplySubmit}
                chatError={chatError}
                conversationStarted={hasConversationStarted}
                composerAttachments={composerAttachments}
                onAddComposerFiles={handleAddComposerFiles}
                onRemoveComposerAttachment={handleRemoveComposerAttachment}
                composerAttachError={composerAttachError}
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
              speechEnabled={speechEnabled}
              onToggleSpeech={toggleSpeechEnabled}
              playbackBlocked={playbackBlocked}
              onReplaySpeech={replayBlockedSpeech}
              replyValue={replyText}
              onReplyChange={setReplyText}
              onReplySubmit={handleReplySubmit}
              chatError={chatError}
              conversationStarted={hasConversationStarted}
              composerAttachments={composerAttachments}
              onAddComposerFiles={handleAddComposerFiles}
              onRemoveComposerAttachment={handleRemoveComposerAttachment}
              composerAttachError={composerAttachError}
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

      <ConversationHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onNewChat={resetToStateA}
        onDelete={handleDeleteConversation}
      />
    </>
  );
}
