import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/voice_experience_provider.dart';
import 'voice_overlay.dart';

class KinSightApp extends StatelessWidget {
  const KinSightApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KinSight',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF5E6AD2)),
        useMaterial3: true,
      ),
      home: const _HomeShell(),
    );
  }
}

class _HomeShell extends StatelessWidget {
  const _HomeShell();

  @override
  Widget build(BuildContext context) {
    final voice = context.watch<VoiceExperienceProvider>();

    return Stack(
      children: [
        Scaffold(
          appBar: AppBar(title: const Text('KinSight')),
          body: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Hands-free relationship intelligence',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 12),
                Text(
                  voice.isForeground
                      ? 'Foreground: wake word ${voice.wakeWordEnabled ? "armed" : "paused"}'
                      : 'Background: wake word paused',
                ),
                if (voice.statusMessage != null) ...[
                  const SizedBox(height: 8),
                  Text(voice.statusMessage!),
                ],
                const Spacer(),
                const Text(
                  'Say "Hey KinSight" when the app is open, or use a Siri / Google shortcut when closed.',
                  style: TextStyle(color: Colors.black54),
                ),
              ],
            ),
          ),
        ),
        const VoiceOverlay(),
      ],
    );
  }
}
