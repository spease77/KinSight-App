# KinSight Flutter Mobile — Voice Pathways

This folder is a **Flutter/Dart** mobile shell for KinSight. The main web app remains in the repo root (`Next.js`). Run `flutter create` once to generate platform scaffolding, then merge the files below.

## Bootstrap (first time)

```bash
cd mobile
flutter create . --org app.kinsight --project-name kinsight_mobile
flutter pub get
cp .env.example .env
```

Add Picovoice keyword files to `assets/wake_word/`:
- `hey_kinsight_ios.ppn`
- `hey_kinsight_android.ppn`

## Architecture

| Path | Trigger | Dart entry |
|------|---------|------------|
| **Path 1** | "Hey KinSight" (foreground) | `WakeWordService` → `VoiceExperienceProvider` |
| **Path 2** | Siri / Google shortcut | `OsVoiceLaunchService` → `VoiceExperienceProvider` |

### Dart layout

```
lib/
  main.dart                          # Provider bootstrap
  app.dart                           # MaterialApp + overlay stack
  models/voice_session.dart
  providers/voice_experience_provider.dart   # Hand-off + lifecycle
  services/
    wake_word_service.dart           # porcupine_flutter
    os_voice_launch_service.dart     # app_links deep URLs
    voice_pipeline_service.dart      # API → KinSight backend
    haptics_service.dart
  widgets/voice_overlay.dart         # Pulsing mic UI
```

## Path 1 — In-app wake word

1. Set `PICOVOICE_ACCESS_KEY` in `mobile/.env`
2. `VoiceExperienceProvider` starts Porcupine when:
   - App is **resumed** (foreground)
   - Overlay is hidden
   - Not recording/processing
3. On detection → haptic → `VoiceOverlay` → recording (wire `VoicePipelineService`)

## Path 2 — OS shortcuts

### iOS (`ios/Runner/`)

| File | Purpose |
|------|---------|
| `Info.plist` | `kinsight://` URL scheme + mic usage strings |
| `AppDelegate.swift` | Forwards cold/warm URL opens to Flutter (`app_links`) |
| `AppIntents/KinSightVoiceIntent.swift` | Siri phrases: "Tell KinSight to …", "Open KinSight" |

**Xcode steps:**
1. Add `AppIntents/KinSightVoiceIntent.swift` to Runner target
2. Enable **App Intents** capability (iOS 16+)
3. Build & run on device — register shortcuts in Settings → Siri

**Test URL:**
```
kinsight://voice?command=log%20a%20meeting&source=siri
```

### Android (`android/app/`)

| File | Purpose |
|------|---------|
| `src/main/AndroidManifest.xml` | `VIEW` intent-filters for `kinsight://` + HTTPS |
| `src/main/res/xml/shortcuts.xml` | Launcher / Assistant shortcuts |
| `src/main/kotlin/.../MainActivity.kt` | Standard `FlutterActivity` |

**Google Assistant App Actions (next step):**
1. Create `actions.xml` under `res/xml/` per [App Actions docs](https://developers.google.com/assistant/app)
2. Map `tell_kinsight` shortcut to `kinsight://voice?command={query}&source=google`

**Test via adb:**
```bash
adb shell am start -a android.intent.action.VIEW -d "kinsight://voice?command=log%20meeting&source=google"
```

## Hand-off flow

```
OS shortcut opens app (Path 2)
  → OsVoiceLaunchService parses URI
  → wake word paused
  → VoiceOverlay shown
  → if command text: VoicePipelineService.submitTextCommand()
    else: begin microphone capture
  → session ends
  → wake word resumes (Path 1)
```

## Run

```bash
cd mobile
flutter run
```

## Wire to production API

Update `VoicePipelineService` with your auth token and the same endpoints used by the Next.js app (`/api/recordings`, `/api/agent`).
