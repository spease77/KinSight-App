import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/voice_session.dart';
import '../providers/voice_experience_provider.dart';

class VoiceOverlay extends StatelessWidget {
  const VoiceOverlay({super.key});

  static const Map<VoiceSessionSource, String> _sourceLabels = {
    VoiceSessionSource.wakeWord: 'Hey KinSight',
    VoiceSessionSource.osShortcut: 'Voice shortcut',
    VoiceSessionSource.manual: 'Voice',
  };

  @override
  Widget build(BuildContext context) {
    return Consumer<VoiceExperienceProvider>(
      builder: (context, voice, _) {
        if (!voice.isOverlayVisible) return const SizedBox.shrink();

        final label = voice.sessionSource != null
            ? _sourceLabels[voice.sessionSource!]!
            : 'Listening';

        final statusText = voice.isProcessing
            ? 'Processing your request…'
            : voice.isRecording
                ? voice.statusMessage ?? 'Listening…'
                : 'Ready when you are';

        return Material(
          color: Colors.black.withValues(alpha: 0.55),
          child: GestureDetector(
            onTap: voice.dismissOverlay,
            child: Center(
              child: GestureDetector(
                onTap: () {},
                child: Container(
                  width: 320,
                  margin: const EdgeInsets.all(24),
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: const Color(0xFF5E6AD2).withValues(alpha: 0.35),
                    ),
                    boxShadow: const [
                      BoxShadow(
                        blurRadius: 32,
                        offset: Offset(0, 16),
                        color: Colors.black26,
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        label,
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      const SizedBox(height: 24),
                      _PulsingMic(isActive: voice.isRecording),
                      const SizedBox(height: 24),
                      Text(
                        statusText,
                        style: Theme.of(context).textTheme.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        voice.sessionSource == VoiceSessionSource.osShortcut
                            ? 'Shortcut received — KinSight is handling your request.'
                            : 'Speak naturally. Tap outside when finished.',
                        style: Theme.of(context).textTheme.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                      if (voice.isRecording) ...[
                        const SizedBox(height: 20),
                        FilledButton(
                          onPressed: () =>
                              context.read<VoiceExperienceProvider>().endManualRecording(),
                          child: const Text('Done speaking'),
                        ),
                      ],
                      if (voice.errorMessage != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          voice.errorMessage!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                            fontSize: 13,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PulsingMic extends StatefulWidget {
  const _PulsingMic({required this.isActive});

  final bool isActive;

  @override
  State<_PulsingMic> createState() => _PulsingMicState();
}

class _PulsingMicState extends State<_PulsingMic>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );
    if (widget.isActive) _controller.repeat();
  }

  @override
  void didUpdateWidget(covariant _PulsingMic oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive && !_controller.isAnimating) {
      _controller.repeat();
    } else if (!widget.isActive) {
      _controller.stop();
      _controller.reset();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 140,
      height: 140,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (widget.isActive)
            AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                final scale = 0.9 + (_controller.value * 0.45);
                final opacity = (1 - _controller.value) * 0.45;
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: const Color(0xFF6B76DB).withValues(alpha: opacity),
                        width: 2,
                      ),
                    ),
                  ),
                );
              },
            ),
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF5E6AD2).withValues(alpha: 0.18),
            ),
            child: const Icon(Icons.mic, size: 40),
          ),
        ],
      ),
    );
  }
}
