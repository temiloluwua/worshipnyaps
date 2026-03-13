import React, { useState, useEffect } from 'react';
import { HeartHandshake, Plus, X, Check, Utensils } from 'lucide-react';
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
  'main', 'side', 'dessert', 'beverage', 'setup'
] as const;

const typeIcons: Record<string, string> = {
  prayer: '🙏', worship: '🎵', tech: '🖥️', discussion: '💬',
  hospitality: '🏠', food: '🍕', setup: '🔧', other: '📋',
  main: '🍽️', side: '🥗', dessert: '🍰', beverage: '🥤',
};

const categoryLabel: Record<string, string> = {
  prayer: 'Prayer', worship: 'Worship', tech: 'Tech', discussion: 'Discussion',
  hospitality: 'Hospitality', setup: 'Setup', other: 'Other',
  main: 'Main Dish', side: 'Side', dessert: 'Dessert', beverage: 'Drinks', food: 'Food',
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
  });
  const [newFood, setNewFood] = useState({
    item: '', category: 'main' as typeof FOOD_CATEGORIES[number],
    notes: '', assigned_to: '',
  });

  const fetchAttendees = async () => {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('users!user_id(id, name, avatar_url)')
        .eq('event_id', eventId).eq('status', 'registered');
      if (error) throw error;
      setAttendees((data || []).map((d: any) => d.users).filter(Boolean));
    } catch (err) { console.error(err); }
  };

  const fetchItems = async () => {
    try {
      const { data: helpData, error: helpError } = await supabase
        .from('event_help_requests')
        .select('*, assigned_user:users!event_help_requests_assigned_user_id_fkey(name, avatar_url)')
        .eq('event_id', eventId).order('created_at', { ascending: true });
      if (helpError) throw helpError;

      const { data: foodData, error: foodError } = await supabase
        .from('food_items')
        .select('*, assigned_user:users!food_items_assigned_to_fkey(name, avatar_url)')
        .eq('event_id', eventId).order('created_at', { ascending: true });
      if (foodError) throw foodError;

      const helpItems: UnifiedHelpItem[] = (helpData || []).map((r: any) => ({
        id: r.id.toString(), event_id: r.event_id, source: 'help_request',
        category: r.request_type, title: r.title, description: r.description,
        assigned_user_id: r.assigned_user_id, status: r.status,
        is_filled: r.status === 'filled' || r.is_filled,
        created_at: r.created_at, assigned_user: r.assigned_user,
      }));

      const foodItems: UnifiedHelpItem[] = (foodData || []).map((f: any) => ({
        id: `food_${f.id}`, event_id: f.event_id, source: 'food_item',
        category: f.category || 'food', title: f.item, description: f.notes,
        assigned_user_id: f.assigned_to, status: f.completed ? 'filled' : 'open',
        is_filled: f.completed, created_at: f.created_at, assigned_user: f.assigned_user,
      }));

      setItems([...helpItems, ...foodItems]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); fetchAttendees(); }, [eventId]);

  const handleVolunteer = async (item: UnifiedHelpItem) => {
    if (!user) { toast.error('Please sign in'); return; }
    try {
      if (item.source === 'help_request') {
        const { error } = await supabase.from('event_help_requests')
          .update({ assigned_user_id: user.id, status: 'filled' })
          .eq('id', item.id).eq('status', 'open');
        if (error) throw error;
      } else {
        const { error } = await supabase.from('food_items')
          .update({ assigned_to: user.id })
          .eq('id', item.id.replace('food_', '')).is('assigned_to', null);
        if (error) throw error;
      }
      await fetchItems();
      toast.success("You're signed up to help! 🙌");
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const handleAssign = async (item: UnifiedHelpItem, userId: string) => {
    try {
      if (item.source === 'help_request') {
        const { error } = await supabase.from('event_help_requests')
          .update({ assigned_user_id: userId, status: 'filled' }).eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('food_items')
          .update({ assigned_to: userId }).eq('id', item.id.replace('food_', ''));
        if (error) throw error;
      }
      await fetchItems(); toast.success('Assigned!');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const handleRemove = async (item: UnifiedHelpItem) => {
    try {
      if (item.source === 'help_request') {
        const { error } = await supabase.from('event_help_requests').delete().eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('food_items').delete().eq('id', item.id.replace('food_', ''));
        if (error) throw error;
      }
      await fetchItems(); toast.success('Removed');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const handleAddHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHelp.title.trim()) return;
    try {
      const { error } = await supabase.from('event_help_requests').insert({
        event_id: eventId, request_type: newHelp.request_type,
        title: newHelp.title.trim(), description: newHelp.description.trim() || null,
        assigned_user_id: newHelp.assigned_user_id || null,
        status: newHelp.assigned_user_id ? 'filled' : 'open',
      });
      if (error) throw error;
      setNewHelp({ request_type: 'other', title: '', description: '', assigned_user_id: '' });
      setShowForm(null); await fetchItems(); toast.success('Help request added!');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFood.item.trim()) return;
    try {
      const { error } = await supabase.from('food_items').insert({
        event_id: eventId, item: newFood.item.trim(), category: newFood.category,
        notes: newFood.notes.trim() || null, assigned_to: newFood.assigned_to || null, completed: false,
      });
      if (error) throw error;
      setNewFood({ item: '', category: 'main', notes: '', assigned_to: '' });
      setShowForm(null); await fetchItems(); toast.success('Food item added!');
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const openCount = items.filter(i => !i.is_filled).length;
  const filledCount = items.filter(i => i.is_filled).length;
  if (loading) return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading...</div>;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Help Needed</h3>
        </div>
        {items.length > 0 && (
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">{filledCount} filled</span>
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">{openCount} open</span>
          </div>
        )}
      </div>

      {items.length === 0 && !showForm && (
        <div className="text-center py-10">
          <HeartHandshake className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No help requests yet</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const isMine = user && item.assigned_user_id === user.id;
          const isOpen = !item.is_filled && !item.assigned_user_id;
          return (
            <div key={item.id} className={`border rounded-xl p-4 transition-all ${item.is_filled ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{typeIcons[item.category] || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{categoryLabel[item.category] || item.category}</span>
                    {item.source === 'food_item' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <Utensils size={10} /> Food
                      </span>
                    )}
                  </div>
                  {item.description && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{item.description}</p>}
                  {item.is_filled && item.assigned_user && (
                    <div className="flex items-center gap-1 mt-2 text-green-700 dark:text-green-300 text-xs">
                      <Check className="w-3 h-3" />
                      <span>{(item.assigned_user as any).name}</span>
                      {isMine && <span className="text-green-500">(you)</span>}
                    </div>
                  )}
                  {isHost && !item.is_filled && attendees.length > 0 && (
                    <select onChange={(e) => { if (e.target.value) { handleAssign(item, e.target.value); e.target.value = ''; } }}
                      className="mt-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      <option value="">Assign to someone...</option>
                      {attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isOpen && user && !isHost && (
                    <button onClick={() => handleVolunteer(item)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">
                      I'll do it
                    </button>
                  )}
                  {isMine && <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> You</span>}
                  {isHost && <button onClick={() => handleRemove(item)} className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isHost && !showForm && (
        <div className="flex gap-2">
          <button onClick={() => setShowForm('help')} className="flex-1 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Help Request
          </button>
          <button onClick={() => setShowForm('food')} className="flex-1 py-2.5 border-2 border-dashed border-orange-200 dark:border-orange-800 rounded-xl text-orange-400 hover:border-orange-400 hover:text-orange-500 transition-colors text-sm flex items-center justify-center gap-1.5">
            <Utensils className="w-4 h-4" /> Add Food Item
          </button>
        </div>
      )}

      {showForm === 'help' && (
        <form onSubmit={handleAddHelp} className="border border-blue-200 dark:border-blue-800 rounded-xl p-4 bg-blue-50 dark:bg-blue-900/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2"><HeartHandshake size={15} /> New Help Request</h4>
            <button type="button" onClick={() => setShowForm(null)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <select value={newHelp.request_type} onChange={(e) => setNewHelp(p => ({ ...p, request_type: e.target.value as any }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            {HELP_REQUEST_TYPES.map(type => <option key={type} value={type}>{typeIcons[type]} {categoryLabel[type]}</option>)}
          </select>
          <input type="text" value={newHelp.title} onChange={(e) => setNewHelp(p => ({ ...p, title: e.target.value }))} placeholder="What do you need help with?" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" required />
          <textarea value={newHelp.description} onChange={(e) => setNewHelp(p => ({ ...p, description: e.target.value }))} placeholder="Any details? (optional)" rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none" />
          {attendees.length > 0 && (
            <select value={newHelp.assigned_user_id} onChange={(e) => setNewHelp(p => ({ ...p, assigned_user_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="">Leave open for volunteers</option>
              {attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Add Request</button>
        </form>
      )}

      {showForm === 'food' && (
        <form onSubmit={handleAddFood} className="border border-orange-200 dark:border-orange-800 rounded-xl p-4 bg-orange-50 dark:bg-orange-900/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2"><Utensils size={15} /> New Food Item</h4>
            <button type="button" onClick={() => setShowForm(null)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <input type="text" value={newFood.item} onChange={(e) => setNewFood(p => ({ ...p, item: e.target.value }))} placeholder="e.g. Potato salad, Lemonade..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" required />
          <select value={newFood.category} onChange={(e) => setNewFood(p => ({ ...p, category: e.target.value as any }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            {FOOD_CATEGORIES.map(cat => <option key={cat} value={cat}>{typeIcons[cat]} {categoryLabel[cat]}</option>)}
          </select>
          <input type="text" value={newFood.notes} onChange={(e) => setNewFood(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes? e.g. nut-free (optional)" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          {attendees.length > 0 && (
            <select value={newFood.assigned_to} onChange={(e) => setNewFood(p => ({ ...p, assigned_to: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="">Leave open for volunteers</option>
              {attendees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          <button type="submit" className="w-full py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">Add Food Item</button>
        </form>
      )}
    </div>
  );
};