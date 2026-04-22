# Apple OAuth Setup for Supabase

Apple authentication has been added to your app. Follow these steps to enable it in Supabase.

## Prerequisites

- Apple Developer Account (paid membership required)
- Supabase project dashboard access
- App ID already created in Apple Developer Console (or create one)

## Steps to Enable Apple OAuth

### 1. Create an App ID (if you don't have one)

1. Go to [Apple Developer Account](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
3. Click the **+** button to create a new identifier
4. Select **App IDs** and click **Continue**
5. Fill in:
   - **App Name**: Your app name (e.g., "Worship and Yapps")
   - **Bundle ID**: Use a reverse domain format (e.g., `com.yourcompany.worshipandyapps`)
   - Check **Sign in with Apple** under Capabilities
   - Click **Continue** → **Register**

### 2. Get Your Service ID

1. Go to **Certificates, Identifiers & Profiles** → **Identifiers** (if not there already)
2. Create a new identifier by clicking the **+** button
3. Select **Services IDs** and click **Continue**
4. Fill in:
   - **Identifier**: Enter a unique identifier (e.g., `com.worshipandyapps.service`)
   - Check **Sign in with Apple** under Capabilities
   - Click **Continue** → **Register**
5. Open this Service ID and click **Configure** for "Sign in with Apple"
6. Add your domain and return URLs:
   - **Primary App ID**: Select the App ID you created above
   - **Web Domain**: `tijbvxhakeskvvquyjse.supabase.co` (your Supabase domain, no https://)
   - **Return URLs**: Add these:
     - `https://tijbvxhakeskvvquyjse.supabase.co/auth/v1/callback?provider=apple` (for web)
     - `com.worshipandyapps.app://auth-callback` (for iOS Capacitor app)
     - `http://localhost:3000/` (for local development, optional)
   - Click **Save**

### 3. Create a Private Key (JWT)

1. Go to **Certificates, Identifiers & Profiles** → **Keys**
2. Click the **+** button to create a new key
3. Select **Sign in with Apple** and click **Continue**
4. Give it a name (e.g., "Supabase Key")
5. Check the **Primary App ID** checkbox and select your App ID
6. Click **Continue** → **Register**
7. Click **Download** to get your `.p8` file (this is your private key - save securely)
8. Copy your **Key ID** from this page (you'll need this too)

### 4. Configure in Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Providers**
3. Click on **Apple**
4. Enable the provider
5. Fill in the following fields:
   - **Service ID**: The Service ID you created (e.g., `com.worshipandyapps.service`)
   - **Team ID**: Your Apple Team ID (find at [developer.apple.com](https://developer.apple.com/account/membership/))
   - **Key ID**: The Key ID from step 3 (visible in Apple Developer Console when you created the key)
   - **Private Key**: Paste the entire contents of your `.p8` file - **this is the JWT secret key**. Include the header and footer lines:
     ```
     -----BEGIN PRIVATE KEY-----
     MIGfMA0GCSq...
     -----END PRIVATE KEY-----
     ```
6. Click **Save**

### 5. Test in Your App

1. Run your local dev server: `npm run dev`
2. Navigate to the login page
3. Click **"Continue with Apple"**
4. You should be redirected to Apple's login flow
5. After successful authentication, you'll be logged into your app

## Troubleshooting

- **"Invalid credentials" error**: Check that your Service ID, Team ID, and Key ID match exactly in Supabase. Also verify the Private Key (JWT) is the complete `.p8` file content with header/footer.
- **"Invalid private key" error**: Make sure you pasted the **entire** `.p8` file contents including:
  - `-----BEGIN PRIVATE KEY-----` (top)
  - `-----END PRIVATE KEY-----` (bottom)
  - All lines in between
- **Redirect URI mismatch**: Ensure return URLs in Apple Developer Console match exactly:
  - Web: `https://tijbvxhakeskvvquyjse.supabase.co/auth/v1/callback?provider=apple`
  - iOS: `com.worshipandyapps.app://auth-callback`

## User Data Handling

When a user signs in with Apple:
- Their email is provided (may be hidden if they chose "Hide My Email" in Apple)
- Basic profile information is available via `auth.user()` in your app
- No additional Supabase RLS policies are needed—Apple users are treated the same as other auth methods

---

**Implementation status**: Apple OAuth UI is ready in your app. Once you complete the Supabase setup above, users can immediately start signing in with Apple.
