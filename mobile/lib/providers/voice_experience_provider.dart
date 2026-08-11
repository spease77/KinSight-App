import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:porcupine_flutter/porcupine_error.dart';

import '../models/voice_session.dart';
import '../services/haptics_service.dart';
import '../services/os_voice_launch_service.dart';
import '../services/voice_pipeline_service.dart';
import '../services/wake_word_service.dart';

/// Coordinates Path 1 (wake word) and Path 2 (OS shortcuts) with overlay UI state.
class VoiceExperienceProvider extends ChangeNotifier
    with WidgetsBindingObserver {
  VoiceExperienceProvider({
    required String porcupineAccessKey,
    OsVoiceLaunchService? osVoiceLaunchService,
    VoicePipelineService? voicePipelineService,
    WakeWordService? wakeWordService,
  })  : _porcupineAccessKey = porcupineAccessKey,
        _osVoiceLaunchService = osVoiceLaunchService ?? OsVoiceLaunchService(),
        _voicePipeline = voicePipelineService ?? VoicePipelineService(),
        _wakeWordService = wakeWordService ?? WakeWordService() {
    WidgetsBinding.instance.addObserver(this);
  }

  final String _porcupineAccessKey;
  final OsVoiceLaunchService _osVoiceLaunchService;
  final VoicePipelineService _voicePipeline;
  final WakeWordService _wakeWordService;

  StreamSubscription<OsVoiceLaunchPayload>? _osLaunchSub;

  VoiceOverlayPhase _overlayPhase = VoiceOverlayPhase.hidden;
  VoiceSessionSource? _sessionSource;
  bool _isForeground = true;
  bool _wakeWordEnabled = true;
  bool _isRecording = false;
  bool _isProcessing = false;
  String? _statusMessage;
  String? _errorMessage;

  VoiceOverlayPhase get overlayPhase => _overlayPhase;
  VoiceSessionSource? get sessionSource => _sessionSource;
  bool get isForeground => _isForeground;
  bool get wakeWordEnabled => _wakeWordEnabled;
  bool get isRecording => _isRecording;
  bool get isProcessing => _isProcessing;
  String? get statusMessage => _statusMessage;
  String? get errorMessage => _errorMessage;
  bool get isOverlayVisible => _overlayPhase != VoiceOverlayPhase.hidden;

  Future<void> init() async {
    await _osVoiceLaunchService.init();
    _osLaunchSub = _osVoiceLaunchService.launches.listen(_handleOsLaunch);
    await _syncWakeWordListener();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _isForeground = state == AppLifecycleState.resumed;
    if (!_isForeground) {
      unawaited(_wakeWordService.stop());
    } else {
      unawaited(_syncWakeWordListener());
    }
    notifyListeners();
  }

  Future<void> _syncWakeWordListener() async {
    final shouldListen = _isForeground &&
        _wakeWordEnabled &&
        _overlayPhase == VoiceOverlayPhase.hidden &&
        !_isRecording &&
        !_isProcessing;

    if (!shouldListen) {
      await _wakeWordService.stop();
      return;
    }

    if (_porcupineAccessKey.isEmpty) {
      _statusMessage = 'Add PICOVOICE_ACCESS_KEY to enable Hey KinSight.';
      notifyListeners();
      return;
    }

    final micStatus = await Permission.microphone.request();
    if (!micStatus.isGranted) {
      _errorMessage = 'Microphone permission is required for wake word listening.';
      notifyListeners();
      return;
    }

    try {
      await _wakeWordService.start(
        accessKey: _porcupineAccessKey,
        onWakeWord: _onWakeWordDetected,
        onError: (error) {
          _errorMessage = error.message;
          notifyListeners();
        },
      );
    } on PorcupineException catch (error) {
      _errorMessage = error.message;
      notifyListeners();
    }
  }

  void _onWakeWordDetected() {
    unawaited(_beginVoiceSession(
      source: VoiceSessionSource.wakeWord,
      skipWakeWord: true,
    ));
  }

  Future<void> _handleOsLaunch(OsVoiceLaunchPayload payload) async {
    _wakeWordEnabled = false;
    await _wakeWordService.stop();
    notifyListeners();

    if (payload.hasCommand) {
      await _beginVoiceSession(
        source: VoiceSessionSource.osShortcut,
        prefilledCommand: payload.command,
        skipWakeWord: true,
      );
      return;
    }

    if (payload.captureImmediately) {
      await _beginVoiceSession(
        source: VoiceSessionSource.osShortcut,
        skipWakeWord: true,
      );
    }
  }

  Future<void> _beginVoiceSession({
    required VoiceSessionSource source,
    String? prefilledCommand,
    bool skipWakeWord = false,
  }) async {
    _sessionSource = source;
    _errorMessage = null;
    _statusMessage = null;
    notifyListeners();

    if (!skipWakeWord && source == VoiceSessionSource.wakeWord) {
      await HapticsService.wakeWordTriggered();
    } else if (source == VoiceSessionSource.osShortcut) {
      await HapticsService.wakeWordTriggered();
    }

    if (prefilledCommand != null && prefilledCommand.trim().isNotEmpty) {
      _overlayPhase = VoiceOverlayPhase.processing;
      _isProcessing = true;
      notifyListeners();

      try {
        await _voicePipeline.submitTextCommand(prefilledCommand);
        await HapticsService.success();
        _statusMessage = 'Command sent to KinSight.';
      } catch (error) {
        _errorMessage = error.toString();
        await HapticsService.error();
      } finally {
        await _endVoiceSession();
      }
      return;
    }

    _overlayPhase = VoiceOverlayPhase.listening;
    _isRecording = true;
    notifyListeners();

    // TODO: Start platform microphone stream → VoicePipelineService.transcribeRecording
    _statusMessage = 'Listening… (wire microphone capture next)';
    notifyListeners();
  }

  Future<void> endManualRecording() async {
    if (!_isRecording) return;

    _isRecording = false;
    _overlayPhase = VoiceOverlayPhase.processing;
    _isProcessing = true;
    notifyListeners();

    try {
      // Placeholder until microphone streaming is wired.
      await Future<void>.delayed(const Duration(milliseconds: 400));
      await HapticsService.success();
    } catch (error) {
      _errorMessage = error.toString();
      await HapticsService.error();
    } finally {
      await _endVoiceSession();
    }
  }

  Future<void> _endVoiceSession() async {
    _overlayPhase = VoiceOverlayPhase.hidden;
    _sessionSource = null;
    _isRecording = false;
    _isProcessing = false;
    _wakeWordEnabled = true;
    notifyListeners();
    await _syncWakeWordListener();
  }

  void dismissOverlay() {
    if (_isRecording || _isProcessing) return;
    unawaited(_endVoiceSession());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _osLaunchSub?.cancel();
    _osVoiceLaunchService.dispose();
    unawaited(_wakeWordService.stop());
    super.dispose();
  }
}
