# Zeona — Your Daily Life Companion & Wellness Sanctuary

<div align="center">
  <img src="./assets/images/splash-icon.png" alt="Zeona Logo" width="180" style="border-radius: 24px;" />
  <p><strong>A personal, calm, and private companion for daily reflection, emotional wellness, habits, voice journaling, and mindful focus.</strong></p>

  [![Expo SDK 52](https://img.shields.io/badge/Expo-SDK%2052-000020.svg?style=flat&logo=expo)](https://expo.dev)
  [![React Native 0.76](https://img.shields.io/badge/React%20Native-0.76.3-61DAFB.svg?style=flat&logo=react)](https://reactnative.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
  [![Supabase](https://img.shields.io/badge/Supabase-Backend%20%26%20RLS-3ECF8E.svg?style=flat&logo=supabase)](https://supabase.com)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
</div>

---

## 📖 Table of Contents
- [About Zeona](#-about-zeona)
- [Key Features](#-key-features)
- [Prerequisites](#-prerequisites)
- [Step-by-Step Installation](#-step-by-step-installation)
- [Configuration (.env)](#-configuration-env)
- [Running the Project Locally](#-running-the-project-locally)
- [Code Quality & Verification](#-code-quality--verification)
- [Building Standalone Android APK (EAS)](#-building-standalone-android-apk-eas)
- [Project Architecture](#-project-architecture)
- [Security & Data Privacy](#-security--data-privacy)

---

## 🌿 About Zeona

**Zeona** is designed to bring calm, intentionality, and gentle encouragement to your everyday life. Built from the ground up with a soothing lavender and sage aesthetic, Zeona is an offline-friendly, privacy-first mobile companion that connects your daily moods, mindful tasks, reflective notes, audio voice diaries, and personal photo memories into a cohesive wellness journey.

---

## ✨ Key Features

- **🌸 Dashboard & Sanctuary**: Personalized dynamic greetings, gentle rotating wisdom, and quick access to daily priorities.
- **😌 Daily Mood Check-In**: Track emotional state with contextual tags, deep mood history, and longitudinal emotional insights.
- **✍️ Daily Reflections & Journaling**: Calming editor with mood tagging, favorites bookmarking, search, and draft preservation.
- **🎙️ Voice Diaries**: Fluid voice journal recording, animated waveforms, local playback, and private cloud audio storage.
- **✅ Mindful Priorities**: Focused daily task management without overwhelming clutter.
- **🌱 Habit Tracking**: Weekly streak visualization, streak calculations, and daily check-ins.
- **🖼️ Private Memories**: Cherished moments gallery with secure photo storage and privacy isolation.
- **📅 Calm Calendar**: Unified view of scheduled milestones, habits, and journal reflections.
- **⚙️ Sanctuary Settings**: Theme customization, notifications, export data, and complete account autonomy.

---

## 📋 Prerequisites

Before setting up Zeona, ensure you have the following installed on your development machine:

1. **Node.js**: `v18.x` or `v20.x` LTS ([Download Node.js](https://nodejs.org/))
2. **Package Manager**: `npm` (comes with Node) or `yarn` / `pnpm`
3. **Git**: Version control ([Download Git](https://git-scm.com/))
4. **Expo CLI**: Available via `npx expo`
5. **EAS CLI** (Optional, for Android APK builds):
   ```bash
   npm install -g eas-cli
   ```
6. **Hardware / Emulators**:
   - **Android**: Android Studio with an Android 13+ virtual device, or a physical Android phone with Developer Mode enabled.
   - **iOS** (macOS only): Xcode 15+ for iOS simulator.
   - **Web**: Modern Chromium, Firefox, or Safari browser.

---

## 🚀 Step-by-Step Installation

### 1. Clone the Repository
```bash
git clone https://github.com/mahathiunique/zeona-app.git
cd zeona-app
```

### 2. Install Project Dependencies
```bash
npm install
```

> **Note**: If you run into peer dependency issues on npm 7+, run `npm install --legacy-peer-deps`.

---

## 🔑 Configuration (.env)

Zeona connects to Supabase for authentication, cloud database records, and private storage buckets.

1. Copy the example environment template:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and verify your public credentials:
   ```env
   # ─── Supabase Configuration ───────────────────────────────────────────────
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_<your-publishable-key>
   ```

> ⚠️ **Important**: Never commit `.env` or service-role keys to git. The `.env` file is strictly ignored by `.gitignore`.

---

## 💻 Running the Project Locally

Zeona supports Web, Android, and iOS development targets:

### 1. Run on Web (Browser)
Fastest way to test screens and logic without any emulators:
```bash
npm run web
```
or:
```bash
npx expo start --web
```
Open **[http://localhost:8081](http://localhost:8081)** in your browser.

---

### 2. Run on Android Device / Emulator
To run on a connected Android phone or Android Studio emulator:
```bash
npm run android
```
or start the interactive Metro bundler:
```bash
npx expo start
```
- Press <kbd>a</kbd> in the terminal to open the Android emulator.
- Press <kbd>r</kbd> to reload the app.
- Press <kbd>c</kbd> to clear bundler cache if needed (`npx expo start -c`).

---

### 3. Run on iOS Simulator (macOS only)
```bash
npm run ios
```
- Press <kbd>i</kbd> in the terminal to launch the iOS simulator.

---

## 🧪 Code Quality & Verification

Run these commands before committing code or initiating a production build:

```bash
# 1. Run TypeScript typecheck across all screens and components
npm run typecheck

# 2. Run ESLint checks
npm run lint

# 3. Validate public Expo configuration
npx expo config --type public
```

---

## 📦 Building Standalone Android APK (EAS)

Zeona is pre-configured with Expo Application Services (EAS) to build standalone `.apk` packages that install directly on Android phones (no Expo Go required):

### 1. Authenticate with EAS
```bash
npx eas login
```

### 2. Build Internal/Preview APK
```bash
npx eas build --platform android --profile preview
```

### 3. Install on Phone
1. Once the EAS build completes, download the generated `.apk` from the provided URL or scan the QR code.
2. Open the file on your Android device and tap **Install**.
3. If prompted, toggle "Allow from this source" in Android settings.

---

## 📂 Project Architecture

```
zeona-app/
├── app/                        # Expo Router file-based navigation
│   ├── (auth)/                 # Authentication screens (login, register, reset-password)
│   ├── (tabs)/                 # Main tab navigator
│   │   ├── index.tsx           # Home Sanctuary dashboard
│   │   ├── journal.tsx         # Journal & reflection feed
│   │   ├── create.tsx          # Mindful quick creation hub
│   │   ├── calendar.tsx        # Calendar & milestones
│   │   └── profile.tsx         # User profile & stats
│   ├── journal/                # Voice recorder, detail, and rich editor
│   ├── tasks/                  # Mindful task management
│   ├── habits/                 # Habit tracker and streak calendar
│   ├── mood/                   # Mood check-in and insights
│   ├── memories/               # Photo gallery and memories editor
│   ├── reminders/              # Notification reminders
│   ├── settings/               # App appearance & privacy settings
│   └── _layout.tsx             # Root layout, font loader & splash screen
├── assets/                     # Images, brand icons, and typography
│   └── images/                 # Adaptive launcher icons, splash, favicon
├── components/                 # Reusable UI system
│   ├── ui/                     # ZText, ZCard, ZButton, ZBadge, ZInput, etc.
│   └── audio/                  # AudioPlayer, AudioWaveform
├── hooks/                      # Custom hooks (useFonts, useTheme, useVoiceRecorder)
├── services/                   # Supabase client, audioStorage, photoStorage, dataAccess
├── store/                      # Zustand state management (auth, mood, journal, habits, etc.)
├── supabase/                   # Migration SQL files, schemas, and RLS policies
├── utils/                      # Client UUID generator, habit calculations, haptics
├── app.json                    # Expo configuration (icons, permissions, plugins)
└── eas.json                    # EAS build profiles (preview APK, production)
```

---

## 🔒 Security & Data Privacy

- **Row-Level Security (RLS)**: Every database table in Supabase enforces strict user ownership (`auth.uid() = user_id`). Users can never query or manipulate data from other accounts.
- **Storage Isolation**: Audio recordings and memory photos are partitioned into authenticated folders (`<user_id>/...`).
- **Client-Side UUIDs**: All primary keys are generated on the client via RFC-4122 v4 UUIDs, allowing robust optimistic updates and offline resilience.

---

## 📄 License
This project is licensed under the MIT License.
