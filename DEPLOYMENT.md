# 🚀 Deployment Guide

## Quick Deploy Options

### 1. Netlify (Recommended - Free)

**Automatic GitHub Deployment:**
1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Connect your GitHub repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Deploy!

**Manual Deploy:**
1. Run `npm run build`
2. Drag the `dist` folder to [netlify.com/drop](https://netlify.com/drop)
3. Get instant deployment!

### 2. Vercel (Also Free)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables
5. Deploy automatically

### 3. GitHub Pages

```bash
npm install --save-dev gh-pages
npm run build
npx gh-pages -d dist
```

## Environment Variables

All platforms need these variables:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Custom Domain Setup

### For Netlify:
1. Go to Site settings → Domain management
2. Add custom domain: `worshipandyaps.com`
3. Update DNS records:
   - A Record: `@` → `75.2.60.5`
   - CNAME: `www` → `your-site.netlify.app`

### SSL Certificate
Most platforms provide free SSL automatically.

## Build Optimization

The project is already optimized with:
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Asset optimization
- ✅ Gzip compression ready

## Troubleshooting

**Build fails?**
- Check Node.js version (18+ required)
- Clear node_modules: `rm -rf node_modules && npm install`

**Environment variables not working?**
- Ensure they start with `VITE_`
- Restart development server after changes

**Supabase connection issues?**
- Verify URL and key are correct
- Check Supabase project is active
- Ensure RLS policies are set up

## Performance Tips

- Images are optimized and served from CDN
- Code is split by route
- Database queries are optimized
- Caching headers are set

Your Calgary Bible Study website will be live in minutes! 🎉