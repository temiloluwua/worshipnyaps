import React, { useState, useEffect } from 'react';
import { HeartHandshake, Plus, X, Check, Utensils, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface AttendeeUser {
  id: string;
  name: string;
  avatar_url?: string;
}

interface UnifiedHelpItem {
  id: string;
  event_id: string;
  source: 'help_request' | 'food_item';
  category: string;
  title: string;
  description: string | null;
  assigned_user_id: string | null;
  status: 'open' | 'filled' | 'in_progress' | 'completed';
  is_filled: boolean;
  open_to_volunteers: boolean;
  created_at: string;
  assigned_user?: { name: string; avatar_url?: string } | null;
}

interface EventHelpRequestsProps {
  eventId: string;
  isHost: boolean;
}

const HELP_REQUEST_TYPES = [
  'prayer', 'worship', 'tech', 'discussion', 'hospitality', 'setup', 'other'
] as const;

const FOOD_CATEGORIES = [
  'main', 'side', 'snacks', 'dessert', 'beverage', 'setup'
] as const;

const typeIcons: Record<string, string> = {
  prayer: '🙏', worship: '🎵', tech: '🖥️', discussion: '💬',
  hospitality: '🏠', food: '🍕', setup: '🔧', other: '📋',
  main: '🍽️', side: '🥗', snacks: '🍿', dessert: '🍰', beverage: '🥤',
};

const categoryLabel: Record<string, string> = {
  prayer: 'Prayer', worship: 'Worship', tech: 'Tech', discussion: 'Discussion',
  hospitality: 'Hospitality', setup: 'Setup', other: 'Other',
  main: 'Main Dish', side: 'Side', snacks: 'Snacks', dessert: 'Dessert', beverage: 'Drinks', food: 'Food',
};

// What each role actually involves at the event. Shown as helper text in the
// form so volunteers know what they're signing up for.
const ROLE_DESCRIPTIONS: Record<string, string> = {
  prayer: 'Open and/or close the gathering in prayer. Lift up shared requests.',
  worship: 'Lead the music portion — bring an instrument, pick a few songs.',
  tech: 'Handle audio/video setup, projector, sound, or hybrid attendees.',
  discussion: 'Facilitate the conversation. Prepare a few questions, guide the group.',
  hospitality: 'Greet people as they arrive, make them feel welcome, organize food.',
  setup: 'Show up early to arrange chairs, set up the space, tear down after.',
  other: 'Anything not covered by the standard roles.',
  main: 'A main dish that feeds several people.',
  side: 'A side dish — salad, bread, fruit, etc.',
  snacks: 'Snacks or finger food to share.',
  dessert: 'A dessert to share.',
  beverage: 'Drinks — coffee, tea, juice, water.',
};

export const EventHelpRequests: React.FC<EventHelpRequestsProps> = ({ eventId, isHost }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<UnifiedHelpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState<AttendeeUser[]>([]);
  const [showForm, setShowForm] = useState<null | 'help' | 'food'>(null);
  const [newHelp, setNewHelp] = useState({
    request_type: 'other' as typeof HELP_REQUEST_TYPES[number],
    title: '', description: '', assigned_user_id: '',
    open_to_volunteers: true,
  });
  const [newFood, setNewFood] = useState({
    item: '', category: 'main' as typeof FOOD_CATEGORIES[number],
    notes: '', assigned_to: '',
    open_to_volunteers: true,
  });

  const fetchAttendees = async () => {
    try {
      // Combine event attendees AND the host's connections so the host can
      // request help/food from friends who haven't RSVP'd yet.
      const [attendeesResult, connectionsResult] = await Promise.all([
        supabase
          .from('event_attendees')
          .select('users!user_id(id, name, avatar_url)')
          .eq('event_id', eventId)
          .eq('status', 'registered'),
        user
          ? supabase
              .from('connections')
              .select('connected_user:users!connections_connected_user_id_fkey(id, name, avatar_url)')
              .eq('user_id', user.id)
              .eq('status', 'active')
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (attendeesResult.error) throw attendeesResult.error;
      const attending = (attendeesResult.data || []).map((d: any) => d.users).filter(Boolean);
      const friends = (connectionsResult.data || [])
        .map((d: any) => d.connected_user)
        .filter(Boolean);

      // De-duplicate by id, keeping attendees first.
      const seen = new Set<string>();
      const combined: AttendeeUser[] = [];
      for (const u of [...attending, ...friends]) {
        if (!u || seen.has(u.id)) continue;
        seen.add(u.id);
        combined.push(u);
      }
      setAttendees(combined);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchItems = async () => {
    try {
      const { data: helpData, error: helpError } = await supabase
        .from('event_help_requests')
        .select('*, assigned_user:users!event_help_requests_assigned_user_id_fkey(name, avatar_url)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (helpError) throw helpError;

      const { data: foodData, error: foodError } = await supabase
        .from('food_items')
        .select('*, assigned_user:users!food_items_assigned_to_fkey(name, avatar_url)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (foodError) throw foodError;

      const helpItems: UnifiedHelpItem[] = (helpData || []).map((r: any) => ({
        id: r.id.toString(),
        event_id: r.event_id,
        source: 'help_request' as const,
        category: r.request_type,
        title: r.title,
        description: r.description,
        assigned_user_id: r.assigned_user_id,
        status: r.status,
        is_filled: r.status === 'filled' || r.is_filled,
        // Legacy rows (pre-migration) have no column — default to open.
        open_to_volunteers: r.open_to_volunteers ?? true,
        created_at: r.created_at,
        assigned_user: r.assigned_user,
      }));

      const foodItems: UnifiedHelpItem[] = (foodData || []).map((f: any) => ({
        id: `food_${f.id}`,
        event_id: f.event_id,
        source: 'food_item' as const,
        category: f.category || 'food',
        title: f.item,
        description: f.notes,
        assigned_user_id: f.assigned_to,
        status: f.completed ? 'filled' : 'open',
        is_filled: f.completed,
        open_to_volunteers: f.open_to_volunteers ?? true,
        created_at: f.created_at,
        assigned_user: f.assigned_user,
      }));

      setItems([...helpItems, ...foodItems]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchAttendees();
  }, [eventId]);

  const handleShareItem = async (item: UnifiedHelpItem) => {
    // window.location.origin is capacitor://localhost inside the app, which
    // isn't a shareable URL — use the real site origin.
    const origin = window.location.origin;
    const shareOrigin = origin.startsWith('http://localhost') || origin.startsWith('capacitor://')
      ? 'https://www.worshipnyaps.com'
      : origin;
    const url = `${shareOrigin}/event/${eventId}`;
    const message = item.source === 'food_item'
      ? `Can you bring "${item.title}" for our event? Tap to RSVP and sign up: ${url}`
      : `Can you help with "${item.title}" at our event? Tap to RSVP and sign up: ${url}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: item.title, text: message, url });
      } else {
        await navigator.clipboard.writeText(message);
        toast.success('Invite link copied!');
      }
    } catch (err: any) {
      // User cancelled share — not an error worth surfacing.
      if (err?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(message);
          toast.success('Invite link copied!');
        } catch {
          toast.error('Could not share');
        }
      }
    }
  };

  const handleVolunteer = async (item: UnifiedHelpItem) => {
    if (!user) { toast.error('Please sign in'); return; }
    try {
      if (item.source === 'help_request') {
        const { error } = await supabase
          .from('event_help_requests')
          .update({ assigned_user_id: user.id, status: 'filled' })
          .eq('id', item.id)
          .eq('status', 'open');
        if (error) throw error;
      } else {
        // Generic "Bring a [category]" — prompt the volunteer for what they're actually bringing.
        let updatedItemName: string | null = null;
        if (item.title.toLowerCase().startsWith('bring a ')) {
          const userInput = window.prompt(
            `What are you bringing? (currently: "${item.title}")`,
            ''
          );
          if (userInput === null) return; // cancelled
          if (userInput.trim()) updatedItemName = userInput.trim();
        }
        const updatePayload: Record<string, any> = { assigned_to: user.id };
        if (updatedItemName) updatePayload.item = updatedItemName;

        const { error } = await supabase
          .from('food_items')
          .update(updatePayload)
          .eq('id', item.id.replace('food_', ''))
          .is('assigned_to', null);
        if (error) throw error;
      }
      await fetchItems();
      toast.success("You're signed up to help! 🙌");
    } catch (err: any) {
      toast.error(err.message || 'Failed to volunteer');
    }
  };

  const handleAssign = async (item: UnifiedHelpItem, userId: string) => {
    try {
      if (item.source === 'help_request') {
        // Set assigned_user_id but keep status='open' so the assignee can
        // accept or decline. `completed=false` for food is the equivalent.
        const { error } = await supabase
          .from('event_help_requests')
          .update({ assigned_user_id: userId, status: 'open' })
          .eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('food_items')
          .update({ assigned_to: userId, completed: false })
          .eq('id', item.id.replace('food_', ''));
        if (error) throw error;
      }

      if (userId !== user?.id) {
        const { error: notifyError } = await supabase.from('notifications').insert({
          user_id: userId,
          event_id: eventId,
          type: 'role_request',
          title: `You've been asked to help with "${item.title}"`,
          body: item.source === 'food_item'
            ? `The host asked if you can bring ${item.title}.`
            : `The host asked you to help with ${item.title}.`,
          payload: { event_id: eventId, item_id: item.id, source: item.source },
        });
        if (notifyError) throw notifyError;
      }

      await fetchItems();
      toast.success('Request sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign');
    }
  };

  const handleAcceptRequest = async (item: UnifiedHelpItem) => {
    try {
      if (item.source === 'help_request') {
        const { error } = await supabase
          .from('event_help_requests')
          .update({ status: 'filled' })
          .eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('food_items')
          .update({ completed: true })
          .eq('id', item.id.replace('food_', ''));
        if (error) throw error;
      }
      await fetchItems();
      toast.success("You're in! 🙌");
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept');
    }
  };

  const handleDeclineRequest = async (item: UnifiedHelpItem) => {
    try {
      if (item.source === 'help_request') {
        const { error } = await supabase
          .from('event_help_requests')
          .update({ assigned_user_id: null, status: 'open' })
          .eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('food_items')
          .update({ assigned_to: null, completed: false })
          .eq('id', item.id.replace('food_', ''));
        if (error) throw error;
      }
      await fetchItems();
      toast('Declined — the host has been notified.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline');
    }
  };

  const handleRemove = async (item: UnifiedHelpItem) => {
    try {
      if (item.source === 'help_request') {
        const { error } = await supabase
          .from('event_help_requests')
          .delete()
          .eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('food_items')
          .delete()
          .eq('id', item.id.replace('food_', ''));
        if (error) throw error;
      }
      await fetchItems();
      toast.success('Removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove');
    }
  };

  const handleAddHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHelp.title.trim()) return;
    try {
      const { error } = await supabase.from('event_help_requests').insert({
        event_id: eventId,
        request_type: newHelp.request_type,
        title: newHelp.title.trim(),
        description: newHelp.description.trim() || null,
        assigned_user_id: newHelp.assigned_user_id || null,
        status: newHelp.assigned_user_id ? 'filled' : 'open',
        open_to_volunteers: newHelp.open_to_volunteers,
      });
      if (error) throw error;
      setNewHelp({ request_type: 'other', title: '', description: '', assigned_user_id: '', open_to_volunteers: true });
      setShowForm(null);
      await fetchItems();
      toast.success('Help request added!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add request');
    }
  };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    // Item can be empty — that means "open call for this category".
    // A volunteer will fill it in when they sign up.
    const itemValue = newFood.item.trim() || `Bring a ${categoryLabel[newFood.category]?.toLowerCase() || 'dish'}`;
    try {
      const { error } = await supabase.from('food_items').insert({
        event_id: eventId,
        item: itemValue,
        category: newFood.category,
        notes: newFood.notes.trim() || null,
        assigned_to: newFood.assigned_to || null,
        completed: false,
        open_to_volunteers: newFood.open_to_volunteers,
      });
      if (error) throw error;
      setNewFood({ item: '', category: 'main', notes: '', assigned_to: '', open_to_volunteers: true });
      setShowForm(null);
      await fetchItems();
      toast.success('Food item added!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add food item');
    }
  };

  const openCount = items.filter(i => !i.is_filled).length;
  const filledCount = items.filter(i => i.is_filled).length;

  if (loading) {
    return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Help</h3>
        </div>
        {items.length > 0 && (
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
              {filledCount} filled
            </span>
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
              {openCount} open
            </span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && !showForm && (
        <div className="text-center py-10">
          <HeartHandshake className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No help requests yet</p>
          {isHost && (
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Add something below to get started</p>
          )}
        </div>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {items.map((item) => {
          const isMine = user && item.assigned_user_id === user.id;
          const isOpen = !item.is_filled && !item.assigned_user_id;
          // Host asked someone but they haven't accepted yet.
          const isPending = !item.is_filled && !!item.assigned_user_id;
          return (
            <div
              key={item.id}
              className={`border rounded-xl transition-all overflow-hidden ${
                item.is_filled
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                  : isMine && isPending
                    ? 'border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/10'
                    : isPending
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                <span className="text-xl mt-0.5">{typeIcons[item.category] || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {categoryLabel[item.category] || item.category}
                    </span>
                    {item.source === 'food_item' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <Utensils size={10} /> Food
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{item.description}</p>
                  )}
                  {item.source === 'help_request' && ROLE_DESCRIPTIONS[item.category] && (
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 italic">
                      {ROLE_DESCRIPTIONS[item.category]}
                    </p>
                  )}
                  {item.is_filled && item.assigned_user && (
                    <div className="flex items-center gap-1 mt-2 text-green-700 dark:text-green-300 text-xs">
                      <Check className="w-3 h-3" />
                      <span>{(item.assigned_user as any).name}</span>
                      {isMine && <span className="text-green-500 ml-1">(you)</span>}
                    </div>
                  )}
                  {isPending && item.assigned_user && (
                    <div className="flex items-center gap-1 mt-2 text-amber-700 dark:text-amber-300 text-xs">
                      <span>Asked {(item.assigned_user as any).name} · waiting on response</span>
                    </div>
                  )}
                  {isHost && !item.is_filled && attendees.length > 0 && (
                    <select
                      onChange={(e) => { if (e.target.value) { handleAssign(item, e.target.value); e.target.value = ''; } }}
                      className="mt-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">{isPending ? 'Reassign to...' : 'Send request to...'}</option>
                      {attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Accept / Decline — not shown inline when isMine+isPending; full-width section below handles it */}
                  {isOpen && user && !isHost && item.open_to_volunteers && (
                    <button
                      onClick={() => handleVolunteer(item)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium touch-manipulation"
                    >
                      I'll do it
                    </button>
                  )}
                  {isOpen && !isHost && !item.open_to_volunteers && (
                    <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
                      🔒 Host will fill
                    </span>
                  )}
                  {isMine && item.is_filled && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> You
                    </span>
                  )}
                  {isHost && !item.is_filled && (
                    <button
                      onClick={() => handleShareItem(item)}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
                      title="Share with a friend"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                  {isHost && (
                    <button
                      onClick={() => handleRemove(item)}
                      className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Prominent accept/decline section — only for the assigned user before they respond */}
              {isMine && isPending && (
                <div className="px-4 pb-4 pt-1 space-y-2">
                  <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg px-3 py-2">
                    <span className="text-base">🙋</span>
                    <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                      The host is asking for your help!
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeclineRequest(item)}
                      className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptRequest(item)}
                      className="flex-1 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-semibold shadow-sm"
                    >
                      Accept ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add buttons — host only */}
      {isHost && !showForm && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm('help')}
            className="flex-1 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors text-sm flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Help Request
          </button>
          <button
            onClick={() => setShowForm('food')}
            className="flex-1 py-2.5 border-2 border-dashed border-orange-400 dark:border-orange-600 rounded-xl text-orange-600 dark:text-orange-400 hover:border-orange-500 hover:text-orange-700 dark:hover:text-orange-300 transition-colors text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <Utensils className="w-4 h-4" /> Add Food Item
          </button>
        </div>
      )}

      {/* Help Request Form */}
      {showForm === 'help' && (
        <form onSubmit={handleAddHelp} className="border border-blue-200 dark:border-blue-800 rounded-xl p-4 bg-blue-50 dark:bg-blue-900/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <HeartHandshake size={15} /> New Help Request
            </h4>
            <button type="button" onClick={() => setShowForm(null)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <select
            value={newHelp.request_type}
            onChange={(e) => setNewHelp(p => ({ ...p, request_type: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            {HELP_REQUEST_TYPES.map(type => (
              <option key={type} value={type}>{typeIcons[type]} {categoryLabel[type]}</option>
            ))}
          </select>
          {ROLE_DESCRIPTIONS[newHelp.request_type] && (
            <p className="text-xs text-gray-600 dark:text-gray-400 -mt-1 px-1 italic">
              {ROLE_DESCRIPTIONS[newHelp.request_type]}
            </p>
          )}
          <input
            type="text"
            value={newHelp.title}
            onChange={(e) => setNewHelp(p => ({ ...p, title: e.target.value }))}
            placeholder="What do you need help with?"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            required
          />
          <textarea
            value={newHelp.description}
            onChange={(e) => setNewHelp(p => ({ ...p, description: e.target.value }))}
            placeholder="Any details? (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNewHelp(p => ({ ...p, open_to_volunteers: true }))}
              className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                newHelp.open_to_volunteers
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }`}
            >
              🙋 Open to volunteers
              <div className="text-[10px] font-normal opacity-80 mt-0.5">Anyone attending can grab it</div>
            </button>
            <button
              type="button"
              onClick={() => setNewHelp(p => ({ ...p, open_to_volunteers: false }))}
              className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                !newHelp.open_to_volunteers
                  ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 text-purple-700 dark:text-purple-300'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }`}
            >
              🔒 Assign only
              <div className="text-[10px] font-normal opacity-80 mt-0.5">Only you can fill this role</div>
            </button>
          </div>
          {attendees.length > 0 && (
            <select
              value={newHelp.assigned_user_id}
              onChange={(e) => setNewHelp(p => ({ ...p, assigned_user_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">{newHelp.open_to_volunteers ? 'Leave open for volunteers' : 'Assign later'}</option>
              {attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            Add Request
          </button>
        </form>
      )}

      {/* Food Item Form */}
      {showForm === 'food' && (
        <form onSubmit={handleAddFood} className="border border-orange-200 dark:border-orange-800 rounded-xl p-4 bg-orange-50 dark:bg-orange-900/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <Utensils size={15} /> New Food Item
            </h4>
            <button type="button" onClick={() => setShowForm(null)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <input
            type="text"
            value={newFood.item}
            onChange={(e) => setNewFood(p => ({ ...p, item: e.target.value }))}
            placeholder="e.g. Potato salad — or leave blank for an open call"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
            Leave the item blank to let volunteers choose what to bring (e.g. "Bring a main").
          </p>
          <select
            value={newFood.category}
            onChange={(e) => setNewFood(p => ({ ...p, category: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            {FOOD_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{typeIcons[cat]} {categoryLabel[cat]}</option>
            ))}
          </select>
          <input
            type="text"
            value={newFood.notes}
            onChange={(e) => setNewFood(p => ({ ...p, notes: e.target.value }))}
            placeholder="Any notes? e.g. nut-free (optional)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNewFood(p => ({ ...p, open_to_volunteers: true }))}
              className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                newFood.open_to_volunteers
                  ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-400 text-orange-700 dark:text-orange-300'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }`}
            >
              🙋 Open to volunteers
              <div className="text-[10px] font-normal opacity-80 mt-0.5">Anyone attending can bring it</div>
            </button>
            <button
              type="button"
              onClick={() => setNewFood(p => ({ ...p, open_to_volunteers: false }))}
              className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                !newFood.open_to_volunteers
                  ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 text-purple-700 dark:text-purple-300'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }`}
            >
              🔒 Assign only
              <div className="text-[10px] font-normal opacity-80 mt-0.5">Only you can fill this</div>
            </button>
          </div>
          {attendees.length > 0 && (
            <select
              value={newFood.assigned_to}
              onChange={(e) => setNewFood(p => ({ ...p, assigned_to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">{newFood.open_to_volunteers ? 'Leave open for volunteers' : 'Assign later'}</option>
              {attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          <button type="submit" className="w-full py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
            Add Food Item
          </button>
        </form>
      )}

    </div>
  );
};