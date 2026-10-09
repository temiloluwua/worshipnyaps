import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight, Sun, Moon,
  Smartphone, ChevronRight, Star,
  BookOpen, Users, MessageSquare,
  User as UserIcon, Spade, ClipboardList, Sparkles, ShoppingBag,
  Instagram, Youtube, Layers, MapPin,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Logo } from '../ui/Logo';
import { T } from '../ui/T';
import { supabase } from '../../lib/supabase';
import { openAppStore } from '../../lib/appStore';
import { CARD_GAME_BUY_URL } from '../../lib/cardGame';
import { Capacitor } from '@capacitor/core';

interface LandingPageProps {
  onEnter: () => void;
  onPreOrder: () => void;
  onViewEvents?: () => void;
  onViewTopics?: () => void;
  onViewCommunity?: () => void;
  onViewTopicOfDay?: (topicId: string) => void;
  onCreateAccount?: () => void;
  onLogin?: () => void;
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
  { question: 'When did community last surprise you with kindness?', verse: 'Hebrews 10:24 to 25' },
  { question: "What's a question about the Bible you've been afraid to ask out loud?", verse: 'James 1:5' },
];

const WHO_FOR = [
  { icon: BookOpen, title: 'Bible study seekers', body: 'Looking for a study group, prayer circle, or worship night near you.' },
  { icon: UserIcon, title: 'Hosts & leaders', body: 'Make leading less lonely. Delegate roles, coordinate RSVPs, keep everyone in one chat.' },
  { icon: MessageSquare, title: 'Faith conversation starters', body: 'Tired of impersonal apps. Ready to ask real questions grounded in scripture.' },
  { icon: ClipboardList, title: 'Pastors & small group leads', body: "A coordination tool that doesn't feel like a spreadsheet." },
];

// ---------- Component ----------

export function LandingPage({ onEnter, onPreOrder, onViewEvents, onViewTopics, onViewCommunity, onViewTopicOfDay, onCreateAccount, onLogin }: LandingPageProps) {
  const { isDark, toggleTheme } = useTheme();
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  // How-to-Play starts collapsed so the page leads with the app, not the
  // physical card game. The hero "How to Play" button expands it.
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        // Matches the source TopicsView uses for its Topic of the Day pick.
        // Same row set + same created_at DESC sort + same date hash modulo
        // means both pages always agree on today's topic.
        const { data, error } = await supabase
          .from('topics')
          .select('id, title, category, bible_verse, tags, content, created_at, users!topics_author_id_fkey(name, city)')
          // Match the feed exactly: only approved topics, same created_at DESC
          // order. Without this the landing counts pending event topics too and
          // the date-hash lands on a different row than the app's Topic of Day.
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setAllTopics((data || []) as Topic[]);
      } catch (e) {
        console.error('Error fetching topics:', e);
      }
    };
    fetchTopics();
  }, []);

  // Canonical Topic of the Day — one server-side source (get_topic_of_the_day)
  // so the home page and the in-app feed always show the exact same topic.
  const [canonicalTotd, setCanonicalTotd] = useState<Topic | null>(null);
  useEffect(() => {
    supabase.rpc('get_topic_of_the_day').then(({ data }) => {
      if (data) setCanonicalTotd(data as Topic);
    });
  }, []);

  // Decorative card stack for the dark explainer. Falls back to curated
  // YAPS_CARDS until real topics load.
  const yapsCards = useMemo(() => {
    if (allTopics.length === 0) return YAPS_CARDS;
    return allTopics.slice(0, 8).map((t) => ({
      question: (t.title || t.content || '').trim().replace(/\s+/g, ' ').slice(0, 140),
      verse: (t.bible_verse || '').split(';')[0].trim(),
      topicId: t.id,
    }));
  }, [allTopics]);

  const todayTopic = canonicalTotd;
  const todaysTopicPeek = (canonicalTotd?.title || '').slice(0, 60);

  const openTodayTopic = () => {
    if (canonicalTotd?.id && onViewTopicOfDay) onViewTopicOfDay(canonicalTotd.id);
    else (onViewTopics ?? onEnter)();
  };

  const isNativeApp = Capacitor.isNativePlatform();
  // In the native app, the primary CTA drops the user straight into the feed
  // (no forced login) , sign-in is prompted later only when they take an
  // action that needs an account. On the website the CTA still routes to
  // account creation. This avoids an App Store 5.1.1 login-wall rejection and
  // lets people see value before committing.
  const goToApp = isNativeApp
    ? (onViewTopics ?? onEnter)
    : (onCreateAccount ?? onEnter);
  // The top-right nav CTA frames the whole app as opening the digital deck:
  // it drops the visitor straight into the card feed (the Topics "deck"),
  // where sign-in is only prompted when they take an action that needs it.
  const navCtaAction = onViewTopics ?? onLogin ?? onCreateAccount ?? onEnter;
  // "Buy the card game" links to the Amazon listing (physical product),
  // bypassing the in-app Shop page. Shares CARD_GAME_BUY_URL with ProductCard.
  const openCardGameCheckout = () => {
    window.open(CARD_GAME_BUY_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] transition-colors font-sans">
      {/* Theme toggle floats, keeps existing behavior */}
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all z-30 border border-black/10"
      >
        {isDark ? <Sun className="w-5 h-5 text-blue-500" /> : <Moon className="w-5 h-5 text-[#64748B]" />}
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
              <span className="block text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium"><T>Bible Study Community</T></span>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => (onViewTopics ?? onEnter)()}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#2563eb] hover:bg-[#EFF6FF] dark:hover:bg-white/5 transition-colors"
            >
              <T>Topics</T>
            </button>
            <button
              onClick={() => (onViewEvents ?? onEnter)()}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#2563eb] hover:bg-[#EFF6FF] dark:hover:bg-white/5 transition-colors"
            >
              <T>Events</T>
            </button>
            <button
              onClick={openCardGameCheckout}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#2563eb] hover:bg-[#EFF6FF] dark:hover:bg-white/5 transition-colors"
            >
              <T>Shop</T>
            </button>
          </div>

          <button
            onClick={navCtaAction}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2563eb] text-white text-sm font-semibold shadow-sm hover:bg-[#1d4ed8] transition-colors"
          >
            <Spade className="w-4 h-4" />
            <T>Play Deck</T>
          </button>
        </div>
      </nav>

      {/* 2. Hero — blue band with a live Topic-of-the-Day phone mockup. Shows
          the product immediately; the rest of the story unfolds on scroll. */}
      <section className="bg-[#2650eb] text-white rounded-b-[2.5rem]">
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-16 text-center">
          {/* Live Topic of the Day, framed as a phone. */}
          <div className="flex justify-center">
            <div className="w-[300px] max-w-full rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
              <div className="px-4 pt-4 pb-5 text-left">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-logo font-bold text-[#2650eb]"><T>Topic of the Day</T></span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <button
                  type="button"
                  onClick={openTodayTopic}
                  className="block w-full text-left rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                      <Star className="w-3 h-3 fill-amber-500" /> {todayTopic?.category || 'Lifestyle'}
                    </span>
                    <MessageSquare className="w-4 h-4 text-gray-300" />
                  </div>
                  <h3 className="font-logo font-bold text-lg text-[#2650eb] leading-snug mb-2">
                    {todayTopic?.title || 'Discipline over motivation: How to shift?'}
                  </h3>
                  <p className="text-xs italic text-gray-500 border-l-2 border-amber-300 pl-2 mb-3">
                    {todayTopic?.bible_verse?.split(';')[0] || '1 Corinthians 9:27'}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {todayTopic?.content || 'What spiritual habit do you neglect when unmotivated? How can you build a non-negotiable routine?'}
                  </p>
                  <span className="flex items-center justify-center gap-1 w-full py-2.5 rounded-xl bg-[#2650eb] text-white text-sm font-semibold">
                    <T>Join Discussion</T> <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
                <p className="text-center text-[11px] text-gray-400 mt-3"><T>This topic changes daily at midnight UTC</T></p>
              </div>
            </div>
          </div>

          {/* Web visitors: bring the app download back under the card. */}
          {!isNativeApp && (
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={openAppStore}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#2650eb] font-semibold shadow-md hover:bg-white/90 transition-all hover:translate-y-[-1px]"
              >
                <Smartphone className="w-5 h-5" />
                <span><T>Download on App Store</T></span>
              </button>
              <button
                onClick={() => (onViewTopics ?? onEnter)()}
                className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white underline"
              >
                <T>Explore in your browser</T>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* What's inside the app — the 4 boxes — then an invite to join. */}
      <section className="max-w-5xl mx-auto px-6 py-14 text-center">
        <h2 className="font-logo font-bold text-2xl sm:text-3xl text-[#0F172A] dark:text-white mb-2"><T>What's inside</T></h2>
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mb-8"><T>Tap in to explore.</T></p>

        {/* Launchpad — jump straight into the main areas (mirrors the app tabs). */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {[
            { label: 'Topics', sub: todaysTopicPeek || 'Swipe discussion cards', Icon: Layers, onClick: () => (onViewTopics ?? onEnter)(), tone: 'text-blue-600 dark:text-blue-400' },
            { label: 'Events', sub: 'Find or host a gathering', Icon: MapPin, onClick: () => (onViewEvents ?? onEnter)(), tone: 'text-teal-600 dark:text-teal-400' },
            { label: 'Community', sub: 'Meet other believers', Icon: Users, onClick: () => (onViewCommunity ?? onEnter)(), tone: 'text-amber-600 dark:text-amber-400' },
            { label: 'Card game', sub: 'Yaps — the physical deck', Icon: ShoppingBag, onClick: openCardGameCheckout, tone: 'text-rose-600 dark:text-rose-400' },
          ].map((tile) => (
            <button
              key={tile.label}
              onClick={tile.onClick}
              className="group text-left p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-black/10 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <tile.Icon className={`w-6 h-6 mb-2 ${tile.tone}`} />
              <p className="font-semibold text-sm text-[#0F172A] dark:text-white">{tile.label}</p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-2 mt-0.5">{tile.sub}</p>
            </button>
          ))}
        </div>

        {/* Physical card deck */}
        <div className="mt-12">
          <h3 className="font-logo font-bold text-xl sm:text-2xl text-[#0F172A] dark:text-white mb-3"><T>Want the physical cards?</T></h3>
          <button
            onClick={openCardGameCheckout}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#2650eb] text-white font-semibold shadow-md hover:bg-[#1d4ed8] transition-all hover:translate-y-[-1px]"
          >
            <ShoppingBag className="w-5 h-5" />
            <span><T>Buy here</T></span>
          </button>
        </div>
      </section>

      {/* Yaps explainer, dark */}
      <section id="the-app" className="bg-[#0F172A] text-[#F8FAFC] scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2563eb] mb-4"><T>The Signature Feature</T></p>
            <h2 className="font-logo font-bold text-3xl md:text-4xl leading-tight mb-6">
              <T>Yaps, a card game for real conversations.</T>
            </h2>
            <p className="text-[#CBD5E1] mb-8 leading-relaxed">
              <T>Not every gathering needs a lesson plan. Yaps are casual, a potluck, a game night, a sports afternoon. Shuffle the cards, draw a question, and let the Bible guide the conversation.</T>
            </p>
            <ul className="space-y-3">
              {[
                'Questions designed to spark honest, grounded conversation',
                'Each card ties back to a scripture for deeper reflection',
                'Works for any size group, 3 people or 30',
                'No prep required. Just show up and yap.',
              ].map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <Star className="w-4 h-4 mt-1 text-[#2563eb] fill-[#2563eb] flex-shrink-0" />
                  <span className="text-sm text-[#F8FAFC]/90"><T>{bullet}</T></span>
                </li>
              ))}
            </ul>
          </div>

          {/* Topic of the Day — the canonical pick (same everywhere). */}
          {(() => {
            const title = todayTopic?.title || yapsCards[0]?.question || '';
            const verse = (todayTopic?.bible_verse || yapsCards[0]?.verse || '').split(';')[0].trim();
            return (
              <div className="flex flex-col items-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[10px] font-bold uppercase tracking-[0.18em] mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  <T>Topic of the Day</T>
                </span>
                <button
                  type="button"
                  onClick={openTodayTopic}
                  className="w-full max-w-md rounded-3xl bg-white text-[#0F172A] p-7 sm:p-8 shadow-2xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all text-left focus:outline-none focus:ring-4 focus:ring-white/30"
                >
                  <p className="font-logo text-2xl sm:text-3xl leading-snug mb-4">
                    {title}
                  </p>
                  {verse && (
                    <span className="inline-block px-2.5 py-1 rounded-full bg-[#2563eb]/15 text-[#2563eb] text-[11px] font-semibold mb-6">
                      {verse}
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-[#2563eb] font-semibold text-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span><T>Join the conversation</T></span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
                <p className="text-white/80 text-sm mt-5 max-w-md text-center leading-relaxed">
                  <T>A new prompt every day. Drop your reflection, ask a question, or read what believers from anywhere on the map are saying.</T>
                </p>
              </div>
            );
          })()}
        </div>
      </section>

      {/* 6. Topics, real DB data */}
      <section className="bg-[#EFF6FF] dark:bg-[#1E293B]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2563eb] mb-3"><T>Global Groupchat</T></p>
          <h2 className="font-logo font-bold text-3xl md:text-4xl leading-tight mb-6 max-w-3xl">
            <T>No one of us sees the whole picture.</T>
          </h2>
          <p className="text-[#64748B] dark:text-[#CBD5E1] max-w-2xl mb-4 leading-relaxed">
            <T>We're all searching for the same truth. None of us sees the whole picture from where we're standing. A believer in Lagos sees what someone in Calgary can't. A new Christian asks the question the ten year veteran forgot to ask. The fuller view comes from each other.</T>
          </p>
          <p className="text-[#64748B] dark:text-[#CBD5E1] max-w-2xl mb-12 leading-relaxed">
            <T>No algorithm. No engagement bait. Just real questions and reflections from believers wrestling with the same things you are, anywhere on the map.</T>
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
                  // onEnter) so the bottom-nav tab is forced to 'topics' ,                   // otherwise an existing active tab like Messages stops
                  // TopicsView from mounting and the signal is lost.
                  try { sessionStorage.setItem('wny_initial_community_sub', cat.key); } catch { /* ignore */ }
                  (onViewTopics ?? onEnter)();
                }}
                className="text-left bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-black/10 dark:border-white/10 shadow-sm hover:shadow-md transition-all hover:translate-y-[-2px] flex flex-col gap-2"
              >
                <span className="text-3xl" aria-hidden="true">{cat.emoji}</span>
                <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm"><T>{cat.label}</T></span>
                <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] leading-snug"><T>{cat.blurb}</T></span>
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
              <T>See the full feed</T>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 6.5 How to Play, pulled from the WnY card-game instruction sheets */}
      <section id="how-to-play" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-16">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2563eb] mb-3 text-center"><T>How to Play</T></p>
        <h2 className="font-logo font-bold text-2xl sm:text-4xl md:text-5xl leading-tight text-center mb-4">
          <T>So, you want to host a Yap.</T>
        </h2>
        <p className="text-center text-[#64748B] dark:text-[#CBD5E1] max-w-2xl mx-auto mb-8 leading-relaxed">
          <T>Here's the same flow we use for the in-person Yaps. Print it, screenshot it, or just keep this page open while you host.</T>
        </p>

        {/* Collapsed by default so the home leads with the app, not the deck. */}
        {!showHowToPlay && (
          <div className="text-center mb-4">
            <button
              onClick={() => setShowHowToPlay(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-black/15 dark:border-white/20 text-[#0F172A] dark:text-[#F8FAFC] font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <T>Learn how to host a Yap</T>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {showHowToPlay && (<>
        {/* Create a vibe, vertical timeline */}
        <div className="rounded-3xl bg-white dark:bg-[#1E293B] border border-black/10 dark:border-white/10 p-7 md:p-10 mb-8 shadow-sm">
          <h3 className="font-logo font-bold text-2xl md:text-3xl mb-8"><T>How to create a vibe</T></h3>
          <div className="relative pl-6">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#E2E8F0] dark:bg-white/15" aria-hidden="true" />
            {[
              { dot: '#2563eb', title: 'Fellowship',        body: 'Open time to connect and build relationships.' },
              { dot: '#2563eb', title: 'Communion',         body: 'Share and eat food to build energy.' },
              { dot: '#2563eb', title: 'Worship',           body: 'Focus on God, which unites us.' },
              { dot: '#2563eb', title: 'Prayer',            body: 'Acknowledging God and conversing with Him.' },
              { dot: '#2563eb', title: 'Yap',               body: 'Conversation between people, not a sermon in one direction.' },
              { dot: '#2563eb', title: 'Order and Freedom', body: 'Have a plan but be sensitive to the Holy Spirit and the people in the room.' },
            ].map((step) => (
              <div key={step.title} className="relative pl-6 pb-6 last:pb-0">
                <span
                  className="absolute -left-[19px] top-1 w-5 h-5 rounded-full border-4 border-white dark:border-[#1E293B]"
                  style={{ backgroundColor: step.dot }}
                  aria-hidden="true"
                />
                <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] text-sm uppercase tracking-wider mb-1">
                  <T>{step.title}</T>
                </div>
                <p className="text-[#64748B] dark:text-[#CBD5E1] text-sm leading-relaxed"><T>{step.body}</T></p>
              </div>
            ))}
          </div>
        </div>

        {/* Roles */}
        <div className="rounded-3xl bg-white dark:bg-[#1E293B] border border-black/10 dark:border-white/10 p-7 md:p-10 mb-8 shadow-sm">
          <h3 className="font-logo font-bold text-2xl md:text-3xl mb-8"><T>Roles</T></h3>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                label: 'Host',
                pill: 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200',
                points: [
                  'Welcome everyone and create a good atmosphere',
                  'Help coordinate food',
                  'Explain house rules and considerations',
                ],
              },
              {
                label: 'Guest',
                pill: 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200',
                points: [
                  'Arrive on time',
                  'Bring food if possible',
                  'Serve others and help clean',
                ],
              },
              {
                label: 'Worship Leader',
                pill: 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200',
                points: [
                  'Come early to practice',
                  'Pick 2 to 3 God focused songs',
                  'Keep it simple',
                  'After worship, share a short word or Bible verse',
                ],
              },
              {
                label: 'Discussion Leader',
                pill: 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200',
                points: [
                  'Get the conversation going, maybe an icebreaker to start',
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
                  <T>{role.label}</T>
                </span>
                <ul className="space-y-1.5">
                  {role.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-[#0F172A]/85 dark:text-[#F8FAFC]/85 leading-relaxed">
                      <span className="text-[#2563eb] mt-1.5 leading-none">•</span>
                      <span><T>{p}</T></span>
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
            <h3 className="font-logo font-bold text-2xl mb-5"><T>How to ask good questions</T></h3>
            <ul className="space-y-2.5">
              {[
                'Consider what challenges we face and what choices we can make.',
                'Try to find a relevant scripture and apply the principle.',
                "Don't expose sin, expose heart, intentions, and positions.",
                'Invite stories (e.g. "Tell me about a time when…").',
                'Flip it on its head and see the other side.',
                'Follow up with "Can you unpack that more?" or "What makes you say that?"',
                'Silence is okay.',
              ].map((q) => (
                <li key={q} className="flex items-start gap-2 text-sm text-[#0F172A]/85 dark:text-[#F8FAFC]/85 leading-relaxed">
                  <span className="text-[#2563eb] mt-1.5 leading-none">•</span>
                  <span><T>{q}</T></span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] italic mt-5">
              <T>In the gospels, Jesus spent a lot of time asking and answering questions. Be like Jesus.</T>
            </p>
          </div>

          {/* Icebreaker ideas */}
          <div className="rounded-3xl bg-[#2563eb] text-white p-7 md:p-9 shadow-sm flex flex-col">
            <h3 className="font-logo font-bold text-2xl mb-5"><T>Ice breaker ideas</T></h3>
            <ul className="space-y-3 flex-1">
              {[
                'What are you thankful for?',
                'A testimony of what God has done this week?',
                'Your favourite Bible verse?',
              ].map((q) => (
                <li key={q} className="flex items-start gap-2 text-base leading-relaxed">
                  <span className="mt-1.5 leading-none opacity-80">→</span>
                  <span><T>{q}</T></span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-white/70 mt-5">
              <T>Start a conversation with a fun question, Then let the Yap follow.</T>
            </p>
          </div>
        </div>
        </>)}
      </section>

      {/* 8. Who it's for, dark */}
      <section className="bg-[#0F172A] text-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2563eb] mb-3"><T>Who It's For</T></p>
          <h2 className="font-logo font-bold text-3xl md:text-4xl leading-tight mb-12 max-w-3xl">
            <T>Built for people who show up</T>
          </h2>

          <div className="grid sm:grid-cols-2 gap-5">
            {WHO_FOR.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-white/5 border border-white/10 p-7">
                <div className="w-11 h-11 rounded-xl bg-[#2563eb]/20 text-[#2563eb] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-logo font-bold text-xl mb-2"><T>{title}</T></h3>
                <p className="text-sm text-[#CBD5E1] leading-relaxed"><T>{body}</T></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Final CTA, "Get the Deck" zone */}
      <section id="get-the-deck" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-16">
        <div className="rounded-3xl bg-[#2563eb] text-white p-10 md:p-16 text-center shadow-xl">
          <div className="text-5xl mb-5">🃏</div>
          <h2 className="font-logo font-bold text-3xl md:text-4xl leading-tight mb-5">
            <T>Ready to play?</T>
          </h2>
          <p className="max-w-2xl mx-auto text-white/90 leading-relaxed mb-9">
            <T>{isNativeApp
              ? "You're in. Find a gathering, start one, or just ask the question you have been holding onto."
              : 'Download Worship N Yaps. Find a gathering, start one, or just ask the question you have been holding onto.'}</T>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={goToApp}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#2563eb] font-semibold shadow-md hover:bg-white/90 transition-colors"
            >
              <Spade className="w-5 h-5" />
              <span><T>Play online</T></span>
            </button>
            <button
              onClick={openCardGameCheckout}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              <span><T>Buy the deck</T></span>
            </button>
          </div>
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
            <T>Because community is more than just Sunday. · Calgary, Canada · Everywhere else too.</T>
          </p>
          <div className="flex items-center gap-5 text-[#64748B] dark:text-[#CBD5E1]">
            <a href="/privacy.html" className="hover:text-[#2563eb]"><T>Privacy</T></a>
            <a href="/terms.html" className="hover:text-[#2563eb]"><T>Terms</T></a>
            <a href="/support.html" className="hover:text-[#2563eb]"><T>Contact</T></a>
            {/* Update these hrefs to the real channel URLs. */}
            <a
              href="https://www.instagram.com/worshipnyaps"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Worship N Yaps on Instagram"
              className="hover:text-[#2563eb]"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://www.youtube.com/@worshipnyaps"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Worship N Yaps on YouTube"
              className="hover:text-[#2563eb]"
            >
              <Youtube className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>

      {(onViewEvents) && (
        // Hidden helper, keeps the prop interface stable for callers that pass it.
        <span hidden onClick={onViewEvents} />
      )}
    </div>
  );
}
