import React, { useState } from 'react';
import { X, Users, Clock, MapPin, Music, Coffee, Heart, CheckCircle, Plus, Utensils, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';

type RSVPEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  capacity: number;
  attendees?: number;
  // Support either a simple string or joined location object
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
  onRSVP: (eventId: string, volunteerRoles: string[], foodItems: string[]) => void;
}

export const RSVPModal: React.FC<RSVPModalProps> = ({ event, isOpen, onClose, onRSVP }) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedFoodItems, setSelectedFoodItems] = useState<string[]>([]);
  const [customFood, setCustomFood] = useState('');
  const [customFoodCategory, setCustomFoodCategory] = useState<'main' | 'side' | 'dessert' | 'beverage' | 'setup'>('main');
  const [customFoodServing, setCustomFoodServing] = useState('');
  const [foodNotes, setFoodNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'volunteer' | 'food'>('basic');

  // Mock existing food assignments - in production this would come from the database
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

  if (!isOpen) return null;

  const volunteerRoles = [
    { id: 'prayer', name: 'Prayer Leader', icon: Heart, description: 'Lead opening and closing prayers, pray for specific needs' },
    { id: 'worship', name: 'Worship Leader', icon: Music, description: 'Lead music and singing, choose songs that fit the study theme' },
    { id: 'discussion', name: 'Discussion Coordinator', icon: Users, description: 'Guide group discussions, ask follow-up questions, ensure participation' },
    { id: 'hospitality', name: 'Hospitality Coordinator', icon: Coffee, description: 'Coordinate food, setup/cleanup, welcome newcomers' },
    { id: 'tech', name: 'Tech Support', icon: Users, description: 'Manage tech needs, help with virtual attendees, audio setup' }
  ];

  const foodCategories = [
    { id: 'main', name: 'Main Dishes', icon: ChefHat, color: 'bg-red-50 border-red-200 text-red-800' },
    { id: 'side', name: 'Side Dishes', icon: Utensils, color: 'bg-green-50 border-green-200 text-green-800' },
    { id: 'dessert', name: 'Desserts', icon: Heart, color: 'bg-pink-50 border-pink-200 text-pink-800' },
    { id: 'beverage', name: 'Beverages', icon: Coffee, color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { id: 'setup', name: 'Setup Items', icon: Users, color: 'bg-purple-50 border-purple-200 text-purple-800' }
  ];

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const toggleFoodItem = (itemId: string) => {
    setSelectedFoodItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSubmit = () => {
    const allFoodItems = [...selectedFoodItems];
    
    // Add custom food item if specified
    if (customFood.trim()) {
      const customItem = `${customFood.trim()}${customFoodServing ? ` (${customFoodServing})` : ''}${foodNotes ? ` - ${foodNotes}` : ''}`;
      allFoodItems.push(customItem);
    }
    
    onRSVP(event.id, selectedRoles, allFoodItems);
    
    let message = `RSVP confirmed for ${event.title}!`;
    if (selectedRoles.length > 0) {
      message += ` You're volunteering for: ${selectedRoles.join(', ')}.`;
    }
    if (allFoodItems.length > 0) {
      message += ` You're bringing food items.`;
    }
    
    toast.success(message);
    onClose();
  };

  const getItemsByCategory = (category: string) => {
    return existingFoodItems.filter(item => item.category === category);
  };

  const renderBasicRSVP = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Confirm Your Attendance</h3>
        <p className="text-gray-600">
          Join us for {event.title} on {event.date} at {event.time}
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-800 font-medium">Yes, I'll be there!</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          Want to help make this event special? You can volunteer or bring food on the next tabs.
        </p>
        <div className="flex space-x-2 justify-center">
          <button
            onClick={() => setActiveTab('volunteer')}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
          >
            Volunteer to Help
          </button>
          <button
            onClick={() => setActiveTab('food')}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
          >
            Bring Food
          </button>
        </div>
      </div>
    </div>
  );

  const renderVolunteerTab = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Would you like to serve? (Optional)</h3>
      <p className="text-sm text-gray-600 mb-6">
        Select any roles you'd be willing to help with:
      </p>
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
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center">
                <Icon className={`w-6 h-6 mr-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                <div className="flex-1">
                  <div className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {role.name}
                  </div>
                  <div className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                    {role.description}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderFoodTab = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Food Coordination</h3>
      <p className="text-sm text-gray-600 mb-6">
        Help make this gathering special by contributing food. See what's needed and what others are bringing:
      </p>

      {/* Food Categories */}
      <div className="space-y-6">
        {foodCategories.map((category) => {
          const Icon = category.icon;
          const items = getItemsByCategory(category.id);
          
          return (
            <div key={category.id} className="space-y-3">
              <div className="flex items-center space-x-2">
                <Icon className="w-5 h-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">{category.name}</h4>
                <span className="text-xs text-gray-500">
                  ({items.filter(item => item.completed).length}/{items.length} covered)
                </span>
              </div>
              
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-all ${
                      item.completed
                        ? 'bg-gray-50 border-gray-200'
                        : selectedFoodItems.includes(item.id)
                        ? 'bg-green-50 border-green-300 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer'
                    }`}
                    onClick={() => !item.completed && toggleFoodItem(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {item.item}
                        </div>
                        {item.servingSize && (
                          <div className="text-sm text-gray-500">{item.servingSize}</div>
                        )}
                        {item.assignedTo && (
                          <div className="text-sm text-green-600 font-medium">
                            ✓ {item.assignedTo}
                          </div>
                        )}
                      </div>
                      
                      {!item.completed && (
                        <div className="flex items-center">
                          {selectedFoodItems.includes(item.id) ? (
                            <div className="flex items-center space-x-1 text-green-600">
                              <CheckCircle className="w-5 h-5" />
                              <span className="text-sm font-medium">I'll bring this</span>
                            </div>
                          ) : (
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                              I can bring this
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Food Item */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Bring Something Else
        </h4>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What will you bring?
              </label>
              <input
                type="text"
                value={customFood}
                onChange={(e) => setCustomFood(e.target.value)}
                placeholder="e.g., Homemade lasagna, Fresh fruit salad..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={customFoodCategory}
                onChange={(e) => setCustomFoodCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="main">Main Dish</option>
                <option value="side">Side Dish</option>
                <option value="dessert">Dessert</option>
                <option value="beverage">Beverage</option>
                <option value="setup">Setup Item</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serving Size (Optional)
              </label>
              <input
                type="text"
                value={customFoodServing}
                onChange={(e) => setCustomFoodServing(e.target.value)}
                placeholder="e.g., Serves 8-10, Large tray..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Notes (Optional)
              </label>
              <input
                type="text"
                value={foodNotes}
                onChange={(e) => setFoodNotes(e.target.value)}
                placeholder="e.g., Vegetarian, Contains nuts..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Food Summary */}
      {(selectedFoodItems.length > 0 || customFood.trim()) && (
        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
          <h4 className="font-medium text-green-900 mb-3">Your Food Contributions:</h4>
          <div className="space-y-2">
            {selectedFoodItems.map(itemId => {
              const item = existingFoodItems.find(f => f.id === itemId);
              return item ? (
                <div key={itemId} className="flex items-center text-sm text-green-800">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>{item.item} {item.servingSize && `(${item.servingSize})`}</span>
                </div>
              ) : null;
            })}
            {customFood.trim() && (
              <div className="flex items-center text-sm text-green-800">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>
                  {customFood}
                  {customFoodServing && ` (${customFoodServing})`}
                  {foodNotes && ` - ${foodNotes}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full max-h-[90vh] rounded-t-3xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">RSVP for Event</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Event Info */}
        <div className="p-4 bg-blue-50 border-b">
          <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {event.date} at {event.time}
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              {event.locations?.name || event.location || 'Location TBD'}
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              {(event.attendees || 0)}/{event.capacity} attending
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'basic', label: 'RSVP', icon: CheckCircle },
            { id: 'volunteer', label: 'Volunteer', icon: Heart },
            { id: 'food', label: 'Food', icon: Utensils }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'volunteer' && selectedRoles.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {selectedRoles.length}
                  </span>
                )}
                {tab.id === 'food' && (selectedFoodItems.length > 0 || customFood.trim()) && (
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                    {selectedFoodItems.length + (customFood.trim() ? 1 : 0)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-250px)]">
          {activeTab === 'basic' && renderBasicRSVP()}
          {activeTab === 'volunteer' && renderVolunteerTab()}
          {activeTab === 'food' && renderFoodTab()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Confirm RSVP</span>
            </button>
          </div>
          
          {/* RSVP Summary */}
          {(selectedRoles.length > 0 || selectedFoodItems.length > 0 || customFood.trim()) && (
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-600">
                {selectedRoles.length > 0 && `Volunteering: ${selectedRoles.length} role${selectedRoles.length > 1 ? 's' : ''}`}
                {selectedRoles.length > 0 && (selectedFoodItems.length > 0 || customFood.trim()) && ' • '}
                {(selectedFoodItems.length > 0 || customFood.trim()) && `Bringing: ${selectedFoodItems.length + (customFood.trim() ? 1 : 0)} item${selectedFoodItems.length + (customFood.trim() ? 1 : 0) > 1 ? 's' : ''}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
