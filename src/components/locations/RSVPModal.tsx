import React, { useState } from 'react';
import { X, Users, Clock, MapPin, Music, Coffee, Heart, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  attendees: number;
  capacity: number;
  description: string;
  hostName: string;
}

interface RSVPModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onRSVP: (eventId: string, volunteerRoles: string[], foodItems: string[]) => void;
}

export const RSVPModal: React.FC<RSVPModalProps> = ({ event, isOpen, onClose, onRSVP }) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedFoodItems, setSelectedFoodItems] = useState<string[]>([]);
  const [customFood, setCustomFood] = useState('');

  if (!isOpen) return null;

  const volunteerRoles = [
    { id: 'worship', name: 'Lead Worship', icon: Music, description: 'Lead music and singing' },
    { id: 'discussion', name: 'Discussion Leader', icon: Users, description: 'Guide group discussions' },
    { id: 'hospitality', name: 'Hospitality', icon: Coffee, description: 'Setup, cleanup, and welcoming' },
    { id: 'prayer', name: 'Prayer Ministry', icon: Heart, description: 'Lead prayer time' }
  ];

  const foodOptions = [
    'Main dish (serves 12)',
    'Salad or side dish',
    'Dessert',
    'Beverages (coffee, tea, juice)',
    'Snacks',
    'Paper plates & napkins',
    'Cups & utensils'
  ];

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const toggleFoodItem = (item: string) => {
    setSelectedFoodItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const handleSubmit = () => {
    const allFoodItems = [...selectedFoodItems];
    if (customFood.trim()) {
      allFoodItems.push(customFood.trim());
    }
    
    onRSVP(event.id, selectedRoles, allFoodItems);
    
    let message = `RSVP confirmed for ${event.title}!`;
    if (selectedRoles.length > 0) {
      message += ` You're volunteering for: ${selectedRoles.join(', ')}.`;
    }
    if (allFoodItems.length > 0) {
      message += ` You're bringing: ${allFoodItems.join(', ')}.`;
    }
    
    toast.success(message);
    onClose();
  };

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

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
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
                {event.location}
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                {event.attendees}/{event.capacity} attending
              </div>
            </div>
          </div>

          {/* Basic RSVP */}
          <div className="p-4 border-b">
            <h4 className="font-semibold text-gray-900 mb-3">Confirm Your Attendance</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Yes, I'll be there!</span>
              </div>
            </div>
          </div>

          {/* Volunteer Roles */}
          <div className="p-4 border-b">
            <h4 className="font-semibold text-gray-900 mb-3">Would you like to serve? (Optional)</h4>
            <p className="text-sm text-gray-600 mb-4">
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
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className={`w-5 h-5 mr-3 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                      <div>
                        <div className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {role.name}
                        </div>
                        <div className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                          {role.description}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-blue-600 ml-auto" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Food Contributions */}
          <div className="p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Can you bring food? (Optional)</h4>
            <p className="text-sm text-gray-600 mb-4">
              Help make this gathering special by contributing food:
            </p>
            <div className="space-y-2 mb-4">
              {foodOptions.map((item) => {
                const isSelected = selectedFoodItems.includes(item);
                
                return (
                  <button
                    key={item}
                    onClick={() => toggleFoodItem(item)}
                    className={`w-full p-2 rounded-lg border text-left transition-all ${
                      isSelected 
                        ? 'border-green-500 bg-green-50 text-green-900' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{item}</span>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Food Item */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or specify something else:
              </label>
              <input
                type="text"
                value={customFood}
                onChange={(e) => setCustomFood(e.currentTarget.value)}
                placeholder="e.g., Homemade cookies, Fruit tray..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
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
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Confirm RSVP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};