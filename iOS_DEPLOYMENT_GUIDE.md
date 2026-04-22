# iOS Deployment Guide - Worship and Yapps

This guide covers building and deploying your Vite + React app to iOS using Capacitor.

## Prerequisites

- **Mac with Xcode** (iOS development requires macOS)
- **Xcode 14+** installed
- **Node.js 18+** and npm installed
- **CocoaPods** installed (usually comes with Xcode)
- **Apple Developer Account** (for code signing and deployment)

## Build Steps

### 1. Build the Web App

```bash
npm run build
```

This creates the `dist/` folder that will be embedded in the iOS app.

### 2. Sync to iOS

```bash
npm run build:ios
```

This:
- Builds the web app (if not already built)
- Syncs the `dist/` folder to the iOS project
- Updates native dependencies

### 3. Open in Xcode

```bash
npm run open:ios
```

This opens `ios/App/App.xcodeproj` in Xcode.

### 4. Configure Signing in Xcode

1. **Select the "App" target** in the project navigator
2. Go to the **Signing & Capabilities** tab
3. Select your **Team** from the dropdown
4. Xcode will auto-generate a provisioning profile
5. Make sure **Bundle Identifier** is set to `com.worshipandyapps.app`

### 5. Configure Apple Sign-In (iOS)

Your app uses Apple OAuth for login. Add it to Xcode:

1. In **Signing & Capabilities**, click **+ Capability**
2. Search for **"Sign in with Apple"** and add it
3. Make sure the team is selected

### 6. Build & Run

**On a Simulator:**
```bash
# Just press Play in Xcode, or use:
xcode-select --install  # if needed
```

**On a Physical Device:**
1. Connect your iPhone/iPad with a USB cable
2. Select your device in Xcode (top-left dropdown)
3. Press **Play** (or Cmd+R)
4. Xcode will build, sign, and install the app

## Return URL Configuration for OAuth

For OAuth providers (Google, Apple) to work on iOS, you need to configure the custom URL scheme:

### Custom URL Scheme for Capacitor App

Your app's custom URL scheme is: `com.worshipandyapps.app://`

When configuring OAuth providers, use return URLs like:
- **Apple**: `com.worshipandyapps.app://auth-callback`
- **Google**: `com.worshipandyapps.app://auth-callback`

These are already configured in your Supabase auth handlers.

### Where to Add Return URLs

**In Apple Developer Console:**
1. Go to **Certificates, Identifiers & Profiles** → **Identifiers**
2. Select your App ID
3. Under **Sign in with Apple**, add the return URL: `com.worshipandyapps.app://auth-callback`

**In Google OAuth Console:**
1. Go to **APIs & Services** → **Credentials**
2. Edit your iOS OAuth credential
3. Add return URL: `com.worshipandyapps.app://auth-callback`

**In Supabase Dashboard:**
1. Go to **Authentication** → **Providers** → **Apple**
2. Supabase will receive the callback and handle redirect to your app

## Environment Variables for iOS

Your app reads environment variables from `.env` file at build time. Make sure these are set before building:

```
VITE_SUPABASE_URL=https://tijbvxhakeskvvquyjse.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_NAME=Worship and Yapps
VITE_APP_DESCRIPTION=Calgary Bible Study Community
```

## Testing OAuth on iOS Simulator

OAuth can be tricky on the simulator because it relies on the system browser. To test:

1. Use a **physical device** (recommended) — most reliable for OAuth testing
2. Or test on simulator with these steps:
   - Build and run on simulator
   - Click "Sign in with Apple"
   - You'll be redirected to system browser
   - Complete the flow
   - The app should receive the callback

## Building for Release / App Store

### 1. Update Version Numbers

In Xcode:
1. Select "App" target
2. Go to **General** tab
3. Update **Version** and **Build** numbers

### 2. Create an App Store Connect Entry

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **My Apps**
3. Click **+** to create a new app
4. Fill in app details (name, Bundle ID `com.worshipandyapps.app`, etc.)

### 3. Create a Release Build

In Xcode:
1. Select your device (not simulator)
2. Change scheme from "Debug" to "Release" (top toolbar)
3. Press Play to build and run the release build

### 4. Create an Archive

1. In Xcode: **Product** → **Archive**
2. This creates a `.xcarchive` file
3. Select **Distribute App** to upload to App Store Connect

### 5. Submit for Review

In App Store Connect:
1. Go to your app
2. Click **Version history** → **Create a new version**
3. Upload your archive
4. Fill in app details (description, screenshots, etc.)
5. Click **Submit for Review**

## Troubleshooting

### "Build Failed" Errors
- Run `npm run build:ios` again to sync latest changes
- Delete `ios/Pods` folder and re-run if pods are corrupted
- Clean Xcode build: **Product** → **Clean Build Folder** (Cmd+Shift+K)

### OAuth Not Working on iOS
- Make sure return URL is registered in Apple Developer Console
- Check Supabase dashboard has Apple provider enabled
- Test on physical device first (simulator can be unreliable)
- Check browser console in Xcode (View → Debug Area → Show Console)

### App Crashes on Launch
- Check Xcode console for error messages
- Make sure environment variables are set in `.env`
- Verify Supabase connection (check your VITE_SUPABASE_URL)

### "No provisioning profile" Error
- In Xcode, go to **Signing & Capabilities**
- Make sure a Team is selected
- Xcode will auto-generate a profile

## Key Configuration Values

Your app is configured as:
- **Bundle Identifier**: `com.worshipandyapps.app`
- **App Name**: Worship and Yapps
- **Minimum iOS**: 14.0
- **Custom URL Scheme**: `com.worshipandyapps.app://`
- **Status Bar**: Dark style

## Next Steps

1. **Test locally** on simulator or device
2. **Configure Apple Sign-In** in Apple Developer Console
3. **Test OAuth flow** end-to-end
4. **Build release version** when ready
5. **Submit to App Store** via Xcode and App Store Connect

---

**Your app is ready for iOS!** The Capacitor integration is complete and all native features (status bar, keyboard, OAuth) are configured.
