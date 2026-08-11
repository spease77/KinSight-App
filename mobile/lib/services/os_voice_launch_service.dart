import 'dart:async';

import 'package:app_links/app_links.dart';

import '../models/voice_session.dart';

/// Path 2 — Siri Shortcuts, Google Assistant, and custom URL scheme launches.
class OsVoiceLaunchService {
  OsVoiceLaunchService() : _appLinks = AppLinks();

  final AppLinks _appLinks;
  final StreamController<OsVoiceLaunchPayload> _controller =
      StreamController<OsVoiceLaunchPayload>.broadcast();

  Stream<OsVoiceLaunchPayload> get launches => _controller.stream;

  Future<void> init() async {
    final initial = await _appLinks.getInitialLink();
    if (initial != null) {
      _emitUri(initial);
    }

    _appLinks.uriLinkStream.listen(_emitUri);
  }

  void _emitUri(Uri uri) {
    final payload = parseVoiceUri(uri);
    if (payload != null) {
      _controller.add(payload);
    }
  }

  void dispose() {
    _controller.close();
  }
}

OsVoiceSource _parseSource(String? raw) {
  switch (raw?.toLowerCase()) {
    case 'siri':
      return OsVoiceSource.siri;
    case 'google':
    case 'assistant':
      return OsVoiceSource.google;
    case 'shortcut':
      return OsVoiceSource.shortcut;
    default:
      return OsVoiceSource.unknown;
  }
}

/// Supports:
/// - kinsight://voice?command=log%20a%20meeting&source=siri
/// - kinsight://capture?source=google
/// - https://kin-sight-app.vercel.app/?voice_command=...&voice_source=siri
OsVoiceLaunchPayload? parseVoiceUri(Uri uri) {
  if (uri.scheme == 'kinsight') {
    final command = uri.queryParameters['command']?.trim() ??
        (uri.host == 'voice' ? uri.pathSegments.join(' ').trim() : null);
    final capture = uri.host == 'capture' || uri.queryParameters['capture'] == '1';
    if ((command == null || command.isEmpty) && !capture) return null;

    return OsVoiceLaunchPayload(
      command: command?.isEmpty == true ? null : command,
      captureImmediately: capture || (command != null && command.isNotEmpty),
      source: _parseSource(uri.queryParameters['source']),
    );
  }

  if (uri.scheme == 'https' || uri.scheme == 'http') {
    final command = uri.queryParameters['voice_command'] ??
        uri.queryParameters['kinsight_command'] ??
        uri.queryParameters['command'];
    final capture = uri.queryParameters['voice_capture'] == '1' ||
        uri.queryParameters['capture'] == '1';

    if (command == null && !capture) return null;

    return OsVoiceLaunchPayload(
      command: command?.trim(),
      captureImmediately: capture || command != null,
      source: _parseSource(uri.queryParameters['voice_source'] ??
          uri.queryParameters['source']),
    );
  }

  return null;
}
