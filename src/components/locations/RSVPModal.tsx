import React, { useEffect, useState } from 'react';
import { X, Users, Clock, MapPin, Music, Coffee, Heart, CheckCircle, Plus, Utensils, ChefHat, UserPlus, StickyNote, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type RSVPEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  capacity: number;
  attendees?: number;
  location?: string;
  locations?: { name?: string };
};

interface FoodItem {
  id: string;
  item: string;
  category: 'main' | 'side' | 'dessert' | 'beverage' | 'setup';
  assignedTo?: string;
  completed: boolean;
  servingSize?: string;
  notes?: string;
}

interface RSVPModalProps {
  event: RSVPEvent;
  isOpen: boolean;
  onClose: () => void;
  onRSVP: (eventId: string, volunteerRoles: string[], foodItems: string[]) => Promise<void> | void;
}

export const RSVPModal: React.FC<RSVPModalProps> = ({ event, isOpen, onClose, onRSVP }) => {
  const { user } = useAuth();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedFoodItems, setSelectedFoodItems] = useState<string[]>([]);
  const [customFood, setCustomFood] = useState('');
  const [customFoodCategory, setCustomFoodCategory] = useState<'main' | 'side' | 'dessert' | 'beverage' | 'setup'>('main');
  const [customFoodServing, setCustomFoodServing] = useState('');
  const [foodNotes, setFoodNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'volunteer' | 'food'>('basic');
  const [submitting, setSubmitting] = useState(false);

  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [plusOneCount, setPlusOneCount] = useState(0);
  const [attendeeNotes, setAttendeeNotes] = useState('');

  const [existingFoodItems] = useState<FoodItem[]>([
    { id: '1', item: 'Main Dish', category: 'main', assignedTo: 'Sarah M.', completed: true, servingSize: 'Serves 12' },
    { id: '2', item: 'Garden Salad', category: 'side', assignedTo: 'Michael C.', completed: true, servingSize: 'Large bowl' },
    { id: '3', item: 'Garlic Bread', category: 'side', completed: false, servingSize: 'For 12 people' },
    { id: '4', item: 'Chocolate Cake', category: 'dessert', completed: false, servingSize: 'Whole cake' },
    { id: '5', item: 'Coffee & Tea', category: 'beverage', assignedTo: 'Host', completed: true },
    { id: '6', item: 'Juice & Water', category: 'beverage', completed: false, servingSize: '2-3 bottles each' },
    { id: '7', item: 'Paper Plates & Napkins', category: 'setup', completed: false, servingSize: 'For 12 people' },
    { id: '8', item: 'Cups & Utensils', category: 'setup', assignedTo: 'Emily R.', completed: true }
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const volunteerRoles = [
    { id: 'prayer', name: 'Prayer Leader', icon: Heart, description: 'Lead opening and closing prayers, pray for specific needs' },
    { id: 'worship', name: 'Worship Leader', icon: Music, description: 'Lead music and singing, choose songs that fit the study theme' },
    { id: 'discussion', name: 'Discussion Coordinator', icon: Users, description: 'Guide group discussions, ask follow-up questions' },
    { id: 'hospitality', name: 'Hospitality Coordinator', icon: Coffee, description: 'Coordinate food, setup/cleanup, welcome newcomers' },
    { id: 'tech', name: 'Tech Support', icon: Users, description: 'Manage tech needs, help with virtual attendees, audio setup' }
  ];

  const foodCategories = [
    { id: 'main', name: 'Main Dishes', icon: ChefHat, color: 'bg-red-50 border-red-200 text-red-800' },
    { id: 'side', name: 'Side Dishes', icon: Utensils, color: 'bg-green-50 border-green-200 text-green-800' },
    { id: 'dessert', name: 'Desserts', icon: Heart, color: 'bg-pink-50 border-pink-200 text-pink-800' },
    { id: 'beverage', name: 'Beverages', icon: Coffee, color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { id: 'setup', name: 'Setup Items', icon: Users, color: 'bg-gray-50 border-gray-200 text-gray-800' }
  ];

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleFoodItem = (itemId: string) => {
    setSelectedFoodItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const saveRsvpDetails = async () => {
    if (!user) return;
    try {
      await supabase
        .from('event_rsvp_details')
        .upsert({
          event_id: event.id,
          user_id: user.id,
          dietary_restrictions: dietaryRestrictions.trim(),
          plus_one_count: plusOneCount,
          notes: attendeeNotes.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'event_id,user_id' });
    } catch (err) {
      console.error('Failed to save RSVP details:', err);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const allFoodItems = [...selectedFoodItems];
    if (customFood.trim()) {
      const customItem = `${customFood.trim()}${customFoodServing ? ` (${customFoodServing})` : ''}${foodNotes ? ` - ${foodNotes}` : ''}`;
      allFoodItems.push(customItem);
    }

    setSubmitting(true);
    try {
      await onRSVP(event.id, selectedRoles, allFoodItems);
      await saveRsvpDetails();
      let message = `RSVP confirmed for ${event.title}!`;
      if (plusOneCount > 0) message += ` +${plusOneCount} guest${plusOneCount > 1 ? 's' : ''}.`;
      if (selectedRoles.length > 0) message += ` Volunteering for ${selectedRoles.length} role${selectedRoles.length > 1 ? 's' : ''}.`;
      toast.success(message);
      onClose();
    } catch (error) {
      console.error('RSVP submission failed:', error);
      toast.error('Could not complete RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getItemsByCategory = (category: string) => existingFoodItems.filter(item => item.category === category);

  const renderBasicRSVP = () => (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Confirm Your Attendance</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {event.title} &middot; {event.date} at {event.time}
        </p>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center justify-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-green-800 dark:text-green-300 font-medium text-sm">Yes, I'll be there!</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <Leaf className="w-4 h-4 text-green-500" />
            Dietary Restrictions / Allergies
          </label>
          <input
            type="text"
            value={dietaryRestrictions}
            onChange={(e) => setDietaryRestrictions(e.target.value)}
            placeholder="e.g., vegetarian, nut allergy, gluten-free..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <UserPlus className="w-4 h-4 text-blue-500" />
            Bringing a guest?
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPlusOneCount(Math.max(0, plusOneCount - 1))}
              className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-lg leading-none transition-colors"
            >
              −
            </button>
            <span className="w-12 text-center font-semibold text-gray-900 dark:text-white text-lg">
              {plusOneCount === 0 ? 'Just me' : `+${plusOneCount}`}
            </span>
            <button
              type="button"
              onClick={() => setPlusOneCount(Math.min(10, plusOneCount + 1))}
              className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-lg leading-none transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <StickyNote className="w-4 h-4 text-amber-500" />
            Notes for the host (optional)
          </label>
          <textarea
            value={attendeeNotes}
            onChange={(e) => setAttendeeNotes(e.target.value)}
            placeholder="Anything the host should know..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Want to help make this event special?</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setActiveTab('volunteer')}
            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            Volunteer to Help
          </button>
          <button
            onClick={() => setActiveTab('food')}
            className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          >
            Bring Food
          </button>
        </div>
      </div>
    </div>
  );

  const renderVolunteerTab = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Would you like to serve? (Optional)</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Select any roles you'd be willing to help with:</p>
      <div className="space-y-3">
        {volunteerRoles.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRoles.includes(role.id);
          return (
            <button
              key={role.id}
              onClick={() => toggleRole(role.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                <div className="flex-1">
                  <div className={`font-medium text-sm ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{role.name}</div>
                  <div className={`text-xs mt-0.5 ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{role.description}</div>
                </div>
                {isSelected && <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderFoodTab = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Food Coordination</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">See what's needed and what others are already bringing:</p>
      <div className="space-y-5">
        {foodCategories.map((category) => {
          const Icon = category.icon;
          const items = getItemsByCategory(category.id);
          return (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">{category.name}</h4>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ({items.filter(i => i.completed).length}/{items.length} covered)
                </span>
              </div>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      item.completed
                        ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700'
                        : selectedFoodItems.includes(item.id)
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer'
                    }`}
                    onClick={() => !item.completed && toggleFoodItem(item.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${item.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{item.item}</div>
                        {item.servingSize && <div className="text-xs text-gray-500 dark:text-gray-400">{item.servingSize}</div>}
                        {item.assignedTo && <div className="text-xs text-green-600 dark:text-green-400 font-medium">By: {item.assignedTo}</div>}
                      </div>
                      {!item.completed && (
                        selectedFoodItems.includes(item.id) ? (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium shrink-0">
                            <CheckCircle className="w-4 h-4" />
                            I'll bring this
                          </div>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400 text-xs font-medium shrink-0">I can bring this</span>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-3 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Bring Something Else
        </h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">What will you bring?</label>
              <input
                type="text"
                value={customFood}
                onChange={(e) => setCustomFood(e.target.value)}
                placeholder="e.g., Homemade lasagna..."
                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select
                value={customFoodCategory}
                onChange={(e) => setCustomFoodCategory(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="main">Main Dish</option>
                <option value="side">Side Dish</option>
                <option value="dessert">Dessert</option>
                <option value="beverage">Beverage</option>
                <option value="setup">Setup Item</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Serving Size (optional)</label>
              <input
                type="text"
                value={customFoodServing}
                onChange={(e) => setCustomFoodServing(e.target.value)}
                placeholder="e.g., Serves 8-10..."
                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Special Notes (optional)</label>
              <input
                type="text"
                value={foodNotes}
                onChange={(e) => setFoodNotes(e.target.value)}
                placeholder="e.g., Vegetarian..."
                className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 w-full max-h-[92vh] rounded-t-3xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">RSVP for Event</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{event.title}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.date} at {event.time}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.locations?.name || event.location || 'Location TBD'}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{(event.attendees || 0)}/{event.capacity} attending</span>
          </div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {([
            { id: 'basic', label: 'RSVP', icon: CheckCircle },
            { id: 'volunteer', label: 'Volunteer', icon: Heart },
            { id: 'food', label: 'Food', icon: Utensils },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === 'volunteer' && selectedRoles.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{selectedRoles.length}</span>
                )}
                {tab.id === 'food' && (selectedFoodItems.length > 0 || customFood.trim()) && (
                  <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{selectedFoodItems.length + (customFood.trim() ? 1 : 0)}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'basic' && renderBasicRSVP()}
          {activeTab === 'volunteer' && renderVolunteerTab()}
          {activeTab === 'food' && renderFoodTab()}
        </div>

        <div
          className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : 'Confirm RSVP'}</span>
            </button>
          </div>
          {(plusOneCount > 0 || dietaryRestrictions || selectedRoles.length > 0 || selectedFoodItems.length > 0) && (
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {[
                  plusOneCount > 0 && `+${plusOneCount} guest${plusOneCount > 1 ? 's' : ''}`,
                  dietaryRestrictions && 'dietary info added',
                  selectedRoles.length > 0 && `${selectedRoles.length} volunteer role${selectedRoles.length > 1 ? 's' : ''}`,
                  (selectedFoodItems.length > 0 || customFood.trim()) && `${selectedFoodItems.length + (customFood.trim() ? 1 : 0)} food item${selectedFoodItems.length + (customFood.trim() ? 1 : 0) > 1 ? 's' : ''}`
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
