# Deployment Guide - Worship and Yapps

Your app is ready to deploy. Choose any hosting platform below. The `vercel.toml` file (which is actually a Netlify config) will automatically handle the build and routing.

## Quick Deployment Options

### Option 1: Netlify (Recommended - Easiest)

Netlify is pre-configured in your project.

**Steps:**
1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click **"New site from Git"**
4. Select your repository
5. Netlify will auto-detect the build settings from `vercel.toml`
6. Add environment variables under **Site settings → Build & deploy → Environment**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_NAME`
   - `VITE_APP_DESCRIPTION`
   - `VITE_SQUARE_APPLICATION_ID`
   - `VITE_SQUARE_ACCESS_TOKEN`
   - `VITE_SQUARE_LOCATION_ID`
7. Click **Deploy**

**Deploy time:** ~2 minutes  
**Cost:** Free tier available (pay as you grow)

---

### Option 2: Vercel (Fast, Free)

Works great with Vite apps.

**Steps:**
1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Select your GitHub repository
4. Vercel will auto-detect it's a Vite app
5. Add the same environment variables (see Option 1)
6. Click **Deploy**

**Deploy time:** ~1-2 minutes  
**Cost:** Free tier available

---

### Option 3: Firebase Hosting (Google)

Good for web apps with serverless functions.

**Steps:**
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase init hosting` in your project
3. Build: `npm run build`
4. Deploy: `firebase deploy`

**Deploy time:** ~2 minutes  
**Cost:** Free tier available

---

### Option 4: AWS Amplify

Good if you want full AWS integration.

**Steps:**
1. Go to [aws.amplify.console.com](https://aws.amplify.console.com)
2. Click **"Create app"**
3. Connect your Git repository
4. Add environment variables
5. Click **Deploy**

**Deploy time:** ~3-5 minutes  
**Cost:** Free tier available

---

### Option 5: Self-Hosting (Advanced)

Deploy to your own server/VPS.

**Steps:**
1. Build locally: `npm run build`
2. Upload the `dist/` folder to your server
3. Configure your web server (nginx/Apache) to serve the app:
   ```nginx
   # nginx example
   server {
     listen 80;
     server_name yourdomain.com;
     
     root /var/www/dist;
     index index.html;
     
     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```
4. Point your domain to your server's IP

**Cost:** Varies (typically $5-20/month for VPS)

---

## Environment Variables

You need these for your app to work. Add them to your hosting platform:

```
VITE_SUPABASE_URL=https://tijbvxhakeskvvquyjse.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_NAME=Worship and Yapps
VITE_APP_DESCRIPTION=Calgary Bible Study Community
VITE_SQUARE_APPLICATION_ID=sandbox-sq0idb-CuEoy-8A89IiW09r573aTg
VITE_SQUARE_ACCESS_TOKEN=EAAAl-YA1c1UENgjjs0bAVoraws94LczzE5S3JRsk6vpOkgmZcQ0rrHyQohqwuGp
VITE_SQUARE_LOCATION_ID=LK5TS52BK0ZBZ
```

## Custom Domain Setup

After deploying, point your domain to your hosting provider:

**For Netlify/Vercel:** They provide a free SSL cert and handle DNS  
**For AWS/Firebase:** Add your domain in their dashboard  
**For self-hosting:** Update your domain registrar's A record to point to your server IP

## Monitoring & Logs

- **Netlify**: Site settings → Deploys → View logs
- **Vercel**: Dashboard → Select project → Deployments → View logs
- **Firebase**: Firebase Console → Hosting → View logs
- **Self-hosted**: SSH into your server and check your web server logs

## Rolling Back

- **Netlify/Vercel**: One-click rollback in the dashboard
- **Firebase/AWS**: Previous versions available in deploy history
- **Self-hosted**: Keep backup of previous `dist/` folders

## Recommendations

**For a production app, use Netlify or Vercel** because they:
- Handle SSL certificates automatically
- Provide global CDN (fast downloads worldwide)
- Scale automatically
- Have excellent free tiers
- Support environment variables securely
- Provide rollback capabilities

---

**Your app is production-ready!** Just connect a Git repository and deploy. Choose Netlify or Vercel for the easiest experience.
