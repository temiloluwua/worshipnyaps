# 🚀 GitHub Repository Setup Guide

## Step 1: Create GitHub Repository

### **Go to GitHub:**
1. Visit [github.com](https://github.com)
2. Sign up or log in to your account
3. Click the **"New"** button (green button) or **"+"** → **"New repository"**

### **Repository Settings:**
- **Repository name**: `worship-and-yapps`
- **Description**: `Calgary Bible Study Community Website - Discussion Cards, Events, and Networking`
- **Visibility**: Public (recommended for free hosting)
- **Initialize**: Don't check any boxes (we have our own files)
- Click **"Create repository"**

## Step 2: Repository Information

After creating your repository, you'll get these details:

### **Repository URL:**
```
https://github.com/YOUR_USERNAME/worship-and-yapps
```

### **Clone URL (HTTPS):**
```
https://github.com/YOUR_USERNAME/worship-and-yapps.git
```

### **Clone URL (SSH):**
```
git@github.com:YOUR_USERNAME/worship-and-yapps.git
```

## Step 3: Upload Your Project Files

### **Method A: Web Upload (Easiest)**

1. **On your new GitHub repo page**, click **"uploading an existing file"**
2. **Drag and drop** all your project files:
   - `src/` folder
   - `package.json`
   - `vite.config.ts`
   - `tailwind.config.js`
   - `tsconfig.json`
   - `index.html`
   - `postcss.config.js`
   - `supabase/` folder
   - All other project files

3. **Commit message**: `Initial project upload - Worship and Yapps website`
4. **Click** "Commit changes"

### **Method B: Git Commands (Advanced)**

If you have Git installed locally:

```bash
# Navigate to your project folder
cd path/to/your/worship-and-yapps

# Initialize git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial project upload - Worship and Yapps website"

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/worship-and-yapps.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Connect to Netlify for Deployment

### **Automatic Deployment Setup:**

1. **Go to** [netlify.com](https://netlify.com)
2. **Sign up** using your GitHub account
3. **Click** "New site from Git"
4. **Choose** "GitHub"
5. **Select** your `worship-and-yapps` repository
6. **Build settings**:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: 18 (in Environment variables)
7. **Click** "Deploy site"

### **Environment Variables (Optional):**
If you need Supabase later:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

## Step 5: Custom Domain Setup

### **Add Your Domain:**
1. **In Netlify**: Site settings → Domain management
2. **Click** "Add custom domain"
3. **Enter**: `worshipandyaps.com`
4. **Follow** DNS configuration instructions

### **DNS Records for Square:**
Update your domain DNS settings in Square:

**A Record:**
- **Host**: `@` (or leave blank)
- **Points to**: `75.2.60.5`
- **TTL**: 3600

**CNAME Record:**
- **Host**: `www`
- **Points to**: `your-site-name.netlify.app`
- **TTL**: 3600

## Step 6: Repository Details Summary

### **Your Repository Information:**
- **Name**: `worship-and-yapps`
- **Full URL**: `https://github.com/YOUR_USERNAME/worship-and-yapps`
- **Clone URL**: `https://github.com/YOUR_USERNAME/worship-and-yapps.git`
- **Branch**: `main`
- **Language**: TypeScript/React
- **Framework**: Vite + React + Tailwind CSS

### **Project Structure:**
```
worship-and-yapps/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── ...
├── supabase/
│   └── migrations/
├── package.json
├── vite.config.ts
├── index.html
└── ...
```

## Step 7: Automatic Updates

Once connected to Netlify:
- ✅ **Push to GitHub** → **Auto-deploys** to your website
- ✅ **Pull requests** → **Preview deployments**
- ✅ **SSL certificate** → **Automatic HTTPS**
- ✅ **CDN** → **Fast global delivery**

## 🎉 Final Result

Your website will be live at:
- **Primary**: `https://worshipandyaps.com`
- **Netlify**: `https://your-site-name.netlify.app`

## 📞 Need Help?

**Tell me:**
1. Your GitHub username (so I can give you the exact URLs)
2. If you get stuck on any step
3. Any error messages you see

**Your Calgary Bible Study community website will be live soon! 🚀**