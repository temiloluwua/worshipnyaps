# ⚡ Quick Setup Guide - Get Your Website Live in 15 Minutes

## 🎯 **Goal: Get worshipandyaps.com Live**

Your **Worship and Yapps** Calgary Bible Study website is ready to deploy!

## 📦 **Step 1: Download Project (5 minutes)**

### **Essential Downloads:**
**Right-click and download these:**

1. **`src/` folder** ← Your entire app
2. **`package.json`** ← Dependencies  
3. **`vite.config.ts`** ← Build config
4. **`index.html`** ← Main page
5. **`tailwind.config.js`** ← Styling
6. **`tsconfig.json`** ← TypeScript
7. **`supabase/` folder** ← Database

### **Create Folder:**
- **Make** folder called `worship-and-yapps` on your computer
- **Put** all downloaded files inside it

## 🚀 **Step 2: GitHub Upload (5 minutes)**

1. **Go to** [github.com](https://github.com)
2. **Sign up/Login**
3. **Click** "New Repository"
4. **Name**: `worship-and-yapps`
5. **Public** repository
6. **Create** repository
7. **Upload** all your files (drag & drop)
8. **Commit** changes

## 🌐 **Step 3: Netlify Deployment (5 minutes)**

1. **Go to** [netlify.com](https://netlify.com)
2. **Sign up** with GitHub
3. **"New site from Git"**
4. **Choose** your `worship-and-yapps` repo
5. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. **Deploy**

## 🔗 **Step 4: Connect Domain**

1. **In Netlify**: Site Settings → Domain Management
2. **Add custom domain**: `worshipandyaps.com`
3. **Update DNS** in Square:
   - A Record: `@` → `75.2.60.5`
   - CNAME: `www` → `your-site.netlify.app`

## ✅ **What You'll Get**

Your live website with:
- 🙏 **Discussion Cards** - Swipeable Bible study questions
- 📍 **Event Discovery** - Find Calgary Bible studies
- 🤝 **Community Network** - Connect with members
- 🎯 **Volunteer System** - Host events or serve
- 📱 **Mobile Responsive** - Works on all devices

## 🆘 **Need Help?**

**Stuck on any step?** Tell me:
- Which step you're on
- What you see vs. what's expected
- Any error messages

**Your website will be live at worshipandyaps.com in 15 minutes! 🎉**