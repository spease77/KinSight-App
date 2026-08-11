import UIKit
import Flutter

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)

    // Siri / Shortcuts may deliver a URL before Flutter is ready — app_links handles resume.
    if let url = launchOptions?[.url] as? URL {
      NSLog("KinSight cold-start URL: %@", url.absoluteString)
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    // kinsight://voice?command=...&source=siri
    NSLog("KinSight opened via URL: %@", url.absoluteString)
    return super.application(app, open: url, options: options)
  }

  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    // Universal links / Siri NSUserActivity hand-off
    if let url = userActivity.webpageURL {
      NSLog("KinSight user activity URL: %@", url.absoluteString)
    }
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }
}
