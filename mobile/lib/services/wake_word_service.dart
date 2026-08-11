import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:path_provider/path_provider.dart';
import 'package:porcupine_flutter/porcupine_manager.dart';
import 'package:porcupine_flutter/porcupine_error.dart';

/// Path 1 — on-device "Hey KinSight" via Picovoice Porcupine.
class WakeWordService {
  PorcupineManager? _manager;
  bool _isListening = false;

  bool get isListening => _isListening;

  Future<String> _resolveKeywordPath() async {
    final assetPath = Platform.isIOS
        ? 'assets/wake_word/hey_kinsight_ios.ppn'
        : 'assets/wake_word/hey_kinsight_android.ppn';

    final bytes = await rootBundle.load(assetPath);
    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/hey_kinsight.ppn');
    await file.writeAsBytes(
      bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes),
      flush: true,
    );
    return file.path;
  }

  Future<void> start({
    required String accessKey,
    required VoidCallback onWakeWord,
    void Function(PorcupineException)? onError,
  }) async {
    if (_isListening) return;

    final keywordPath = await _resolveKeywordPath();

    _manager = await PorcupineManager.fromKeywordPaths(
      accessKey,
      [keywordPath],
      (keywordIndex) => onWakeWord(),
      errorCallback: onError,
    );

    await _manager!.start();
    _isListening = true;
  }

  Future<void> stop() async {
    if (!_isListening) return;
    await _manager?.stop();
    await _manager?.delete();
    _manager = null;
    _isListening = false;
  }
}
