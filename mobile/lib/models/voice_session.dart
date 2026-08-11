enum VoiceSessionSource { wakeWord, osShortcut, manual }

enum VoiceOverlayPhase { hidden, listening, processing }

enum OsVoiceSource { siri, google, shortcut, unknown }

class OsVoiceLaunchPayload {
  const OsVoiceLaunchPayload({
    this.command,
    required this.captureImmediately,
    required this.source,
  });

  final String? command;
  final bool captureImmediately;
  final OsVoiceSource source;

  bool get hasCommand => command != null && command!.trim().isNotEmpty;
}
