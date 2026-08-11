import 'package:flutter/services.dart';

class HapticsService {
  static Future<void> wakeWordTriggered() async {
    await HapticFeedback.mediumImpact();
    await Future<void>.delayed(const Duration(milliseconds: 50));
    await HapticFeedback.lightImpact();
  }

  static Future<void> success() async {
    await HapticFeedback.lightImpact();
  }

  static Future<void> error() async {
    await HapticFeedback.heavyImpact();
  }
}
