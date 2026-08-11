# KinSight Native Voice Integration

KinSight is a **Next.js 15** web app. Path 1 (wake word) runs in the WebView/browser today. Path 2 (Siri / Google Assistant) requires a **Capacitor** or native shell.

## Directory layout

```
native/
  README.md                          ← this file
  ios/AppIntents/KinSightVoiceIntent.swift
  ios/Info.plist.snippet.xml         ← URL scheme fragment
  android/res/xml/shortcuts.xml
  android/AndroidManifest.snippet.xml
capacitor.config.ts                  ← project root
src/
  contexts/VoiceExperienceContext.tsx
  components/voice/VoiceOverlay.tsx
  components/voice/VoiceExperienceRoot.tsx
  hooks/useAppForeground.ts
  hooks/useOsVoiceLaunch.ts
  lib/voice/wake-word-engine.ts
  lib/voice/os-voice-deeplink.ts
  lib/voice/native-bridge.ts
```

---

## Part 1 — In-app "Hey KinSight" (foreground wake word)

### 1. Install Picovoice (on-device)

```bash
npm install @picovoice/porcupine-web @picovoice/web-voice-processor
```

### 2. Create custom wake word

1. Sign up at [Picovoice Console](https://console.picovoice.ai/)
2. Create keyword **"Hey KinSight"** for Web (WASM) platform
3. Download `hey-kinsight_wasm.ppn` and `porcupine_params.pv`
4. Place files in:

```
public/wake-word/hey-kinsight_wasm.ppn
public/wake-word/porcupine_params.pv
```

### 3. Environment variables (`.env.local`)

```env
NEXT_PUBLIC_PICOVOICE_ACCESS_KEY=your_access_key
NEXT_PUBLIC_PICOVOICE_KEYWORD_PATH=/wake-word/hey-kinsight_wasm.ppn
NEXT_PUBLIC_PICOVOICE_MODEL_PATH=/wake-word/porcupine_params.pv
```

### 4. Runtime behavior

| Event | Behavior |
|-------|----------|
| App foreground | `useWakeWordBridge` starts Porcupine |
| App background / blur | Listener stops (battery + privacy) |
| Wake word detected | Haptic → `VoiceOverlay` → `beginRecording()` |
| OS shortcut active | Wake word paused until request completes |

---

## Part 2 — Siri (iOS) & Google Assistant (Android)

### Web / PWA testing (no native build)

Use URL deep links:

| Intent | URL |
|--------|-----|
| Open + listen | `https://your-app.vercel.app/?voice_capture=1&voice_source=siri` |
| Open + command | `https://your-app.vercel.app/?voice_command=log%20a%20meeting&voice_source=siri` |

**iOS Shortcut (manual):**

1. Shortcuts app → New Shortcut
2. Action: **Open URLs** → `https://kin-sight-app.vercel.app/?voice_command=YOUR_TEXT&voice_source=siri`
3. Name: **Tell KinSight**
4. Add Siri phrase: *"Tell KinSight to log a meeting"*

### Capacitor native shell

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

Copy stubs:

- `native/ios/AppIntents/KinSightVoiceIntent.swift` → `ios/App/AppIntents/`
- Merge `native/ios/Info.plist.snippet.xml` into `ios/App/Info.plist` (URL scheme `kinsight://`)
- `native/android/res/xml/shortcuts.xml` → `android/app/src/main/res/xml/shortcuts.xml`
- Merge `native/android/AndroidManifest.snippet.xml` into `AndroidManifest.xml`

Custom URL examples:

```
kinsight://voice?command=log%20a%20meeting&source=siri
kinsight://capture?source=google
```

Native code should call:

```javascript
window.KinSightNativeBridge.onVoiceLaunch({
  command: "log a meeting",
  captureImmediately: true,
  source: "siri"
});
```

---

## Part 3 — Hand-off flow

```
OS Shortcut (Path 2)
  → parse URL / native bridge
  → navigate to Home if needed
  → VoiceOverlay opens (skip wake word)
  → if command text: submitTextCommand() → AI
  → else: beginRecording() → STT → AI
  → overlay closes
  → wake word listener resumes (Path 1)
```

Implemented in:

- `src/hooks/useOsVoiceLaunch.ts`
- `src/contexts/VoiceExperienceContext.tsx`
- `src/components/Dashboard.tsx` (registers `beginRecording` + `submitTextCommand`)

---

## Google Calendar sync env (optional)

```env
GOOGLE_CALENDAR_SYNC_ENABLED=true
OUTLOOK_CALENDAR_SYNC_ENABLED=true
```

Used by meeting Quick-Add background sync (`src/lib/calendar/sync-meeting.ts`).
