import AppIntents
import Foundation

/// Siri / Shortcuts entry point for KinSight voice commands.
/// Add to Xcode target: ios/App/AppIntents/
@available(iOS 16.0, *)
struct KinSightVoiceIntent: AppIntent {
    static var title: LocalizedStringResource = "Tell KinSight"
    static var description = IntentDescription("Send a voice command to KinSight.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Command")
    var command: String?

    func perform() async throws -> some IntentResult {
        let payloadCommand = command?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let encoded = payloadCommand.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let urlString = encoded.isEmpty
            ? "kinsight://capture?source=siri"
            : "kinsight://voice?command=\(encoded)&source=siri"

        if let url = URL(string: urlString) {
            await MainActor.run {
                NotificationCenter.default.post(
                    name: NSNotification.Name("KinSightVoiceLaunch"),
                    object: url
                )
            }
        }

        return .result()
    }
}

@available(iOS 16.0, *)
struct KinSightShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: KinSightVoiceIntent(),
            phrases: [
                "Tell \(.applicationName) to \(\.$command)",
                "Open \(.applicationName)",
                "Hey \(.applicationName)"
            ],
            shortTitle: "KinSight Voice",
            systemImageName: "mic.fill"
        )
    }
}
