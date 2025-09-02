import React, { useState } from 'react';
import { User, Mail, Lock, Phone, MapPin, Calendar, Heart, Users, Music, Coffee, CheckCircle, Plus, Minus, Clock, Eye, EyeOff } from 'lucide-react';
import { EventManagement } from '../events/EventManagement';
import toast from 'react-hot-toast';

interface FoodItem {
  id: string;
  item: string;
  category: 'main' | 'side' | 'dessert' | 'beverage';
  assignedTo?: string;
  completed: boolean;
}

interface SetListSong {
  id: string;
  title: string;
  artist: string;
  key?: string;
  tempo?: string;
}

export function SignupView() {
  const [activeTab, setActiveTab] = useState<'host' | 'volunteer' | 'my-events'>('host');
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
    churchBackground: '',
    eventTitle: '',
    eventType: 'bible-study',
    eventDate: '',
    eventTime: '',
    capacity: 12,
    description: '',
    isPrivate: false
  });

  // Worship Set List Management
  const [setList, setSetList] = useState<SetListSong[]>([
    { id: '1', title: 'Amazing Grace', artist: 'Traditional', key: 'G', tempo: 'Slow' }
  ]);
  const [musicians, setMusicians] = useState<string[]>(['']);

  // Food Coordination
  const [foodItems, setFoodItems] = useState<FoodItem[]>([
    { id: '1', item: 'Main Dish (serves 12)', category: 'main', completed: false },
    { id: '2', item: 'Salad', category: 'side', completed: false },
    { id: '3', item: 'Dessert', category: 'dessert', completed: false },
    { id: '4', item: 'Beverages', category: 'beverage', completed: false }
  ]);
  
  // My Events data
  const [myEvents, setMyEvents] = useState([
    {
      id: '1',
      title: 'Wednesday Bible Study',
      date: '2025-01-15',
      time: '7:00 PM',
      role: 'host',
      location: 'My Home',
      attendees: 8,
      capacity: 12,
      status: 'upcoming',
      unreadMessages: 3,
      attendeesList: [
        { id: 'host-1', name: 'You', isHost: true, rsvpDate: '2 weeks ago' },
        { id: 'user-1', name: 'Michael Chen', rsvpDate: '1 week ago' },
        { id: 'user-2', name: 'Sarah Kim', rsvpDate: '5 days ago' },
        { id: 'user-3', name: 'David Park', rsvpDate: '3 days ago' },
        { id: 'user-4', name: 'Emily Wong', rsvpDate: '2 days ago' },
        { id: 'user-5', name: 'James Lee', rsvpDate: '1 day ago' },
        { id: 'user-6', name: 'Lisa Chen', rsvpDate: '1 day ago' },
        { id: 'user-7', name: 'Mark Johnson', rsvpDate: '12 hours ago' }
      ]
    },
    {
      id: '2',
      title: 'Basketball & Yap',
      date: '2025-01-16',
      time: '6:30 PM',
      role: 'volunteer',
      position: 'Hospitality',
      location: 'Community Center',
      attendees: 12,
      capacity: 16,
      status: 'upcoming',
      unreadMessages: 1,
      attendeesList: [
        { id: 'host-2', name: 'David Chen', isHost: true, rsvpDate: '1 week ago' },
        { id: 'user-8', name: 'You', rsvpDate: '3 days ago' }
      ]
    }
  ]);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventManagement, setShowEventManagement] = useState(false);
  const interests = [
    'Bible Study', 'Worship', 'Prayer', 'Community Service', 
    'Youth Ministry', 'Music', 'Teaching', 'Missions', 'Being a Yapper'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const addSong = () => {
    const newSong: SetListSong = {
      id: Date.now().toString(),
      title: '',
      artist: '',
      key: '',
      tempo: ''
    };
    setSetList([...setList, newSong]);
  };

  const updateSong = (id: string, field: keyof SetListSong, value: string) => {
    setSetList(setList.map(song => 
      song.id === id ? { ...song, [field]: value } : song
    ));
  };

  const removeSong = (id: string) => {
    setSetList(setList.filter(song => song.id !== id));
  };

  const addMusician = () => {
    setMusicians([...musicians, '']);
  };

  const updateMusician = (index: number, value: string) => {
    const newMusicians = [...musicians];
    newMusicians[index] = value;
    setMusicians(newMusicians);
  };

  const removeMusician = (index: number) => {
    setMusicians(musicians.filter((_, i) => i !== index));
  };

  const addFoodItem = () => {
    const newItem: FoodItem = {
      id: Date.now().toString(),
      item: '',
      category: 'main',
      completed: false
    };
    setFoodItems([...foodItems, newItem]);
  };

  const updateFoodItem = (id: string, field: keyof FoodItem, value: any) => {
    setFoodItems(foodItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const toggleFoodItem = (id: string, assignedTo?: string) => {
    setFoodItems(foodItems.map(item => 
      item.id === id 
        ? { ...item, completed: !item.completed, assignedTo: assignedTo || 'You' }
        : item
    ));
    
    const item = foodItems.find(f => f.id === id);
    if (item) {
      toast.success(`${item.completed ? 'Unchecked' : 'Checked off'}: ${item.item}`);
    }
  };

  const removeFoodItem = (id: string) => {
    setFoodItems(foodItems.filter(item => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'host') {
      toast.success('Host application submitted for approval!');
      // Add to my events
      const newEvent = {
        id: Date.now().toString(),
        title: formData.eventTitle,
        date: formData.eventDate,
        time: formData.eventTime,
        role: 'host' as const,
        attendees: 0,
        capacity: formData.capacity,
        status: 'upcoming' as const,
        location: 'My Home'
      };
      setMyEvents(prev => [newEvent, ...prev]);
      setActiveTab('my-events');
    } else {
      toast.success('Account created successfully!');
    }
  };
  const handleManageEvent = (event: any) => {
    const eventWithDetails = {
      ...event,
      description: 'Join us for an interactive Bible study session with great discussion and fellowship.',
      attendees: event.attendeesList || [],
      isHost: event.role === 'host'
    };
    setSelectedEvent(eventWithDetails);
    setShowEventManagement(true);
  };

  const renderMyEvents = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          My Events & Commitments
        </h2>
        
        {myEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No events yet</p>
            <button
              onClick={() => setActiveTab('host')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Host Your First Event
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {myEvents.map((event) => (
              <div key={event.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-sm text-blue-600 font-medium">
                      {event.role === 'host' ? 'Hosting' : `Volunteering as ${event.position}`}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    event.status === 'upcoming' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {event.date}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {event.time}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {event.location}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {event.attendees}/{event.capacity}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200">
                    View Details
                  </button>
                  {event.role === 'host' && (
                    <button 
                      onClick={() => handleManageEvent(event)}
                      className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 flex items-center justify-center space-x-1"
                    >
                      <span>Manage Event</span>
                      {event.unreadMessages > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {event.unreadMessages}
                        </span>
                      )}
                    </button>
                  )}
                  {event.role === 'volunteer' && (
                    <button 
                      onClick={() => handleManageEvent(event)}
                      className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 flex items-center justify-center space-x-1"
                    >
                      Manage Event
                      {event.unreadMessages > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {event.unreadMessages}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderHostForm = () => (
    <div className="space-y-6">
      {/* Basic Event Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Host an Event
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
            <input
              type="text"
              name="eventTitle"
              value={formData.eventTitle}
              onChange={handleInputChange}
              placeholder="e.g., Wednesday Bible Study, Basketball & Yap"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bible-study">Bible Study</option>
                <option value="basketball-yap">Basketball & Yap</option>
                <option value="hiking-yap">Hiking & Yap</option>
                <option value="prayer-meeting">Prayer Meeting</option>
                <option value="worship-night">Worship Night</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                min="4"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="time"
                name="eventTime"
                value={formData.eventTime}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Describe your event, what to expect, any special notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isPrivate"
              checked={formData.isPrivate}
              onChange={handleInputChange}
              className="mr-2"
            />
            <label className="text-sm text-gray-700">Make this a private event (invite only)</label>
          </div>
        </div>
      </div>

      {/* Worship Set List */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Music className="w-5 h-5 mr-2" />
          Worship Set List
        </h3>
        
        <div className="space-y-4">
          {setList.map((song, index) => (
            <div key={song.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600 w-6">{index + 1}.</span>
              <input
                type="text"
                placeholder="Song title"
                value={song.title}
                onChange={(e) => updateSong(song.id, 'title', e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                placeholder="Artist"
                value={song.artist}
                onChange={(e) => updateSong(song.id, 'artist', e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                placeholder="Key"
                value={song.key || ''}
                onChange={(e) => updateSong(song.id, 'key', e.target.value)}
                className="w-12 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <button
                type="button"
                onClick={() => removeSong(song.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addSong}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Song</span>
          </button>
        </div>

        {/* Musicians */}
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-800 mb-3">Musicians & Singers</h4>
          <div className="space-y-2">
            {musicians.map((musician, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Name and instrument/role"
                  value={musician}
                  onChange={(e) => updateMusician(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeMusician(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addMusician}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Musician</span>
            </button>
          </div>
        </div>
      </div>

      {/* Food Coordination */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Coffee className="w-5 h-5 mr-2" />
          Food Coordination
        </h3>
        
        <div className="space-y-3">
          {foodItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <button
                type="button"
                onClick={() => toggleFoodItem(item.id)}
                className={`flex-shrink-0 ${
                  item.completed 
                    ? 'text-green-600' 
                    : 'text-gray-400 hover:text-green-600'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
              </button>
              
              <div className="flex-1">
                <input
                  type="text"
                  value={item.item}
                  onChange={(e) => updateFoodItem(item.id, 'item', e.target.value)}
                  className={`w-full px-2 py-1 border border-gray-300 rounded text-sm ${
                    item.completed ? 'line-through text-gray-500' : ''
                  }`}
                />
                {item.completed && item.assignedTo && (
                  <p className="text-xs text-green-600 mt-1">✓ {item.assignedTo}</p>
                )}
              </div>
              
              <select
                value={item.category}
                onChange={(e) => updateFoodItem(item.id, 'category', e.target.value as any)}
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="main">Main</option>
                <option value="side">Side</option>
                <option value="dessert">Dessert</option>
                <option value="beverage">Beverage</option>
              </select>
              
              <button
                type="button"
                onClick={() => removeFoodItem(item.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addFoodItem}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Food Item</span>
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Submit Host Application
      </button>
    </div>
  );

  const renderVolunteerForm = () => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <Heart className="w-5 h-5 mr-2" />
        Join Our Community
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
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

      <div className="mb-4">
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

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Areas of Interest</label>
        <p className="text-sm text-gray-600 mb-3">
          Select what you're interested in - including just being a great conversationalist!
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        Join Our Community
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Serve & Connect</h1>
        <p className="text-gray-600">Host events or join our Calgary Bible study community</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            onClick={() => setActiveTab('host')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'host'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Host Event
          </button>
          <button
            onClick={() => setActiveTab('volunteer')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'volunteer'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Join Community
          </button>
          <button
            onClick={() => setActiveTab('my-events')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'my-events'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            My Events
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'host' && renderHostForm()}
        {activeTab === 'volunteer' && renderVolunteerForm()}
        {activeTab === 'my-events' && renderMyEvents()}
      </form>
      
      {/* Event Management Modal */}
      {showEventManagement && selectedEvent && (
        <EventManagement
          event={selectedEvent}
          onClose={() => {
            setShowEventManagement(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}