# Capacitor iOS Setup - Quick Reference

Your React app is now wrapped with Capacitor for iOS native distribution. Here's what was done and what's next.

## What Was Installed

- **Capacitor Core**: Native app framework
- **Capacitor iOS**: iOS platform support
- **Native Plugins**:
  - Status Bar (customized dark mode)
  - Keyboard (form input handling)
  - App (back button support)

## New npm Scripts

```bash
npm run build:ios     # Build the web app and sync to iOS
npm run open:ios      # Open Xcode to build/test/submit to App Store
```

## To Build for iOS

1. **Ensure your environment variables are set in `.env`** (required for Supabase, Square, etc.)

2. **Build and open Xcode**:
   ```bash
   npm run build:ios
   npm run open:ios
   ```

3. **In Xcode**:
   - Select your team for signing
   - Build and run on simulator or device
   - Product → Archive for App Store submission

## File Structure

```
project/
├── src/              # Your React app (unchanged)
├── dist/             # Built web files
├── ios/              # Native iOS project
│   └── App/          # Xcode workspace
├── capacitor.config.ts  # Capacitor configuration
└── iOS_DEPLOYMENT_GUIDE.md  # Detailed submission guide
```

## Key Configuration Files

- **`capacitor.config.ts`**: App ID, name, web directory, plugin settings
- **`vite.config.ts`**: Outputs to `dist/` directory for iOS
- **`ios/App/App/Info.plist`**: Native permissions and settings
- **`ios/App/App/Assets.xcassets`**: App icons (update with your branding)

## Environment Variables

Your `.env` values are automatically bundled into the web app. The iOS wrapper doesn't need separate configuration—it just displays your React app in a WebView with native plugin access.

## Important Notes

- **WebView Based**: The app runs your React code in a native WebView (99% of users won't notice the difference from a fully native app)
- **Plugins Work**: All Supabase, Square payments, and other third-party services work through normal web APIs
- **Performance**: Near-native performance for most use cases
- **Updates**: You can update the app by rebuilding and syncing—the native wrapper rarely needs changes

## Next Steps

1. **Test locally**: `npm run build:ios && npm run open:ios` → build on simulator
2. **Prepare for submission**: Read `iOS_DEPLOYMENT_GUIDE.md` for the complete checklist
3. **Submit to App Store**: Use Xcode's Archive and Distribute App features

## Development Workflow

```bash
# Make code changes
git add .
git commit -m "Your changes"

# Build and test
npm run build:ios
npm run open:ios

# Test thoroughly, then:
# In Xcode: Product → Archive → Distribute App → App Store Connect
```

## Troubleshooting

**White screen or crashes?**
- Rebuild with `npm run build:ios`
- Check Xcode console for JavaScript errors
- Ensure all environment variables are in `.env`

**Plugins not working?**
- Verify permissions in Info.plist
- Rerun `npx cap sync ios`

**Signing issues?**
- Ensure team is selected in Xcode project settings
- Check Xcode Preferences → Accounts for valid certificates

For detailed help, see `iOS_DEPLOYMENT_GUIDE.md`.
