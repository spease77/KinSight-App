import 'dart:convert';

import 'package:http/http.dart' as http;

/// Placeholder STT + agent routing — wire to your KinSight API backend.
class VoicePipelineService {
  VoicePipelineService({this.apiBaseUrl = 'https://kin-sight-app.vercel.app'});

  final String apiBaseUrl;

  Future<String> submitTextCommand(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError('Command text is empty');
    }

    // TODO: Replace with your authenticated /api/agent or recordings endpoint.
    final response = await http.post(
      Uri.parse('$apiBaseUrl/api/agent'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'messages': [
          {'role': 'user', 'content': trimmed},
        ],
      }),
    );

    if (response.statusCode >= 400) {
      throw Exception('KinSight could not process the voice command.');
    }

    return trimmed;
  }

  /// TODO: Stream microphone audio to /api/recordings (multipart) like the web app.
  Future<String> transcribeRecording(List<int> audioBytes) async {
    throw UnimplementedError(
      'Wire microphone capture to POST /api/recordings with MediaRecorder equivalent.',
    );
  }
}
