# Custodian — Mobile Build & Developer Workflow Guide

Custodian is wrapped with [Capacitor](https://capacitorjs.com/) for native **Android** and **iOS** applications.

---

## App Identity

- **App Name:** `Custodian`
- **Application ID / Bundle ID:** `com.custodians.app`
- **Platforms:** Android (`/android`), iOS (`/ios`)

---

## The Build + Sync Loop (Run after any code change)

Whenever you edit web UI code or styles, run this single command to recompile the web bundle and sync it to both native shells:

```bash
npm run cap:sync
```
*(Under the hood, this runs `npm run build && npx cap sync`)*

---

## Running & Testing on Android

### Prerequisites
- Android Studio or Android SDK command-line tools installed.
- An Android device with USB debugging enabled OR an Android Virtual Device (AVD) emulator running.

### Quick Commands

1. **Launch app on connected device or emulator:**
   ```bash
   npm run cap:android
   ```
   *(Or: `npx cap run android`)*

2. **Open native Android project in Android Studio:**
   ```bash
   npm run cap:open:android
   ```
   *(Or: `npx cap open android`)*

3. **Build standalone Debug APK directly from terminal:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   Output APK location:
   `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Running & Testing on iOS

### Prerequisites
- A Mac with macOS.
- **Xcode** (installed from the Mac App Store) and Xcode Command Line Tools (`xcode-select --install`).
- **CocoaPods** (`sudo gem install cocoapods`) or Swift Package Manager.

### Quick Commands

1. **Open the native iOS project in Xcode on Mac:**
   ```bash
   npm run cap:open:ios
   ```
   *(Or: `npx cap open ios`)*

2. **Inside Xcode:**
   - Select your target simulator (e.g. iPhone 15 Pro) or a connected iPhone.
   - Click the **Play** button (or press `Cmd + R`) to build and run.

---

## Native Features Implemented

### 1. Android Hardware Back Button
Configured in `src/native/nativeBridge.js` and wired into `src/Vault.jsx`:
- If an **overlay / modal** is open (e.g., Add Secret, Import .env, Health Audit, Client Handover) → presses back button to dismiss the modal.
- If the **Command Palette (Ctrl+K)** is open → closes it.
- If the **Mobile Sidebar Drawer** is open → slides drawer closed.
- If deep in a **Project Workspace (5 tabs)** → navigates back to the Owner Command Center overview.
- If on **another view** (Watchdog, Trash, Profile, Workspace) → navigates back to the main Vault.
- If at the **root overview** with no active screens → cleanly minimizes/exits the application.

### 2. Status Bar Styling
- Background set to `#171615` (matches Custodian's luxury obsidian background).
- Style set to `DARK` (light icons/clock for contrast).

### 3. Splash Screen & App Icon
- Custom high-resolution brand assets generated in `assets/`:
  - Gold shield with vault keyhole on obsidian background.
  - Centered luxury wordmark: `CUSTODIAN - ZERO-KNOWLEDGE CREDENTIAL VAULT`.
- Distributed to all Android density buckets (`mipmap-mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) and iOS `@1x`, `@2x`, `@3x` asset catalogs.
- Splash screen automatically dismisses smoothly upon app hydration (`SplashScreen.hide()`).

### 4. Permissions Scoping
- **Android (`AndroidManifest.xml`)**: Strictly minimal `<uses-permission android:name="android.permission.INTERNET" />`. File uploads use modern system document picker without requiring dangerous broad file system permissions.
- **iOS (`Info.plist`)**: Includes `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` for photo/document uploads in the Workspace and PRD attachments.
