import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight, Sun, Moon, Bell,
  Globe, Smartphone, ChevronRight, ChevronLeft, Star,
  BookOpen, Users, MessageSquare, ShieldCheck,
  User as UserIcon, Search, Spade, ClipboardList, Sparkles,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { WaitlistModal } from './WaitlistModal';
import { Logo } from '../ui/Logo';
import { supabase } from '../../lib/supabase';
import { Capacitor } from '@capacitor/core';

interface LandingPageProps {
  onEnter: () => void;
  onPreOrder: () => void;
  onViewEvents?: () => void;
  onViewTopics?: () => void;
  onViewTopicOfDay?: (topicId: string) => void;
  onCreateAccount?: () => void;
}

interface Topic {
  id: string;
  title: string;
  category: string;
  bible_verse?: string;
  tags: string[];
  content?: string;
  users?: { name?: string; city?: string };
}

// ---------- Static content ----------

const YAPS_CARDS = [
  { question: 'What does your faith look like on a Tuesday afternoon?', verse: 'Colossians 3:17' },
  { question: "What's something God has been teaching you through an ordinary moment?", verse: 'Psalm 46:10' },
  { question: 'When did community last surprise you with kindness?', verse: 'Hebrews 10:24–25' },
  { question: "What's a question about the Bible you've been afraid to ask out loud?", verse: 'James 1:5' },
];

const FEATURES = [
  {
    key: 'topics',
    emoji: '📖',
    label: 'Topics',
    title: 'A global conversation about faith and life',
    description:
      "Join real discussions about scripture, doubt, and everyday faith. Share what God is teaching you. Comment, like, and discover what others are studying — across every timezone.",
    pills: ['Scripture Q&A', 'Share reflections', 'Comment & like', 'Discover believers'],
    gradient: 'from-amber-100 to-orange-200',
  },
  {
    key: 'events',
    emoji: '⛪',
    label: 'Events',
    title: 'Find or host any kind of gathering',
    description:
      'Bible studies, worship nights, church hangouts, sports yaps, food yaps, and casual meetups — all in one place.',
    pills: ['Bible study', 'Worship night', 'Sports yap', 'Food yap', 'Prayer group'],
    gradient: 'from-rose-100 to-pink-200',
  },
  {
    key: 'cohost',
    emoji: '🤝',
    label: 'Co-host',
    title: 'Hosting alone is hard. We fixed that.',
    description:
      'Invite co-hosts and assign roles — worship, discussion, prayer, hospitality, tech. The app writes the invite message for you.',
    pills: ['Assign roles', 'Pre-written invites', 'Worship lead', 'Prayer lead'],
    gradient: 'from-violet-100 to-purple-200',
  },
  {
    key: 'messages',
    emoji: '💬',
    label: 'Messages',
    title: 'Everyone in one chat, automatically',
    description:
      "RSVP to an event and you're instantly added to the event group chat. Direct messages and group threads keep conversation going.",
    pills: ['Auto-added on RSVP', 'Event group chats', 'Direct messages', 'No extra apps'],
    gradient: 'from-sky-100 to-blue-200',
  },
  {
    key: 'privacy',
    emoji: '🛡️',
    label: 'Privacy',
    title: 'Show up without oversharing',
    description:
      'Friends-only events stay invisible to strangers. Share your general area without revealing your exact address. RSVP first to see who\'s attending.',
    pills: ['Friends-only events', 'Fuzzy location', 'RSVP-gated attendees'],
    gradient: 'from-emerald-100 to-teal-200',
  },
];

const HOW_IT_WORKS = [
  { num: '01', icon: UserIcon, title: 'Create your profile', body: 'Set your city, preferred gathering types, and optional spiritual gifts.' },
  { num: '02', icon: Search, title: 'Find or host a gathering', body: 'Browse events in your city by type or create your own in under a minute.' },
  { num: '03', icon: Spade, title: 'Show up & play Yaps', body: "RSVP and you're in the event chat. Arrive, grab a card, let conversation begin." },
];

const WHO_FOR = [
  { icon: BookOpen, title: 'Bible study seekers', body: 'Looking for a study group, prayer circle, or worship night near you.' },
  { icon: UserIcon, title: 'Hosts & leaders', body: 'Make leading less lonely. Delegate roles, coordinate RSVPs, keep everyone in one chat.' },
  { icon: MessageSquare, title: 'Faith conversation starters', body: 'Tired of impersonal apps. Ready to ask real questions grounded in scripture.' },
  { icon: ClipboardList, title: 'Pastors & small group leads', body: "A coordination tool that doesn't feel like a spreadsheet." },
];

// ---------- Component ----------

export function LandingPage({ onEnter, onPreOrder, onViewEvents, onViewTopics, onViewTopicOfDay, onCreateAccount }: LandingPageProps) {
  const { isDark, toggleTheme } = useTheme();
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        // Matches the source TopicsView uses for its Topic of the Day pick.
        // Same row set + same created_at DESC sort + same date hash modulo
        // means both pages always agree on today's topic.
        const { data, error } = await supabase
          .from('topics')
          .select('id, title, category, bible_verse, tags, content, created_at, users!topics_author_id_fkey(name, city)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setAllTopics((data || []) as Topic[]);
      } catch (e) {
        console.error('Error fetching topics:', e);
      }
    };
    fetchTopics();
  }, []);

  // Cards for the Yaps mockup + the rotated stack in the dark explainer.
  // Pulled from real topics. Topic-of-the-Day (deterministic daily rotation
  // by date hash) goes first so a returning visitor always sees today's
  // featured prompt. Falls back to the curated YAPS_CARDS if the table is
  // empty or hasn't loaded yet.
  const yapsCards = useMemo(() => {
    // Same source + same hash as TopicsView.getTopicOfTheDay so both pages
    // pick the same row for "today". No bible_verse filter — TopicsView
    // doesn't apply one either, and filtering would skew the modulo.
    if (allTopics.length === 0) return YAPS_CARDS;

    const today = new Date().toDateString();
    const dateHash = today.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const todIndex = dateHash % allTopics.length;
    const ordered = [allTopics[todIndex], ...allTopics.slice(0, todIndex), ...allTopics.slice(todIndex + 1)];

    return ordered.slice(0, 8).map((t) => ({
      question: (t.title || t.content || '').trim().replace(/\s+/g, ' ').slice(0, 140),
      verse: (t.bible_verse || '').split(';')[0].trim(),
      topicId: t.id,
    }));
  }, [allTopics]);

  const isNativeApp = Capacitor.isNativePlatform();
  // In the native app, the primary CTA drops the user straight into the feed
  // (no forced login) — sign-in is prompted later only when they take an
  // action that needs an account. On the website the CTA still routes to
  // account creation. This avoids an App Store 5.1.1 login-wall rejection and
  // lets people see value before committing.
  const goToApp = isNativeApp
    ? (onViewTopics ?? onEnter)
    : (onCreateAccount ?? onEnter);
  const primaryCtaLabel = isNativeApp ? 'Join the community' : 'Download on App Store';
  const primaryCtaShortLabel = isNativeApp ? 'Join community' : 'Get the App';
  const scrollToZone = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const seeHowToYap = () => scrollToZone('how-to-play');
  // Direct Stripe checkout for the card game — bypasses the in-app Shop page
  // entirely. Stays in sync with ProductCard's SHOP_CHECKOUT_URL.
  const CARD_GAME_CHECKOUT_URL = 'https://buy.stripe.com/bJeaEX7a38rZ1jv9ao0oM00';
  const openCardGameCheckout = () => {
    window.open(CARD_GAME_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] transition-colors font-sans">
      {/* Theme toggle floats — keeps existing behavior */}
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all z-30 border border-black/10"
      >
        {isDark ? <Sun className="w-5 h-5 text-teal-500" /> : <Moon className="w-5 h-5 text-[#64748B]" />}
      </button>

      {/* 1. Nav bar */}
      <nav
        className="sticky top-0 z-20 bg-[#F8FAFC]/85 dark:bg-[#0F172A]/85 backdrop-blur-md border-b border-black/10 dark:border-white/10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button onClick={onEnter} className="flex items-center gap-3 group text-left">
            <Logo size="sm" />
            <div className="leading-tight">
              <span className="block font-logo font-bold text-lg tracking-tight group-hover:text-[#2563eb] transition-colors">Worship N Yaps</span>
              <span className="block text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">Bible Study Community</span>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => (onViewTopics ?? onEnter)()}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#2563eb] hover:bg-[#EFF6FF] dark:hover:bg-white/5 transition-colors"
            >
              Topics
            </button>
            <button
              onClick={() => (onViewEvents ?? onEnter)()}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#2563eb] hover:bg-[#EFF6FF] dark:hover:bg-white/5 transition-colors"
            >
              Events
            </button>
            <button
              onClick={openCardGameCheckout}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#2563eb] hover:bg-[#EFF6FF] dark:hover:bg-white/5 transition-colors"
            >
              Shop
            </button>
          </div>

          <button
            onClick={goToApp}
            className="px-5 py-2.5 rounded-full bg-[#2563eb] text-white text-sm font-semibold shadow-sm hover:bg-[#1d4ed8] transition-colors"
          >
            {primaryCtaShortLabel}
          </button>
        </div>
      </nav>

      {/* 2. Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#14b8a6]/15 text-[#14b8a6] dark:bg-[#14b8a6]/25 dark:text-teal-300 text-xs font-semibold tracking-wide mb-8">
          <Globe className="w-3.5 h-3.5" />
          <span>Join the conversation</span>
        </div>

        <h1 className="font-logo font-bold text-[clamp(2.5rem,7vw,5rem)] leading-[1.05] tracking-tight mb-8">
          <span className="block">Because community</span>
          <span className="block">
            is more than <span className="text-[#2563eb]">Sunday.</span>
          </span>
        </h1>

        <p className="text-lg md:text-xl text-[#64748B] dark:text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed mb-10">
          Worship N Yaps helps you organize Bible studies, worship nights, casual hangouts, and faith
          conversations — and connects you with believers asking the same questions you are, anywhere in the world.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-5">
          <button
            onClick={goToApp}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#2563eb] text-white font-semibold shadow-md hover:bg-[#1d4ed8] transition-all hover:translate-y-[-1px]"
          >
            {isNativeApp ? <Users className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            <span>{primaryCtaLabel}</span>
          </button>
          <button
            onClick={openCardGameCheckout}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#14b8a6] text-white font-semibold shadow-md hover:bg-[#0d9488] transition-all hover:translate-y-[-1px]"
          >
            <Spade className="w-5 h-5" />
            <span>Buy the card game</span>
          </button>
          <button
            onClick={seeHowToYap}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-black/15 dark:border-white/20 text-[#0F172A] dark:text-[#F8FAFC] font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <span>How to Play</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Free to download · Card deck ships to you · Built for real people
        </p>
      </section>

      {/* Yaps explainer — dark */}
      <section id="the-app" className="bg-[#0F172A] text-[#F8FAFC] scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14b8a6] mb-4">The Signature Feature</p>
            <h2 className="font-logo font-bold text-4xl md:text-5xl leading-tight mb-6">
              Yaps — a card game for real conversations.
            </h2>
            <p className="text-[#CBD5E1] mb-8 leading-relaxed">
              Not every gathering needs a lesson plan. Yaps are casual — a potluck, a game night, a sports
              afternoon. Shuffle the cards, draw a question, and let the Bible guide the conversation.
            </p>
            <ul className="space-y-3">
              {[
                'Questions designed to spark honest, grounded conversation',
                'Each card ties back to a scripture for deeper reflection',
                'Works for any size group — 3 people or 30',
                'No prep required. Just show up and yap.',
              ].map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <Star className="w-4 h-4 mt-1 text-[#14b8a6] fill-[#14b8a6] flex-shrink-0" />
                  <span className="text-sm text-[#F8FAFC]/90">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Topic of the Day — yapsCards is already date-hash-rotated so
              index 0 is today's featured prompt. */}
          {(() => {
            const today = yapsCards[0];
            const todayTopicId = (today as { topicId?: string }).topicId;
            const goTopic = () => {
              if (todayTopicId && onViewTopicOfDay) onViewTopicOfDay(todayTopicId);
              else onEnter();
            };
            return (
              <div className="flex flex-col items-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[10px] font-bold uppercase tracking-[0.18em] mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  Topic of the Day
                </span>
                <button
                  type="button"
                  onClick={goTopic}
                  className="w-full max-w-md rounded-3xl bg-white text-[#0F172A] p-7 sm:p-8 shadow-2xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all text-left focus:outline-none focus:ring-4 focus:ring-white/30"
                >
                  {today.verse && (
                    <span className="inline-block px-2.5 py-1 rounded-full bg-[#14b8a6]/15 text-[#14b8a6] text-[11px] font-semibold mb-4">
                      {today.verse}
                    </span>
                  )}
                  <p className="font-logo text-2xl sm:text-3xl leading-snug mb-6">
                    {today.question}
                  </p>
                  <div className="flex items-center gap-2 text-[#2563eb] font-semibold text-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span>Join the conversation</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
                <p className="text-white/80 text-sm mt-5 max-w-md text-center leading-relaxed">
                  A new prompt every day. Drop your reflection, ask a question, or
                  read what believers from anywhere on the map are saying.
                </p>
              </div>
            );
          })()}
        </div>
      </section>

      {/* 5. Features — tab switcher */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2563eb] mb-3 text-center">Everything you need</p>
        <h2 className="font-logo font-bold text-4xl md:text-5xl leading-tight text-center mb-12">
          For your community
        </h2>

        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {FEATURES.map((f, i) => (
            <button
              key={f.key}
              onClick={() => setActiveFeature(i)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                i === activeFeature
                  ? 'bg-[#2563eb] text-white border-[#2563eb] shadow-sm'
                  : 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border-black/10 dark:border-white/15 hover:border-[#2563eb]/40'
              }`}
            >
              <span className="mr-1.5">{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>

        <div className={`rounded-3xl p-8 md:p-12 bg-gradient-to-br ${FEATURES[activeFeature].gradient} border border-black/5 shadow-sm`}>
          <h3 className="font-logo font-bold text-2xl md:text-3xl text-[#0F172A] mb-4 leading-tight">
            {FEATURES[activeFeature].title}
          </h3>
          <p className="text-[#0F172A]/80 leading-relaxed mb-6 max-w-2xl">
            {FEATURES[activeFeature].description}
          </p>
          <div className="flex flex-wrap gap-2">
            {FEATURES[activeFeature].pills.map((p) => (
              <span
                key={p}
                className="px-3 py-1.5 rounded-full bg-white/80 text-[#0F172A] text-xs font-medium border border-black/5"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Topics — real DB data */}
      <section className="bg-[#EFF6FF] dark:bg-[#1E293B]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2563eb] mb-3">Global Groupchat</p>
          <h2 className="font-logo font-bold text-4xl md:text-5xl leading-tight mb-6 max-w-3xl">
            No one of us sees the whole picture.
          </h2>
          <p className="text-[#64748B] dark:text-[#CBD5E1] max-w-2xl mb-4 leading-relaxed">
            We're all searching for the same truth. None of us see the whole picture from where we're standing.
            A believer in Lagos sees what someone in Calgary can't. A new Christian asks the question the
            ten-year-veteran forgot to ask. The fuller view comes from <em>each other</em>.
          </p>
          <p className="text-[#64748B] dark:text-[#CBD5E1] max-w-2xl mb-12 leading-relaxed">
            No algorithm. No engagement bait. Just real questions and reflections from believers wrestling
            with the same things you are — anywhere on the map.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: 'prayer_point', emoji: '🙏', label: 'Prayer Point',  blurb: 'Share what you need prayer for.' },
              { key: 'testimony',    emoji: '✨', label: 'Testimony',     blurb: 'What God is doing in your life.' },
              { key: 'bible_study',  emoji: '📖', label: 'Bible Study',   blurb: 'Scripture you’re wrestling with.' },
              { key: 'question',     emoji: '❓', label: 'Question',      blurb: 'Ask the community anything.' },
              { key: 'general',      emoji: '💬', label: 'General',       blurb: 'Anything on your mind.' },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  // Persist the chosen community sub-tab so TopicsView's
                  // mount effect can pick it up. Use onViewTopics (not raw
                  // onEnter) so the bottom-nav tab is forced to 'topics' —
                  // otherwise an existing active tab like Messages stops
                  // TopicsView from mounting and the signal is lost.
                  try { sessionStorage.setItem('wny_initial_community_sub', cat.key); } catch { /* ignore */ }
                  (onViewTopics ?? onEnter)();
                }}
                className="text-left bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-black/10 dark:border-white/10 shadow-sm hover:shadow-md transition-all hover:translate-y-[-2px] flex flex-col gap-2"
              >
                <span className="text-3xl" aria-hidden="true">{cat.emoji}</span>
                <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm">{cat.label}</span>
                <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] leading-snug">{cat.blurb}</span>
                <span className="text-[11px] text-[#2563eb] mt-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  See {cat.label.toLowerCase()}s
                </span>
              </button>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => (onViewTopics ?? onEnter)()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0F172A] dark:bg-[#F8FAFC] text-[#F8FAFC] dark:text-[#0F172A] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              See the full feed
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 6.5 How to Play — pulled from the WnY card-game instruction sheets */}
      <section id="how-to-play" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-16">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2563eb] mb-3 text-center">How to Play</p>
        <h2 className="font-logo font-bold text-4xl md:text-5xl leading-tight text-center mb-4">
          So, you want to host a Yap.
        </h2>
        <p className="text-center text-[#64748B] dark:text-[#CBD5E1] max-w-2xl mx-auto mb-14 leading-relaxed">
          Here's the same flow we use for the in-person Yaps. Print it, screenshot it,
          or just keep this page open while you host.
        </p>

        {/* Create a vibe — vertical timeline */}
        <div className="rounded-3xl bg-white dark:bg-[#1E293B] border border-black/10 dark:border-white/10 p-7 md:p-10 mb-8 shadow-sm">
          <h3 className="font-logo font-bold text-2xl md:text-3xl mb-8">How to create a vibe</h3>
          <div className="relative pl-6">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#E2E8F0] dark:bg-white/15" aria-hidden="true" />
            {[
              { dot: '#F59E0B', title: 'Fellowship',        body: 'Open time to connect and build relationships.' },
              { dot: '#10B981', title: 'Communion',         body: 'Share and eat food to build energy.' },
              { dot: '#EF4444', title: 'Worship',           body: 'Focus on God, which unites us.' },
              { dot: '#EC4899', title: 'Prayer',            body: 'Acknowledging God and conversing with Him.' },
              { dot: '#0EA5E9', title: 'Yap',               body: 'Conversation between people — not a sermon in one direction.' },
              { dot: '#A78BFA', title: 'Order and Freedom', body: 'Have a plan but be sensitive to the Holy Spirit and the people in the room.' },
            ].map((step) => (
              <div key={step.title} className="relative pl-6 pb-6 last:pb-0">
                <span
                  className="absolute -left-[19px] top-1 w-5 h-5 rounded-full border-4 border-white dark:border-[#1E293B]"
                  style={{ backgroundColor: step.dot }}
                  aria-hidden="true"
                />
                <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm uppercase tracking-wider mb-1">
                  {step.title}
                </div>
                <p className="text-[#64748B] dark:text-[#CBD5E1] text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roles */}
        <div className="rounded-3xl bg-white dark:bg-[#1E293B] border border-black/10 dark:border-white/10 p-7 md:p-10 mb-8 shadow-sm">
          <h3 className="font-logo font-bold text-2xl md:text-3xl mb-8">Roles</h3>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                label: 'Host',
                pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
                points: [
                  'Welcome everyone and create a good atmosphere',
                  'Help coordinate food',
                  'Explain house rules and considerations',
                ],
              },
              {
                label: 'Guest',
                pill: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
                points: [
                  'Arrive on time',
                  'Bring food if possible',
                  'Serve others and help clean',
                ],
              },
              {
                label: 'Worship Leader',
                pill: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
                points: [
                  'Come early to practice',
                  'Pick 2–3 God-focused songs',
                  'Keep it simple',
                  'After worship, share a short word or Bible verse',
                ],
              },
              {
                label: 'Discussion Leader',
                pill: 'bg-stone-200 text-stone-800 dark:bg-stone-700/50 dark:text-stone-200',
                points: [
                  'Get the conversation going — maybe an icebreaker to start',
                  'Help the group stay on topic',
                  'Use hand-raising to avoid interruptions',
                ],
              },
            ].map((role) => (
              <div
                key={role.label}
                className="rounded-2xl border border-black/10 dark:border-white/10 p-5"
              >
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${role.pill}`}>
                  {role.label}
                </span>
                <ul className="space-y-1.5">
                  {role.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-[#0F172A]/85 dark:text-[#F8FAFC]/85 leading-relaxed">
                      <span className="text-[#2563eb] mt-1.5 leading-none">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* How to ask good questions */}
          <div className="rounded-3xl bg-white dark:bg-[#1E293B] border border-black/10 dark:border-white/10 p-7 md:p-9 shadow-sm">
            <h3 className="font-logo font-bold text-2xl mb-5">How to ask good questions</h3>
            <ul className="space-y-2.5">
              {[
                'Consider what challenges we face and what choices we can make.',
                'Try to find a relevant scripture and apply the principle.',
                "Don't expose sin — expose heart, intentions, and positions.",
                'Invite stories (e.g. "Tell me about a time when…").',
                'Flip it on its head and see the other side.',
                'Follow up with "Can you unpack that more?" or "What makes you say that?"',
                'Silence is okay.',
              ].map((q) => (
                <li key={q} className="flex items-start gap-2 text-sm text-[#0F172A]/85 dark:text-[#F8FAFC]/85 leading-relaxed">
                  <span className="text-[#2563eb] mt-1.5 leading-none">•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] italic mt-5">
              In the gospels, Jesus spent a lot of time asking and answering questions. Be like Jesus.
            </p>
          </div>

          {/* Icebreaker ideas */}
          <div className="rounded-3xl bg-[#2563eb] text-white p-7 md:p-9 shadow-sm flex flex-col">
            <h3 className="font-logo font-bold text-2xl mb-5">Ice breaker ideas</h3>
            <ul className="space-y-3 flex-1">
              {[
                'What are you thankful for?',
                'A testimony of what God has done this week?',
                'Your favourite Bible verse?',
              ].map((q) => (
                <li key={q} className="flex items-start gap-2 text-base leading-relaxed">
                  <span className="mt-1.5 leading-none opacity-80">→</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-white/70 mt-5">
              Start a conversation with a fun question, Then let the Yap follow.
            </p>
          </div>
        </div>
      </section>

      {/* 7. How it works — still part of the "How to Play" zone */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-16">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2563eb] mb-3 text-center">Up and running</p>
        <h2 className="font-logo font-bold text-4xl md:text-5xl leading-tight text-center mb-14">
          Up and running in minutes
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="rounded-2xl bg-white dark:bg-[#1E293B] border border-black/10 dark:border-white/10 p-7 shadow-sm"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-3xl font-logo font-bold text-[#2563eb]">{step.num}</span>
                  <div className="w-10 h-10 rounded-full bg-[#2563eb]/10 text-[#2563eb] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="font-logo font-bold text-xl mb-2">{step.title}</h3>
                <p className="text-sm text-[#64748B] dark:text-[#CBD5E1] leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. Who it's for — dark */}
      <section className="bg-[#0F172A] text-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14b8a6] mb-3">Who It's For</p>
          <h2 className="font-logo font-bold text-4xl md:text-5xl leading-tight mb-12 max-w-3xl">
            Built for people who show up
          </h2>

          <div className="grid sm:grid-cols-2 gap-5">
            {WHO_FOR.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-white/5 border border-white/10 p-7">
                <div className="w-11 h-11 rounded-xl bg-[#14b8a6]/20 text-[#14b8a6] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-logo font-bold text-xl mb-2">{title}</h3>
                <p className="text-sm text-[#CBD5E1] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final CTA — "Get the Deck" zone */}
      <section id="get-the-deck" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-16">
        <div className="rounded-3xl bg-[#2563eb] text-white p-10 md:p-16 text-center shadow-xl">
          <div className="text-5xl mb-5">🃏</div>
          <h2 className="font-logo font-bold text-4xl md:text-5xl leading-tight mb-5">
            Ready to play?
          </h2>
          <p className="max-w-2xl mx-auto text-white/90 leading-relaxed mb-9">
            {isNativeApp
              ? "You're in. Find a gathering, start one, or just ask the question you have been holding onto."
              : 'Download Worship N Yaps. Find a gathering, start one, or just ask the question you have been holding onto.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={goToApp}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#2563eb] font-semibold shadow-md hover:bg-white/90 transition-colors"
            >
              {isNativeApp ? <Users className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
              <span>{primaryCtaLabel}</span>
            </button>
            <button
              onClick={() => setShowWaitlist(true)}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span>Join the waitlist</span>
            </button>
          </div>
          <button
            onClick={openCardGameCheckout}
            className="mt-6 text-white/85 underline underline-offset-4 text-sm hover:text-white"
          >
            Or buy the card game →
          </button>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="font-logo font-bold">Worship N Yaps</span>
          </div>
          <p className="text-[#64748B] dark:text-[#94A3B8] text-center text-xs">
            Because community is more than Sunday. · Calgary, Canada · Everywhere else too.
          </p>
          <div className="flex items-center gap-5 text-[#64748B] dark:text-[#CBD5E1]">
            <a href="/privacy.html" className="hover:text-[#2563eb]">Privacy</a>
            <a href="/terms.html" className="hover:text-[#2563eb]">Terms</a>
            <a href="/support.html" className="hover:text-[#2563eb]">Contact</a>
          </div>
        </div>
      </footer>

      <WaitlistModal
        isOpen={showWaitlist}
        onClose={() => setShowWaitlist(false)}
        productType="card_game"
      />

      {(onViewEvents) && (
        // Hidden helper — keeps the prop interface stable for callers that pass it.
        <span hidden onClick={onViewEvents} />
      )}
    </div>
  );
}
