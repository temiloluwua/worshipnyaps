# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Worship and Yapps** is a React + TypeScript web application for the Calgary Bible Study community. It provides discussion forums (Topics), event discovery & hosting (Locations), networking (Community), merchandise (Shop), and real-time messaging. The app uses Supabase for backend, Vite for building, and is mobile-responsive via Capacitor for iOS.

## Commands

### Development
- `npm run dev` — Start Vite dev server on http://localhost:5173 (hot reload enabled)
- `npm run build` — Production build to `dist/` folder
- `npm run build:check` — Type check with TypeScript then build
- `npm run lint` — Run ESLint on all `.ts` and `.tsx` files

### iOS Development (Capacitor)
- `npm run build:ios` — Build and sync to iOS project
- `npm run open:ios` — Open iOS project in Xcode

### Other
- `npm run preview` — Preview production build locally
- `npm run deploy` — Build and echo deploy instructions

## Architecture Overview

### Core Data Model
The app is built around five main data entities, all managed via Supabase:

1. **Topics** — Discussion cards with Bible study questions, likes, comments, and search
2. **Events** — Local meetups (Bible studies, basketball, hiking) with RSVP, attendee capacity, messaging
3. **Users** — Profiles with bio, avatar, connections, and spiritual gifts
4. **Connections** — Social graph (connection requests, followers)
5. **Messages** — Direct messages and group conversations with real-time chat

All data has Row Level Security (RLS) policies enforced. Authentication uses Supabase Auth (email/password).

### Frontend Architecture

**Navigation** — Single-page app controlled by `App.tsx` via a bottom tab bar (`BottomNavigation`). Each tab maps to a main view:
- `topics` → TopicsView (swipeable discussion cards)
- `locations` → LocationsView (map-based event discovery)
- `community` → NetworkView (user profiles, connections, search)
- `messages` → MessagesView (DM conversations)
- `shop` → ShopPage (merchandise via Square)

The app also supports deep linking for `/event/{id}` URLs and authentication modal overlays.

**Component Organization** — Components are organized by feature in `src/components/`:
- `auth/` — Login, signup, phone verification
- `events/` — Event detail, RSVP, messaging, organizer tools, description templates
- `topics/` — Topic cards, comments, hashtags, full-screen view
- `locations/` — Map, event discovery, RSVP modal, event creation
- `network/` — Profiles, connections, search
- `messages/` — Conversation list, DM composition
- `social/` — Reactions, shares, reposts
- `shop/` — Product cards, Stripe checkout, Square integration
- `ui/` — Reusable UI components (Modal, Select, Carousel, etc.)

**State Management** — No Redux/Zustand; state managed via:
- React hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
- Supabase client for persistence and real-time subscriptions
- Custom hooks in `src/hooks/` that wrap Supabase queries
- Context API for theme and authentication

### Key Hooks

All custom hooks in `src/hooks/` follow a consistent pattern: they manage component state via `useState`, call Supabase directly via the client, and export functions + state.

**Critical Hooks:**
- `useAuth()` — User session, login/logout, phone verification
- `useEvents()` — Event CRUD, RSVP tracking, attendee lists
- `useTopics()` — Topic cards, comments, search, likes
- `useDirectMessages()` — Conversations, DM send/receive, real-time subscriptions
- `useConnections()` — User connections, requests, search
- `useProfile()` — User profile data, avatar upload, bio
- `useNotifications()` — Notifications with real-time subscriptions
- `useChat()` — Event channel messaging (group chats within events)

### Database Schema

The Supabase database is PostgreSQL with 25+ tables. Key tables:
- `users` — User profiles (email, name, avatar, bio, spiritual gifts)
- `topics` — Discussion cards (title, category, bible verse, image)
- `comments` — Topic replies
- `events` — Meetups with dates, capacity, location, visibility (public/friends/private)
- `event_attendees` — RSVP registrations
- `conversation_participants`, `conversations`, `direct_messages` — Messaging
- `users_social_connections` — Friendship graph
- `connection_requests` — Pending friend requests
- `notifications` — User notifications (JSONB payload)
- `event_conversations` — Group chats within events

**Migrations** — All schema changes are in `supabase/migrations/`. Each migration file has a markdown header explaining the changes. Run migrations via Supabase CLI or the web dashboard.

**RLS Policies** — Every table has RLS enabled. Users can only see/edit their own data by default. Policies use `auth.uid()` for auth checks and `EXISTS` subqueries for membership/relationship checks. No policy uses `USING (true)`.

### Styling

- **Tailwind CSS** — All component styling via utility classes
- **Dark mode** — Implemented via `dark:` prefix; theme class added to `<html>` by `useTheme` hook
- **Design system** — Color ramps use blue (primary), green (success), amber (warning), red (error), plus neutral grays
- **Icons** — All icons from `lucide-react`
- **Responsive** — Mobile-first design with `sm:`, `md:`, `lg:` breakpoints

### Internationalization (i18n)

- **i18next** — Used for multi-language support
- **Locale files** — `src/i18n/locales/{en,es,fr}.json` contain all UI strings
- **Language detection** — Auto-detected from browser; user can override via `LanguageSwitcher`
- **Pattern** — Use `const { t } = useTranslation()` in components, then `t('key.path')`

## Common Patterns

### Controlled Forms in Modals
Many forms (EditEventModal, CreateTopicModal, etc.) use local `useState` for form state, then call a hook function (e.g., `updateEvent()`) on submit. Errors show via `toast.error()`. Success closes the modal via `onClose()` callback.

### Real-Time Subscriptions
Hooks use `supabase.channel().on('postgres_changes', ...)` to subscribe to database changes. Subscriptions are cleaned up in `useEffect` return. Example: `useDirectMessages` subscribes to new messages for the active conversation.

### Optimistic Updates
Most mutation hooks (like/comment/RSVP) call Supabase but don't wait for the response before updating local state. This gives fast UX but can cause stale state if the mutation fails silently. Error handling via `catch` and `toast.error()`.

### Event Description Templates
Events can have either freeform `description` or structured `description_template` (JSONB: whatToExpect, whatToBring[], parkingDirections, contactInfo, specialNotes). Toggle between modes in `EditEventModal` and `LocationsView.HostEventModal`. Display logic checks template content before rendering.

### Direct Messages
Function `get_or_create_dm_conversation(other_user_id)` creates/retrieves a 1:1 conversation. Uses RPC because it needs write access on behalf of the user. Messages are stored in `direct_messages` table with real-time subscriptions for live updates.

### Permissions & Visibility
Events have `visibility` (public, friends_only, private) + `is_private` (legacy). Private events require invite codes. Friends-only events only show to connections. RLS policies check these before returning data.

## Important Files & Their Roles

- `src/App.tsx` — Main app router and layout; manages activeTab, eventId, viewState
- `src/lib/supabase.ts` — Supabase client initialization + TypeScript type definitions for all tables
- `src/hooks/` — All data fetching/state management
- `src/components/Header.tsx` — Top navbar with auth, theme toggle, search
- `src/components/BottomNavigation.tsx` — Tab bar navigation (only on non-landing views)
- `supabase/config.toml` — Supabase project settings
- `supabase/migrations/` — All schema migrations with markdown docs
- `.env` — Supabase URL, anon key, app config (NOT in git; use `.env.example`)
- `package.json` — Dependencies (Supabase JS, React, Tailwind, Capacitor, Leaflet, i18next, etc.)
- `vite.config.ts` — Build config (manual chunks for vendor, supabase; polling watch for Docker)
- `tsconfig.json` — Strict TypeScript with JSX support

## Debugging & Troubleshooting

### Supabase Connection
- Check `.env` has valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Browser console should log "Supabase client initialized successfully"
- RLS policies can silently block queries — check Supabase dashboard logs

### Real-Time Not Working
- Ensure subscription is set up in `useEffect` and cleaned up in return
- Check Supabase realtime is enabled for the table in dashboard
- Verify policy allows SELECT (required for subscriptions)

### Type Errors
- Check if the Supabase table schema was updated without running migrations
- Run `npm run build:check` to catch TypeScript errors before building
- Generated types in `src/lib/supabase.ts` must match actual DB schema

### Build Issues
- `npm run build` outputs to `dist/`; check for JS errors in console
- Large chunk warnings are expected (project is 667KB min); not a blocker
- ESLint must pass with zero warnings before committing

## Deployment

- **Hosting** — Vercel (see `vercel.json` for the build command, output dir, and the SPA rewrite that serves `index.html` for deep links like `/event/{id}`)
- **Build output** — `dist/` folder is production-ready
- **Environment** — Deploy `.env` variables to hosting provider
- **iOS** — Use Capacitor to build native iOS app; requires Xcode

## Mobile & Capacitor

The app uses Capacitor for iOS native features (status bar, keyboard handling). Desktop-only browser builds work fine without Capacitor. For iOS:
1. Run `npm run build` first
2. Run `npm run build:ios` to sync to `ios/` folder
3. Open in Xcode: `npm run open:ios`
4. Build and run from Xcode

## Key Dependencies

- `react@18.2.0` — UI framework
- `@supabase/supabase-js@2.39.0` — Backend client
- `tailwindcss@3.3.3` — Styling
- `lucide-react@0.263.1` — Icons
- `react-i18next@16.5.4` — Translations
- `leaflet@1.9.4` + `react-leaflet@4.2.1` — Maps
- `@capacitor/*@8.x` — iOS native layer
- `date-fns@2.30.0` — Date utilities
- `react-hot-toast@2.4.1` — Toast notifications

## When Modifying This File

Keep it:
- Focused on architecture, not implementation details
- Updated when core patterns change (e.g., new state pattern, new critical hook)
- Free of repetition and obvious practices
- A map to help future Claude instances get productive quickly
