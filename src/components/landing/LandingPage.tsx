import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart, ArrowRight, Sun, Moon, Bell,
  Globe, Smartphone, ChevronRight, ChevronLeft, Star,
  BookOpen, MapPin, Users, MessageSquare, ShieldCheck,
  User as UserIcon, Search, Spade, ClipboardList,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { WaitlistModal } from './WaitlistModal';
import { supabase } from '../../lib/supabase';

interface LandingPageProps {
  onEnter: () => void;
  onPreOrder: () => void;
  onViewEvents?: () => void;
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

export function LandingPage({ onEnter, onPreOrder, onViewEvents, onViewTopicOfDay, onCreateAccount }: LandingPageProps) {
  const { isDark, toggleTheme } = useTheme();
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const { data, error } = await supabase
          .from('topics')
          .select('id, title, category, bible_verse, tags, content, users!topics_author_id_fkey(name, city)')
          .order('created_at', { ascending: false })
          .limit(20);
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
    const usable = allTopics.filter(
      (t) => !!t.bible_verse && !!(t.title || t.content)
    );
    if (usable.length === 0) return YAPS_CARDS;

    const today = new Date().toDateString();
    const dateHash = today.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const todIndex = dateHash % usable.length;
    const ordered = [usable[todIndex], ...usable.slice(0, todIndex), ...usable.slice(todIndex + 1)];

    return ordered.slice(0, 8).map((t) => ({
      question: (t.title || t.content || '').trim().replace(/\s+/g, ' ').slice(0, 140),
      verse: (t.bible_verse || '').split(';')[0].trim(),
      topicId: t.id,
    }));
  }, [allTopics]);

  const featuredTopics = useMemo(() => {
    // Pick three with the most distinct cities/categories to surface variety.
    const seenCity = new Set<string>();
    const picks: Topic[] = [];
    for (const t of allTopics) {
      const city = t.users?.city || '';
      if (!seenCity.has(city)) {
        picks.push(t);
        seenCity.add(city);
        if (picks.length === 3) break;
      }
    }
    if (picks.length < 3) {
      for (const t of allTopics) {
        if (!picks.includes(t)) picks.push(t);
        if (picks.length === 3) break;
      }
    }
    return picks;
  }, [allTopics]);

  const goToApp = onCreateAccount ?? onEnter;
  const seeHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
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
      <nav className="sticky top-0 z-20 bg-[#F8FAFC]/85 dark:bg-[#0F172A]/85 backdrop-blur-md border-b border-black/10 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button onClick={onEnter} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-sm">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-logo font-bold text-lg tracking-tight group-hover:text-[#2563eb] transition-colors">Worship &amp; Yapps</span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={onEnter}
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
              onClick={onPreOrder}
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#2563eb] hover:bg-[#EFF6FF] dark:hover:bg-white/5 transition-colors"
            >
              Shop
            </button>
          </div>

          <button
            onClick={goToApp}
            className="px-5 py-2.5 rounded-full bg-[#2563eb] text-white text-sm font-semibold shadow-sm hover:bg-[#1d4ed8] transition-colors"
          >
            Get the App
          </button>
        </div>
      </nav>

      {/* 2. Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#14b8a6]/15 text-[#14b8a6] dark:bg-[#14b8a6]/25 dark:text-teal-300 text-xs font-semibold tracking-wide mb-8">
          <Globe className="w-3.5 h-3.5" />
          <span>Community beyond Sunday</span>
        </div>

        <h1 className="font-logo font-bold text-[clamp(2.5rem,7vw,5rem)] leading-[1.05] tracking-tight mb-8">
          <span className="block">Because community</span>
          <span className="block">
            is more than <span className="text-[#2563eb]">Sunday.</span>
          </span>
        </h1>

        <p className="text-lg md:text-xl text-[#64748B] dark:text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed mb-10">
          Worship &amp; Yapps helps you organize Bible studies, worship nights, casual hangouts, and faith
          conversations — and connects you with believers asking the same questions you are, anywhere in the world.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-5">
          <button
            onClick={goToApp}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#2563eb] text-white font-semibold shadow-md hover:bg-[#1d4ed8] transition-all hover:translate-y-[-1px]"
          >
            <Smartphone className="w-5 h-5" />
            <span>Download on App Store</span>
          </button>
          <button
            onClick={seeHowItWorks}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-black/15 dark:border-white/20 text-[#0F172A] dark:text-[#F8FAFC] font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <span>See how it works</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
          Free to download · No algorithm · Built for real people
        </p>
      </section>

      {/* Yaps explainer — dark */}
      <section className="bg-[#0F172A] text-[#F8FAFC]">
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
                'No prep required. Just show up and play.',
              ].map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <Star className="w-4 h-4 mt-1 text-[#14b8a6] fill-[#14b8a6] flex-shrink-0" />
                  <span className="text-sm text-[#F8FAFC]/90">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative h-80 sm:h-96">
            {[0, 1, 2].map((i) => {
              const card = yapsCards[i % yapsCards.length];
              return (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 w-44 h-60 sm:w-52 sm:h-72 rounded-2xl bg-[#2563eb] text-white p-5 shadow-xl flex flex-col justify-between"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${(i - 1) * 7}deg) translateY(${(i - 1) * 8}px)`,
                    zIndex: 10 - i,
                  }}
                >
                  <Spade className="w-6 h-6 opacity-70" />
                  <div>
                    <p className="font-logo text-base leading-snug mb-3">{card.question}</p>
                    <p className="text-[10px] uppercase tracking-wider opacity-80">{card.verse}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Features — tab switcher */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2563eb] mb-3 text-center">Everything you need</p>
        <h2 className="font-logo font-bold text-4xl md:text-5xl leading-tight text-center mb-12">
          One app. The whole faith community.
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
            Ask your questions. Hear from the world.
          </h2>
          <p className="text-[#64748B] dark:text-[#CBD5E1] max-w-2xl mb-12 leading-relaxed">
            No algorithm. No engagement bait. Just a feed of real questions and reflections from believers
            who are wrestling with the same things you are — anywhere on the map.
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {(featuredTopics.length > 0 ? featuredTopics : Array.from({ length: 3 })).map((topic, i) => {
              const t = topic as Topic | undefined;
              const verse = t?.bible_verse?.split(';')[0]?.trim();
              const name = t?.users?.name || 'Worship & Yapps member';
              const city = t?.users?.city || 'Calgary';
              const body = (t?.content || t?.title || 'Loading…').slice(0, 200);
              return (
                <button
                  key={t?.id ?? i}
                  onClick={() => (t?.id ? onViewTopicOfDay?.(t.id) : onEnter())}
                  className="text-left bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-black/10 dark:border-white/10 shadow-sm hover:shadow-md transition-all hover:translate-y-[-2px]"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      <div className="w-8 h-8 rounded-full bg-[#2563eb]/15 text-[#2563eb] flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate">{name}</p>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate flex items-center gap-1"><MapPin className="w-3 h-3" />{city}</p>
                      </div>
                    </div>
                  </div>
                  {verse && (
                    <span className="inline-block px-2.5 py-1 rounded-full bg-[#14b8a6]/15 text-[#14b8a6] text-[11px] font-semibold mb-3">
                      {verse}
                    </span>
                  )}
                  <p className="text-sm text-[#0F172A]/85 dark:text-[#F8FAFC]/85 leading-relaxed line-clamp-4">
                    {body}
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-4 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Join the conversation
                  </p>
                </button>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={onEnter}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0F172A] dark:bg-[#F8FAFC] text-[#F8FAFC] dark:text-[#0F172A] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              See the full feed
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 7. How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#2563eb] mb-3 text-center">How It Works</p>
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

      {/* 9. Final CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="rounded-3xl bg-[#2563eb] text-white p-10 md:p-16 text-center shadow-xl">
          <div className="text-5xl mb-5">🃏</div>
          <h2 className="font-logo font-bold text-4xl md:text-5xl leading-tight mb-5">
            Ready to play?
          </h2>
          <p className="max-w-2xl mx-auto text-white/90 leading-relaxed mb-9">
            Download Worship &amp; Yapps. Find a gathering, start one, or just ask the question you have been
            holding onto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={goToApp}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#2563eb] font-semibold shadow-md hover:bg-white/90 transition-colors"
            >
              <Smartphone className="w-5 h-5" />
              <span>Download on App Store</span>
            </button>
            <button
              onClick={() => setShowWaitlist(true)}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/40 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span>Join the waitlist</span>
            </button>
          </div>
          {onPreOrder && (
            <button
              onClick={onPreOrder}
              className="mt-6 text-white/85 underline underline-offset-4 text-sm hover:text-white"
            >
              Or pre-order the card game →
            </button>
          )}
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#2563eb] flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-logo font-bold">Worship &amp; Yapps</span>
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
