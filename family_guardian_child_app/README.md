# Family Guardian - Child App

Family Guardian is a transparent parental-supervision companion app built with Flutter. It is designed to sync a child's device status, location, and usage patterns with a central parental dashboard.

> [!IMPORTANT]
> **Development Status**: This app is currently in **active development**. Some features may be unstable, and data reported (such as screen time or location accuracy) may not always be 100% accurate.

## 🚀 Features

- **📍 Real-time Location**: Syncs device GPS coordinates to the parent dashboard.
- **📊 App Usage Tracking**: Monitors screen time and individual app usage (Android).
- **📱 Device Status**: Reports battery level, network type, and online status.
- **📞 Call & SMS Logs**: Monitors communication activity for safety.
- **🔐 Remote Management**: Supports remote locking and factory reset via Device Admin.
- **⏳ Screen Time Rules**: Enforces bedtime curfews and daily usage limits.
- **🛠️ Guardian Sync Service**: Utilizes Android Accessibility Services to detect foreground apps and URLs.

## 🛠️ Setup Instructions

### 1. Prerequisites
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (>= 3.3.0)
- Android Studio / VS Code
- A Google Cloud Project for Maps API

### 2. Environment Configuration
Create a `.env` file in the root directory by copying the example:
```bash
cp .env.example .env
```
Open `.env` and add your **Google Maps API Key**:
```env
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 3. Backend Configuration
The app needs to connect to your hosted backend API (e.g., hosted on **Render**, AWS, or Heroku). 

To point the app to your own instance, you can modify the default URLs in:
1. `lib/main.dart`: Update `AppConfig.prodUrl`.
2. `lib/theme/app_theme.dart`: Update the `defaultValue` in `ApiConfig.baseUrl`.

Alternatively, you can provide the URL at build time using `--dart-define`:
```bash
flutter run --dart-define=BASE_URL=https://your-backend-on-render.com
```

### 4. Running on an Emulator
To test the app on an Android Emulator:
1. Open **Android Studio** and start an **AVD (Android Virtual Device)**.
2. Ensure the emulator has **Google Play Services** installed for Maps functionality.
3. If your backend is running locally on your machine, use `http://10.0.2.2:PORT` as the base URL (this is the alias to your host machine's localhost from the emulator).
4. Run the app:
   ```bash
   flutter pub get
   flutter run
   ```

## 🔑 Permissions Required

Due to the nature of parental control, this app requires several high-level permissions to function correctly:

- **Device Administrator**: Required for remote locking and preventing unauthorized uninstallation.
- **Accessibility Service**: Required to monitor foreground applications and enforce app blocking.
- **Location (Always)**: Required for background location tracking.
- **Usage Stats**: Required to calculate screen time and app usage data.
- **SMS & Call Log**: Required to sync communication logs.

## 🏗️ Project Structure

- `lib/services/`: Core logic for API, Location, Sync, and Background tasks.
- `lib/screens/`: UI for Dashboard, Pairing, and the Lock Overlay.
- `android/`: Native Kotlin implementation for Accessibility Service and Device Admin.

## 🔮 Future Implementations

- **📸 Screenshot Capture**: Periodic remote screenshots for visual safety checks.
- **🎙️ Ambient Audio Monitoring**: Remote audio check-ins in emergency situations.
- **🛡️ Enhanced Web Filtering**: Deep packet inspection for blocking specific categories of web content.
- **📱 iOS Support**: Implementation of Apple's Screen Time API (Family Controls).
- **🔋 Intelligent Power Saving**: Adaptive sync intervals to preserve child device battery life.
- **📈 Advanced Analytics**: AI-driven insights into usage patterns and potential risks.

## ⚠️ Disclaimer

This app is intended for legal parental supervision purposes only. Ensure you comply with local privacy laws and regulations regarding device monitoring.

---
Built with Flutter & ❤️ for family safety.
