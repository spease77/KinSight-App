import AppIntents
import UIKit

/// Register with Xcode target (iOS 16+). Enables:
/// "Hey Siri, tell KinSight to log a meeting"
@available(iOS 16.0, *)
struct KinSightVoiceIntent: AppIntent {
    static var title: LocalizedStringResource = "Tell KinSight"
    static var description = IntentDescription("Send a command to KinSight.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Command")
    var command: String?

    func perform() async throws -> some IntentResult {
        let text = command?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let encoded = text.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let urlString = encoded.isEmpty
            ? "kinsight://capture?source=siri"
            : "kinsight://voice?command=\(encoded)&source=siri"

        if let url = URL(string: urlString) {
            await UIApplication.shared.open(url)
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
