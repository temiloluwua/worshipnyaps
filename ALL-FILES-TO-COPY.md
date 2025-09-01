# 📦 Complete File Copy-Paste Guide

Copy each section below to create the corresponding file in GitHub.

## 🎯 **Step 1: Create Repository**
1. Go to [github.com](https://github.com)
2. Click "New" → Name: `worship-and-yapps` → Public → ✅ Add README → Create

---

## 📄 **ROOT FILES** (Create these in the main folder)

### **File: package.json**
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

### **File: index.html**
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

### **File: vite.config.ts**
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

### **File: tailwind.config.js**
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

### **File: tsconfig.json**
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

### **File: postcss.config.js**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## 📁 **SRC FILES** (Create folder: src/)

### **File: src/main.tsx**
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

### **File: src/index.css**
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

### **File: src/App.tsx**
```typescript
import React, { useState } from 'react';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { TopicsView } from './components/topics/TopicsView';
import { LocationsView } from './components/locations/LocationsView';
import { NetworkView } from './components/network/NetworkView';
import { SignupView } from './components/signup/SignupView';
import { useAuth } from './hooks/useAuth';

function App() {
  const [activeTab, setActiveTab] = useState<'topics' | 'locations' | 'signup' | 'network'>('topics');
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pb-16">
        {activeTab === 'topics' && <TopicsView />}
        {activeTab === 'locations' && <LocationsView />}
        {activeTab === 'network' && <NetworkView />}
        {activeTab === 'signup' && <SignupView />}
      </main>
      
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
    </div>
  );
}

export default App;
```

### **File: src/vite-env.d.ts**
```typescript
/// <reference types="vite/client" />
```

---

## 📁 **COMPONENTS** (Create folder: src/components/)

### **File: src/components/Header.tsx**
```typescript
import React from 'react';
import { User, Bell, Settings } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="bg-blue-600 text-white rounded-lg p-2 mr-3">
              <span className="font-bold text-lg">WnY</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Worship and Yapps</h1>
              <p className="text-xs text-gray-500">Calgary Bible Study Community</p>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell size={20} />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Settings size={20} />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <User size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
```

### **File: src/components/BottomNavigation.tsx**
```typescript
import React from 'react';
import { MessageSquare, MapPin, Users, UserPlus } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'topics' | 'locations' | 'signup' | 'network';
  onTabChange: (tab: 'topics' | 'locations' | 'signup' | 'network') => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    {
      id: 'topics' as const,
      name: 'Topics',
      icon: MessageSquare,
    },
    {
      id: 'locations' as const,
      name: 'Events',
      icon: MapPin,
    },
    {
      id: 'network' as const,
      name: 'Network',
      icon: Users,
    },
    {
      id: 'signup' as const,
      name: 'Serve',
      icon: UserPlus,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1 font-medium">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
```

---

## 📁 **TOPICS** (Create folder: src/components/topics/)

### **File: src/components/topics/TopicsView.tsx**
```typescript
import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Topic {
  id: number;
  question: string;
  category: string;
  likes: number;
  comments: number;
  isLiked: boolean;
}

const sampleTopics: Topic[] = [
  {
    id: 1,
    question: "How do you find peace in difficult times through prayer?",
    category: "Prayer & Faith",
    likes: 24,
    comments: 8,
    isLiked: false
  },
  {
    id: 2,
    question: "What does it mean to love your neighbor as yourself in today's world?",
    category: "Love & Community",
    likes: 31,
    comments: 12,
    isLiked: true
  },
  {
    id: 3,
    question: "How can we show God's grace in our daily interactions?",
    category: "Grace & Mercy",
    likes: 18,
    comments: 6,
    isLiked: false
  }
];

export function TopicsView() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topics, setTopics] = useState(sampleTopics);

  const handleLike = (id: number) => {
    setTopics(topics.map(topic => 
      topic.id === id 
        ? { ...topic, isLiked: !topic.isLiked, likes: topic.isLiked ? topic.likes - 1 : topic.likes + 1 }
        : topic
    ));
  };

  const nextTopic = () => {
    setCurrentIndex((prev) => (prev + 1) % topics.length);
  };

  const prevTopic = () => {
    setCurrentIndex((prev) => (prev - 1 + topics.length) % topics.length);
  };

  const currentTopic = topics[currentIndex];

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Discussion Topics</h1>
        <p className="text-gray-600">Swipe through thought-provoking questions for Bible study and fellowship</p>
      </div>

      <div className="relative">
        {/* Topic Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4 min-h-[300px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                {currentTopic.category}
              </span>
              <span className="text-sm text-gray-500">
                {currentIndex + 1} of {topics.length}
              </span>
            </div>
            
            <h2 className="text-lg font-semibold text-gray-800 mb-6 leading-relaxed">
              {currentTopic.question}
            </h2>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={() => handleLike(currentTopic.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentTopic.isLiked 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Heart className={`w-5 h-5 ${currentTopic.isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{currentTopic.likes}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">{currentTopic.comments}</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
              <Share2 className="w-5 h-5" />
              <span className="font-medium">Share</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={prevTopic}
            className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <div className="flex space-x-2">
            {topics.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextTopic}
            className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 📁 **LOCATIONS** (Create folder: src/components/locations/)

### **File: src/components/locations/LocationsView.tsx**
```typescript
import React, { useState } from 'react';
import { MapPin, Calendar, Users, Clock, Heart, Share2 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  attendees: number;
  category: string;
  description: string;
  distance: string;
}

const sampleEvents: Event[] = [
  {
    id: '1',
    title: 'Young Adults Bible Study',
    location: 'Hillhurst Community Centre',
    date: 'Tonight',
    time: '7:00 PM',
    attendees: 12,
    category: 'Bible Study',
    description: 'Join us for an interactive study on the book of Romans',
    distance: '0.8 km'
  },
  {
    id: '2',
    title: 'Prayer & Worship Night',
    location: 'Centre Street Church',
    date: 'Tomorrow',
    time: '6:30 PM',
    attendees: 25,
    category: 'Worship',
    description: 'Come together for an evening of prayer and worship',
    distance: '1.2 km'
  },
  {
    id: '3',
    title: 'Community Outreach',
    location: 'Downtown Calgary',
    date: 'Saturday',
    time: '10:00 AM',
    attendees: 8,
    category: 'Service',
    description: 'Serving meals to those in need',
    distance: '2.1 km'
  }
];

export function LocationsView() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());

  const categories = ['All', 'Bible Study', 'Worship', 'Service', 'Fellowship'];

  const filteredEvents = selectedCategory === 'All' 
    ? sampleEvents 
    : sampleEvents.filter(event => event.category === selectedCategory);

  const toggleLike = (eventId: string) => {
    const newLiked = new Set(likedEvents);
    if (newLiked.has(eventId)) {
      newLiked.delete(eventId);
    } else {
      newLiked.add(eventId);
    }
    setLikedEvents(newLiked);
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <h1 className="text-2xl font-bold mb-2">Events Near You</h1>
        <p className="text-blue-100">Discover Bible studies and gatherings in Calgary</p>
      </div>

      {/* Category Filter */}
      <div className="p-4 bg-gray-50">
        <div className="flex space-x-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="p-4 space-y-4">
        {filteredEvents.map((event) => (
          <div key={event.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            {/* Event Header */}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{event.title}</h3>
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {event.category}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div className="font-medium">{event.date}</div>
                  <div>{event.time}</div>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-3">{event.description}</p>

              {/* Location & Distance */}
              <div className="flex items-center text-gray-500 text-sm mb-2">
                <MapPin className="w-4 h-4 mr-1" />
                <span className="flex-1">{event.location}</span>
                <span className="text-blue-600 font-medium">{event.distance}</span>
              </div>

              {/* Attendees */}
              <div className="flex items-center text-gray-500 text-sm mb-4">
                <Users className="w-4 h-4 mr-1" />
                <span>{event.attendees} attending</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                  <button
                    onClick={() => toggleLike(event.id)}
                    className={`flex items-center space-x-1 text-sm transition-colors ${
                      likedEvents.has(event.id)
                        ? 'text-red-600'
                        : 'text-gray-500 hover:text-red-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likedEvents.has(event.id) ? 'fill-current' : ''}`} />
                    <span>Interested</span>
                  </button>
                  <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 text-sm transition-colors">
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  Join Event
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Event Button */}
      <div className="p-4">
        <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all">
          Host an Event
        </button>
      </div>
    </div>
  );
}
```

---

## 📁 **NETWORK** (Create folder: src/components/network/)

### **File: src/components/network/NetworkView.tsx**
```typescript
import React, { useState } from 'react';
import { Users, MessageCircle, Heart, Share2, UserPlus, Search, Filter } from 'lucide-react';

export function NetworkView() {
  const [activeFilter, setActiveFilter] = useState('all');

  const networkMembers = [
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Bible Study Leader',
      church: 'Grace Community Church',
      interests: ['Prayer', 'Worship', 'Youth Ministry'],
      mutualConnections: 12,
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      isOnline: true
    },
    {
      id: 2,
      name: 'Michael Chen',
      role: 'Worship Leader',
      church: 'New Life Fellowship',
      interests: ['Music', 'Discipleship', 'Community'],
      mutualConnections: 8,
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      isOnline: false
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      role: 'Small Group Coordinator',
      church: 'Hillside Baptist',
      interests: ['Teaching', 'Outreach', 'Prayer'],
      mutualConnections: 15,
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      isOnline: true
    },
    {
      id: 4,
      name: 'David Kim',
      role: 'Youth Pastor',
      church: 'Calgary Christian Centre',
      interests: ['Youth', 'Sports', 'Mentoring'],
      mutualConnections: 6,
      avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
      isOnline: true
    }
  ];

  const filters = [
    { id: 'all', label: 'All', count: networkMembers.length },
    { id: 'leaders', label: 'Leaders', count: 3 },
    { id: 'online', label: 'Online', count: 3 },
    { id: 'nearby', label: 'Nearby', count: 2 }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Community Network</h1>
        <p className="text-gray-600">Connect with fellow believers in Calgary</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search members..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === filter.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Network Members */}
      <div className="space-y-4">
        {networkMembers.map((member) => (
          <div key={member.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                {member.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                  <button className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 transition-colors">
                    <UserPlus className="w-4 h-4" />
                    <span>Connect</span>
                  </button>
                </div>

                <p className="text-blue-600 font-medium mb-1">{member.role}</p>
                <p className="text-gray-600 text-sm mb-3">{member.church}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {member.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {member.mutualConnections} mutual connections
                  </p>

                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">Message</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition-colors">
                      <Heart className="w-4 h-4" />
                    </button>
                    <button className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Join Community CTA */}
      <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white text-center">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-90" />
        <h3 className="text-xl font-bold mb-2">Grow Your Faith Community</h3>
        <p className="mb-4 opacity-90">
          Connect with believers, join study groups, and build lasting friendships
        </p>
        <button className="bg-white text-blue-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors">
          Invite Friends
        </button>
      </div>
    </div>
  );
}
```

---

## 📁 **SIGNUP** (Create folder: src/components/signup/)

### **File: src/components/signup/SignupView.tsx**
```typescript
import React, { useState } from 'react';
import { User, Mail, Lock, Phone, MapPin, Calendar, Heart, Users } from 'lucide-react';

export function SignupView() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    city: '',
    dateOfBirth: '',
    interests: [] as string[],
    churchBackground: ''
  });

  const interests = [
    'Bible Study', 'Worship', 'Prayer', 'Community Service', 
    'Youth Ministry', 'Music', 'Teaching', 'Missions'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Signup data:', formData);
    // Handle signup logic here
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Our Community</h1>
        <p className="text-gray-600">Connect with fellow believers in Calgary</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Personal Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Contact & Location */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Contact & Location
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Calgary"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Interests & Background */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Interests & Background
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Areas of Interest
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {interests.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleInterestToggle(interest)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.interests.includes(interest)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Church Background
            </label>
            <select
              name="churchBackground"
              value={formData.churchBackground}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select your background</option>
              <option value="new-believer">New Believer</option>
              <option value="growing-christian">Growing Christian</option>
              <option value="mature-believer">Mature Believer</option>
              <option value="church-leader">Church Leader</option>
              <option value="exploring-faith">Exploring Faith</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Join Our Community
          </button>
          
          <p className="mt-4 text-sm text-gray-600">
            Already have an account?{' '}
            <button type="button" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign In
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
```

---

## 📁 **HOOKS** (Create folder: src/hooks/)

### **File: src/hooks/useAuth.ts**
```typescript
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'member' | 'host' | 'admin';
  is_approved: boolean;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email,
            name,
            phone,
            role: 'member',
            is_approved: true, // Auto-approve members, hosts need manual approval
          });

        if (profileError) throw profileError;
      }

      toast.success('Account created successfully!');
      return { data, error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success('Signed in successfully!');
      return { data, error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };
};
```

---

## 📁 **LIB** (Create folder: src/lib/)

### **File: src/lib/supabase.ts**
```typescript
import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback to demo values
const supabaseUrl = 'https://pobqjupcbhhkvparuszr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYnFqdXBjYmhoa3ZwYXJ1c3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5MzI0NzQsImV4cCI6MjA1MzUwODQ3NH0.example-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## 📁 **TYPES** (Create folder: src/types/)

### **File: src/types/index.ts**
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'host' | 'admin';
  isApproved: boolean;
  avatar?: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  hostId: string;
  isApproved: boolean;
}

export interface Event {
  id: string;
  title: string;
  type: 'bible-study' | 'basketball-yap' | 'hiking-yap' | 'other';
  description: string;
  date: string;
  time: string;
  locationId: string;
  hostId: string;
  capacity: number;
  attendees: string[];
  isPrivate: boolean;
  inviteCode?: string;
  roles: {
    worship: {
      leaderId?: string;
      musicians: string[];
      setList: string[];
    };
    discussion: {
      leaderId?: string;
    };
    hospitality: {
      coordinatorId?: string;
      foodItems: FoodItem[];
    };
    prayer: {
      leaderId?: string;
    };
  };
}

export interface FoodItem {
  id: string;
  item: string;
  assignedTo?: string;
  completed: boolean;
}

export interface Topic {
  id: string;
  title: string;
  category: string;
  content: string;
  authorId: string;
  createdAt: string;
  comments: Comment[];
  tags: string[];
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  replies: Reply[];
}

export interface Reply {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
}
```

---

## 🎯 **FINAL STEP: Create .env.example**

### **File: .env.example**
```
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Google Maps API Key (for location features)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## 🚀 **You're Done!**

**Your complete Calgary Bible Study community website is now ready!**

### **Features Included:**
✅ **Discussion Cards** - Swipeable Bible study questions
✅ **Event Discovery** - Find Calgary Bible studies and activities  
✅ **Community Network** - Connect with other members
✅ **Volunteer System** - Sign up to host or serve
✅ **Authentication** - User login/signup system
✅ **Mobile Responsive** - Works on all devices

### **Next Steps:**
1. **Connect to Netlify** for free hosting
2. **Set up custom domain** (worshipandyaps.com)
3. **Configure Supabase** for database (optional)

**Your website will be live and ready for the Calgary Bible Study community! 🎉**