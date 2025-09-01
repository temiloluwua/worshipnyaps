# 🚀 Deploy to Netlify - Step by Step Guide

## Method 1: Drag & Drop (Easiest - No GitHub needed)

### Step 1: Build Your Project
✅ **Already done!** Your `dist` folder is ready with your built website.

### Step 2: Deploy to Netlify
1. **Go to** [netlify.com](https://netlify.com)
2. **Sign up** for a free account (use email or GitHub)
3. **Look for the drag & drop area** on the dashboard
4. **Drag your `dist` folder** directly onto the Netlify deploy area
5. **Wait for deployment** (usually 30-60 seconds)
6. **Get your live URL!** (something like `amazing-site-123.netlify.app`)

### Step 3: Custom Domain Setup
1. **In Netlify dashboard** → Site settings → Domain management
2. **Add custom domain** → Enter: `worshipandyaps.com`
3. **Update DNS records** in your domain provider:
   - **A Record**: `@` → `75.2.60.5`
   - **CNAME**: `www` → `your-site-name.netlify.app`

## Method 2: GitHub Integration (If you get GitHub working)

### Step 1: Push to GitHub
1. Create repository on GitHub: `worship-and-yapps`
2. Upload all your project files
3. Make sure `package.json` and `vite.config.ts` are included

### Step 2: Connect to Netlify
1. **Go to** [netlify.com](https://netlify.com)
2. **New site from Git** → Choose GitHub
3. **Select** your `worship-and-yapps` repository
4. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Deploy site**

## Environment Variables (Optional)
If you want to connect to Supabase later:
1. **In Netlify** → Site settings → Environment variables
2. **Add**:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase key

## 🎉 What You'll Get

Your live website will have:
- ✅ **Discussion Cards** - Bible study questions
- ✅ **Event Discovery** - Calgary events  
- ✅ **Community Network** - Member connections
- ✅ **Volunteer System** - Host/serve options
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **Free SSL Certificate** - Secure HTTPS
- ✅ **Global CDN** - Fast loading worldwide

## 🔧 Troubleshooting

**Build fails?**
- Make sure all files are uploaded
- Check that `package.json` is in the root folder

**Site not loading?**
- Wait 5-10 minutes for DNS propagation
- Try incognito/private browsing mode

**Custom domain not working?**
- DNS changes can take 24-48 hours
- Use online DNS checker tools to verify

## 📞 Need Help?

Tell me if you encounter:
- Issues with the drag & drop
- Problems with custom domain setup
- Any error messages during deployment

**Your Calgary Bible Study website will be live in minutes! 🚀**