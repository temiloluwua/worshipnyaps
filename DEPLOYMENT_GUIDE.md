# Deployment Guide - Worship and Yapps

This app deploys to **Vercel**. The `vercel.json` file handles the build command,
output directory, and the SPA rewrite that serves `index.html` for client-side
routes and deep links (e.g. `/event/{id}`). Pushing to `main` triggers a deploy.

## Primary: Vercel (Recommended)

Vercel is pre-configured in this project via `vercel.json`.

**Steps:**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **"New Project"** and select your repository
4. Vercel auto-detects the Vite app and reads `vercel.json`
5. Add environment variables under **Project Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_NAME`
   - `VITE_APP_DESCRIPTION`
   - `VITE_SQUARE_APPLICATION_ID`
   - `VITE_SQUARE_ACCESS_TOKEN`
   - `VITE_SQUARE_LOCATION_ID`
6. Click **Deploy**

Once connected, every push to `main` auto-deploys.

**Deploy time:** ~1-2 minutes  
**Cost:** Free tier available

---

## Alternative Hosting Options

The build is a static SPA (`dist/`), so it runs on any static host. If you ever
move off Vercel, make sure the host rewrites all routes to `/index.html` (the
SPA fallback) — otherwise deep links like `/event/{id}` will 404.

### Firebase Hosting (Google)

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase init hosting` in your project (set `dist` as the public dir, configure as an SPA)
3. Build: `npm run build`
4. Deploy: `firebase deploy`

### AWS Amplify

1. Go to [aws.amplify.console.com](https://aws.amplify.console.com)
2. Click **"Create app"** and connect your Git repository
3. Add environment variables
4. Click **Deploy**

### Self-Hosting (Advanced)

1. Build locally: `npm run build`
2. Upload the `dist/` folder to your server
3. Configure your web server (nginx/Apache) with an SPA fallback:
   ```nginx
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

---

## Environment Variables

You need these for the app to work. Add them to your hosting platform:

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

After deploying, point your domain at Vercel (Project → Settings → Domains).
Vercel provisions a free SSL cert and handles DNS. For other hosts, add the
domain in their dashboard (or update your registrar's A record for self-hosting).

## Monitoring & Logs

- **Vercel**: Dashboard → select project → Deployments → View logs
- **Firebase**: Firebase Console → Hosting → View logs
- **Self-hosted**: SSH into your server and check your web server logs

## Rolling Back

- **Vercel**: One-click rollback in the dashboard (promote a previous deployment)
- **Firebase/AWS**: Previous versions available in deploy history
- **Self-hosted**: Keep a backup of previous `dist/` folders

---

**Your app is production-ready.** Connect the Git repository to Vercel and pushes to `main` deploy automatically.
