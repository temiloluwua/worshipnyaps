# 📋 GitHub Copy-Paste Setup Guide

## 🎯 **Goal: Create Your Repository Manually**

Since you can't download files, let's copy-paste everything to GitHub manually.

## Step 1: Create GitHub Repository

1. **Go to** [github.com](https://github.com)
2. **Sign up/Login**
3. **Click** green "New" button
4. **Repository name**: `worship-and-yapps`
5. **Description**: `Calgary Bible Study Community Website`
6. **Public** repository
7. **Initialize with README** ✅ (check this box)
8. **Click** "Create repository"

## Step 2: Essential Files to Create

### **📄 File 1: package.json**
Click "Add file" → "Create new file" → Name: `package.json`

```json
{
  "name": "worship-and-yapps",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hot-toast": "^2.4.1",
    "date-fns": "^2.30.0",
    "lucide-react": "^0.263.1",
    "@supabase/supabase-js": "^2.56.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
```

### **📄 File 2: index.html**
Create new file → Name: `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Worship and Yapps - Calgary Bible Study Community</title>
    <meta name="description" content="Join Bible studies and community events across Calgary. Swipe through discussion cards, find local events, and connect with fellow believers." />
    <meta name="keywords" content="bible study, calgary, community, faith, worship, discussion, volunteer, christian, fellowship" />
    <meta name="author" content="Worship and Yapps Team" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://worshipandyaps.com/" />
    <meta property="og:title" content="Worship and Yapps - Calgary Bible Study Community" />
    <meta property="og:description" content="Join Bible studies and community events across Calgary. Swipe through discussion cards, find local events, and connect with fellow believers." />
    <meta property="og:image" content="https://worshipandyaps.com/og-image.jpg" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://worshipandyaps.com/" />
    <meta property="twitter:title" content="Worship and Yapps - Calgary Bible Study Community" />
    <meta property="twitter:description" content="Join Bible studies and community events across Calgary. Swipe through discussion cards, find local events, and connect with fellow believers." />
    <meta property="twitter:image" content="https://worshipandyaps.com/og-image.jpg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### **📄 File 3: vite.config.ts**
Create new file → Name: `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
```

### **📄 File 4: tailwind.config.js**
Create new file → Name: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        sky: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          700: '#0369a1',
        },
        orange: {
          50: '#fff7ed',
          500: '#f97316',
          700: '#c2410c',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          300: '#d1d5db',
          600: '#4b5563',
          800: '#1f2937',
          900: '#111827',
        },
        green: {
          600: '#16a34a',
          700: '#15803d',
        },
        red: {
          500: '#ef4444',
          600: '#dc2626',
        },
      },
    },
  },
  plugins: [],
}
```

### **📄 File 5: tsconfig.json**
Create new file → Name: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "allowSyntheticDefaultImports": true,
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "node",
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### **📄 File 6: postcss.config.js**
Create new file → Name: `postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## Step 3: Create src Folder Structure

Now create these folders and files in your repository:

### **📁 Create folder: src**

### **📄 src/main.tsx**
Create new file → Name: `src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster 
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#4ade80',
            secondary: '#fff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  </React.StrictMode>,
)
```

### **📄 src/index.css**
Create new file → Name: `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom scrollbar styles */
.scrollbar-thin {
  scrollbar-width: thin;
}

.scrollbar-thumb-blue-300::-webkit-scrollbar-thumb {
  background-color: #93c5fd;
  border-radius: 0.375rem;
}

.scrollbar-track-gray-100::-webkit-scrollbar-track {
  background-color: #f3f4f6;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: #93c5fd;
  border-radius: 0.375rem;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background-color: #f3f4f6;
}
```

### **📄 src/App.tsx**
Create new file → Name: `src/App.tsx`

```typescript
import React, { useState } from 'react';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { TopicsView } from './components/topics/TopicsView';
import { LocationsView } from './components/locations/LocationsView';
import { CommunityView } from './components/network/NetworkView';
import { SignupView } from './components/signup/SignupView';
import { AuthModal } from './components/auth/AuthModal';
import { useAuth } from './hooks/useAuth';

function App() {
  const [activeTab, setActiveTab] = useState<'topics' | 'locations' | 'signup' | 'network'>('topics');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { loading } = useAuth();

  console.log('App: Loading state:', loading);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Worship and Yapps...</p>
          <p className="text-xs text-gray-500 mt-2">Connecting to database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onShowAuth={() => setShowAuthModal(true)} />
      
      <main className="pb-16">
        {activeTab === 'topics' && <TopicsView />}
        {activeTab === 'locations' && <LocationsView />}
        {activeTab === 'network' && <CommunityView />}
        {activeTab === 'signup' && <SignupView />}
      </main>
      
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </div>
  );
}

export default App;
```

### **📄 src/vite-env.d.ts**
Create new file → Name: `src/vite-env.d.ts`

```typescript
/// <reference types="vite/client" />
```

## Step 4: Continue with More Files...

**This is getting long! Would you like me to:**

1. **Continue with the remaining files** (components, hooks, etc.)
2. **Give you a shorter version** with just the essential files
3. **Focus on specific components** you want to copy first

**Let me know which approach you prefer, and I'll continue with the rest of the files!**

## 🚀 **After You Create These Files**

1. **Connect to Netlify** for deployment
2. **Set up custom domain** (worshipandyaps.com)
3. **Add environment variables** for Supabase

**Ready to continue with more files?**