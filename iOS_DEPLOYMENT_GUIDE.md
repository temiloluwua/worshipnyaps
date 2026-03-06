# iOS Deployment Guide for Worship and Yapps

This guide walks you through deploying your Capacitor-wrapped iOS app to the App Store.

## Prerequisites

- Xcode 15+ installed
- Apple Developer account with active team membership
- Your iOS certificate and provisioning profiles (already configured)
- Deployment target: iOS 14.0+

## Quick Start

### 1. Open Xcode Project

```bash
npm run open:ios
```

This opens the iOS project in Xcode where you can make final configurations and build.

### 2. Configure App Identity

1. In Xcode, select the "App" project in the navigator
2. Select the "App" target
3. Go to the "General" tab
4. Update the following:
   - **Display Name**: "Worship and Yapps" (already set)
   - **Bundle Identifier**: `com.worshipandyapps.app` (already set, but verify if different)
   - **Version**: Set to your release version (e.g., 1.0.0)
   - **Build**: Set incrementally (e.g., 1, 2, 3)
   - **Minimum Deployments**: iOS 14.0

### 3. Configure Signing & Capabilities

1. Still in the "General" tab
2. Under "Signing & Capabilities":
   - Select your team
   - Ensure "Automatically manage signing" is checked
   - Xcode will handle the signing certificate and provisioning profiles

3. Verify the following capabilities are enabled:
   - **Keychain Sharing**: For secure credential storage (Supabase auth)
   - **App Groups**: If using shared data containers (optional)

### 4. Update App Icons and Splash Screen

#### App Icon
1. Open `ios/App/App/Assets.xcassets`
2. Replace `AppIcon` with your app icon set (1024x1024 is the main size needed)
3. Xcode will automatically generate all required sizes

#### Launch Screen
1. In Xcode, select the "LaunchScreen.storyboard"
2. Customize with your app branding (optional - current default is fine)

### 5. Configure App Settings

Before building, ensure your environment variables are properly set:

1. Check that `.env` has all required values:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   VITE_SQUARE_APPLICATION_ID=your_id
   # ... other environment variables
   ```

2. Rebuild and sync if you change environment variables:
   ```bash
   npm run build:ios
   npm run open:ios
   ```

## Building the App

### Development Build (Testing on Simulator)

1. In Xcode, select "App" scheme and "iPhone 15 Pro" simulator
2. Press Cmd+B to build, or Cmd+R to build and run
3. Test all features thoroughly

### Production Build (App Store Submission)

1. In Xcode, select "App" scheme
2. Select "Any iOS Device (arm64)" instead of a simulator
3. Go to **Product → Archive**
4. Once complete, Xcode opens the Organizer window
5. Click **Distribute App**
6. Select **App Store Connect** and follow the prompts

## App Store Submission Checklist

Before submitting to App Store Connect:

- [ ] App version number updated (e.g., 1.0.0)
- [ ] Build number incremented
- [ ] All environment variables set
- [ ] App icons configured
- [ ] Privacy policy URL prepared
- [ ] App description written (2-4 sentences about your app)
- [ ] Screenshots prepared (2-5 per orientation)
- [ ] Keywords set (30 characters max per)
- [ ] Support URL configured
- [ ] Marketing URL (optional)
- [ ] Age rating completed
- [ ] SKU set (e.g., worship-and-yapps-1)
- [ ] Category selected (likely "Lifestyle" or "Education")

## Common Issues & Solutions

### Issue: "Code signing identity not found"
**Solution**:
1. Go to Xcode Preferences → Accounts
2. Click your Apple ID, then click "Manage Certificates"
3. Ensure your development/distribution certificates are valid
4. In Project Settings → Signing, select your team

### Issue: "App crashes on launch"
**Solution**:
1. Check the debug console in Xcode for error messages
2. Ensure all Supabase environment variables are set
3. Verify that the web assets were copied (check `ios/App/App/public/`)
4. Rebuild with `npm run build:ios`

### Issue: "Plugins not working (camera, location, etc)"
**Solution**:
1. Ensure Info.plist has the required permissions:
   - Camera: `NSCameraUsageDescription`
   - Location: `NSLocationWhenInUseUsageDescription`
   - Contacts: `NSContactsUsageDescription`
2. Rerun `npx cap sync ios`
3. Rebuild the app

### Issue: "White screen on launch"
**Solution**:
1. Check browser console in Xcode: Product → Scheme → Edit Scheme → Run → Diagnostics → enable Console
2. Look for JavaScript errors
3. Ensure `index.html` is being loaded from `ios/App/App/public/`
4. Clear derived data: Xcode → Product → Clean Build Folder

## Development Workflow

For ongoing development:

```bash
# Make changes to your React code
# Then:
npm run build:ios        # Build web app and sync to iOS
npm run open:ios         # Open Xcode to test/archive
```

## Testing Native Features

The app includes these native plugins:
- **Status Bar**: Customized dark mode styling
- **Keyboard**: Proper resize behavior for forms
- **App**: Back button handling

All these are pre-configured. For testing:
1. Run on a real device (not simulator for best results)
2. Test all forms and input fields
3. Test back button navigation
4. Test landscape orientation

## Next Steps

1. Complete the checklist above
2. Build and test thoroughly on a real device
3. Submit to App Store Connect via Xcode Organizer
4. Apple reviews typically take 24-48 hours
5. Once approved, set a release date or release immediately

For more information, visit:
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Xcode Build & Release Documentation](https://developer.apple.com/documentation/xcode/archiving_your_app_for_distribution)
