# Zeona — Your Daily Life Companion 
<p><strong>A personal, calm and private companion for emotional wellness, daily reflection, habits, voice journaling and mindful focus.</strong></p>

## 🌸 What is Zeona?

**Zeona** is a privacy-first mobile companion designed to help you slow down, acknowledge how you feel, and organize your life with gentleness rather than urgency.

Unlike conventional productivity apps that induce pressure through endless to-do lists and rigid metrics, Zeona provides a peaceful **Sanctuary**. It blends **emotional check-ins**, **reflective writing**, **voice journaling**, **gentle habit tracking**, and **cherished memories** into a single cohesive, calming experience.

---

## 🎨 Design Philosophy & Aesthetic

* **Soothing Pastel Palette**: Calming lavender (`#8b5cf6`), gentle sage green (`#10b981`), rose, and warm cream (`#fefef6`) backgrounds reduce visual fatigue.
* **Warm Typography**: Headings rendered in **Playfair Display** paired with **DM Sans** body text for an inviting editorial feel.
* **Non-Punitive Design**: No flashing red alerts or aggressive shame-based reminders. Streaks celebrate consistency while allowing room for rest.
* **Tactile Interactions**: Subtle haptic feedback and gentle micro-animations make interactions feel grounded and intentional.

---

## ✨ Core Features

### 1. Dashboard Sanctuary
* **Dynamic Time Greetings**: Context-aware greetings (*"Good morning"*, *"Good afternoon"*, *"Good evening"*).
* **Gentle Motivational Wisdom**: Curated, rotating mindfulness affirmations. Tap the sync button anytime for a fresh perspective.
* **Quick Access Bar**: One-tap shortcuts to write a journal entry, record a voice diary, review daily tasks, or open the calendar.
* **Daily Focus Snippet**: Surface up to 3 essential intentions without clutter.

### 2. Daily Mood Check-In & Emotional Insights
* **Expressive Mood Spectrum**: Check in with core feelings (Calm 😌, Happy 😊, Grateful ✨, Neutral 😐, Anxious 😟, Low 🌧️).
* **Contextual Tags**: Associate moods with activities (Work, Family, Rest, Nature, Sleep, Exercise).
* **Mood Sanctuary**: Revisit past days and emotional notes.
* **Visual Insights**: Charts illustrating mood distribution and energy patterns over 7, 30, and 90-day periods.

### 3. Reflective Journaling
* **Calm Rich Editor**: Distraction-free space for freeform thoughts, gratitude notes, and life lessons.
* **Draft Auto-Preservation**: Never lose an unfinished reflection.
* **Favorites & Bookmarks**: Star entries to revisit meaningful milestones.
* **Search & Filters**: Filter reflections by mood tag or search by keyword.

### 4. Voice Diaries
* **Voice Recording**: Instant audio capture with real-time waveform visualizers and elapsed timer.
* **In-App Playback**: Native scrubber, pause, resume, and playback controls.
* **Secure Cloud Storage**: Voice memos are stored in isolated, private Supabase Storage buckets accessible only by your authenticated account.

### 5. Mindful Priorities (Tasks)
* **Essential Intentions**: Group tasks into manageable categories (Today, Upcoming, Completed).
* **Simple Check-Off**: Smooth completion toggling with reassuring haptic feedback.
* **Zero Overwhelm**: Designed for 3–5 meaningful priorities per day rather than infinite backlogs.

### 6. Habit Tracker & Streaks
* **Weekly Strip Overview**: 7-day visual check-in strip directly on the home screen.
* **Calculated Streaks**: Best streak and current streak metrics computed strictly from verified completion logs.
* **Custom Habit Frequency**: Support for daily, weekly, and flexible mindfulness routines.

### 7. Private Memories Gallery
* **Cherished Photos**: Upload and organize photos representing moments of peace and gratitude.
* **Private Photo Isolation**: Images are stored in user-isolated storage folders (`<user_id>/...`).
* **Memory Journaling**: Add captions, dates, and reflections to any saved photo.

### 8. Unified Calm Calendar
* **Integrated Timeline**: Combines scheduled tasks, habit completion markers, and journal entries in one monthly and agenda view.
* **Day-at-a-Glance**: Tap any date to inspect historical logs and past reflections.

### 9. Sanctuary Settings & Privacy
* **Display & Identity**: Edit your preferred display name or avatar.
* **Custom Reminder Schedules**: Gentle notification reminders configured to your personal rhythm.
* **Complete Data Autonomy**: Export personal data or securely delete your account at any time.

---

## 🛠 Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Framework** | [React Native 0.76](https://reactnative.dev) with [Expo SDK 52](https://expo.dev) |
| **Routing** | [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation) |
| **Language** | [TypeScript 5.3](https://www.typescriptlang.org) (Strict mode) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) with AsyncStorage persistence |
| **Backend & Auth** | [Supabase](https://supabase.com) (PostgreSQL, Row-Level Security, Auth) |
| **Cloud Storage** | Supabase Storage (Private audio & photo buckets) |
| **Audio & Media** | `expo-av`, `expo-image-picker` |
| **Icons & Typography** | `@expo/vector-icons` (Ionicons), `@expo-google-fonts/dm-sans`, `@expo-google-fonts/playfair-display` |
| **Cloud Builds** | [Expo Application Services (EAS)](https://expo.dev/eas) |

---

## 📋 Prerequisites

Before setting up Zeona, ensure your environment meets the following requirements:

1. **Node.js**: `v18.x` or `v20.x` LTS ([Download Node.js](https://nodejs.org/))
2. **Package Manager**: `npm` (v9+) or `yarn`
3. **Git**: Installed and configured on your system
4. **Expo CLI**: Accessed via `npx expo`
5. **EAS CLI** *(Required only for building standalone APKs)*:
   ```bash
   npm install -g eas-cli
   ```
6. **Device / Emulator**:
   - **Android**: Physical phone with USB debugging enabled, or an Android Studio virtual device.
   - **iOS** *(macOS only)*: Xcode with iOS Simulator.
   - **Web**: Modern browser (Chrome, Safari, Firefox).

---

## 🚀 Step-by-Step Setup Guide

### 1. Clone Repository
```bash
git clone https://github.com/mahathiunique/zeona-app.git
cd zeona-app
```

### 2. Install Dependencies
```bash
npm install
```
*(If dependency resolution conflicts occur on newer npm versions, run `npm install --legacy-peer-deps`)*.

### 3. Configure Environment Variables
Create your local `.env` file from the provided template:
```bash
cp .env.example .env
```

Open `.env` and enter your public Supabase credentials:
```env
# ─── Supabase Configuration ───────────────────────────────────────────────
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_<your-anon-key>
```
> 🔒 **Security Notice**: Never paste your Supabase `service_role` key into client-side code or `.env`. Only use the public publishable anon key.

### 4. Run Locally

#### Option A: Run on Web (Instant in Browser)
```bash
npm run web
```
or:
```bash
npx expo start --web
```
Open **[http://localhost:8081](http://localhost:8081)** in your browser.

#### Option B: Run on Android (Emulator or Phone)
```bash
npm run android
```
or launch the interactive Metro bundler:
```bash
npx expo start
```
- Press <kbd>a</kbd> to launch the Android emulator.
- Press <kbd>r</kbd> to reload the application.
- Press <kbd>c</kbd> to clear bundler cache (`npx expo start -c`).

#### Option C: Run on iOS Simulator (macOS only)
```bash
npm run ios
```

---

## 🧪 Testing & Quality Verification

Run these validation checks prior to committing changes:

```bash
# 1. TypeScript compilation check
npm run typecheck

# 2. ESLint verification
npm run lint

# 3. Validate public Expo app configuration
npx expo config --type public
```

---

## 📦 Building the Standalone Android APK (EAS)

Zeona is configured with **EAS Build** to generate direct, installable `.apk` packages for Android (no Expo Go required):

### 1. Log in to EAS
```bash
npx eas login
```

### 2. Build Internal Preview APK
```bash
npx eas build --platform android --profile preview
```

### 3. Install on Android Devices
1. When the build completes, download the generated `.apk` file from the Expo link or scan the terminal QR code.
2. Transfer or open the `.apk` on your phone.
3. Tap **Install** (allow "Install Unknown Apps" from your browser/files if prompted).
4. Launch Zeona directly from your home screen.

---

## 🔒 Security & Data Isolation

* **Row-Level Security (RLS)**: Every database table in Supabase is governed by strict RLS policies. Queries are authenticated against `auth.uid() = user_id`, guaranteeing users can only read and write their own data.
* **Storage Isolation**: User audio memos and memory photos are uploaded to private bucket subdirectories keyed by user ID (`<user_id>/...`).
* **Client-Side RFC-4122 v4 UUIDs**: Primary keys are created using deterministic client-side UUID generation (`utils/uuid.ts`), allowing offline creation without primary key collisions upon sync.

---

## 📂 Project Directory Structure

```
zeona-app/
├── app/                        # Expo Router navigation screens
│   ├── (auth)/                 # Auth routes (login, register, reset-password)
│   ├── (tabs)/                 # Main 5-tab dashboard navigator
│   │   ├── index.tsx           # Home Sanctuary screen
│   │   ├── journal.tsx         # Journal feed & reflections
│   │   ├── create.tsx          # Quick creation sheet
│   │   ├── calendar.tsx        # Unified calendar & milestones
│   │   └── profile.tsx         # Profile, stats, and badges
│   ├── journal/                # Voice recorder, detail view, editor
│   ├── tasks/                  # Mindful task management
│   ├── habits/                 # Habit tracker and streak calendar
│   ├── mood/                   # Mood check-in and insights
│   ├── memories/               # Memory photo gallery and editor
│   ├── reminders/              # Notification scheduler
│   ├── settings/               # App preferences and privacy
│   └── _layout.tsx             # Root layout, fonts & splash management
├── assets/                     # Media & design assets
│   └── images/                 # App icons, splash screen, favicon
├── components/                 # Design system components
│   ├── ui/                     # ZText, ZCard, ZButton, ZBadge, ZInput, etc.
│   └── audio/                  # AudioPlayer, AudioWaveform
├── hooks/                      # Custom hooks (useFonts, useTheme, useVoiceRecorder)
├── services/                   # Supabase client, audioStorage, photoStorage, dataAccess
├── store/                      # Zustand state stores (auth, mood, journal, habits, etc.)
├── supabase/                   # Database schemas, migrations, and RLS rules
├── utils/                      # Client UUID generator, habit calculations, haptics
├── app.json                    # Expo configuration
├── eas.json                    # EAS build configuration
└── package.json                # Project dependencies and run scripts
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
```
