import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'providers/voice_experience_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {
    // .env is optional during local bootstrap.
  }

  final porcupineAccessKey = dotenv.env['PICOVOICE_ACCESS_KEY'] ?? '';

  final voiceProvider = VoiceExperienceProvider(
    porcupineAccessKey: porcupineAccessKey,
  );
  await voiceProvider.init();

  runApp(
    ChangeNotifierProvider<VoiceExperienceProvider>.value(
      value: voiceProvider,
      child: const KinSightApp(),
    ),
  );
}
