import React, { useState } from 'react';
import { Calendar, Users, MessageCircle, Settings, MapPin, Clock, Edit, Trash2, UserPlus } from 'lucide-react';
import { EventMessaging } from './EventMessaging';
import toast from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: Array<{
    id: string;
    name: string;
    avatar?: string;
    isHost?: boolean;
    rsvpDate: string;
  }>;
  capacity: number;
  description: string;
  isHost: boolean;
  unreadMessages: number;
}

interface EventManagementProps {
  event: Event;
  onClose: () => void;
}

export const EventManagement: React.FC<EventManagementProps> = ({ event, onClose }) => {
  const [showMessaging, setShowMessaging] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendees' | 'settings'>('overview');

  const handleRemoveAttendee = (attendeeId: string) => {
    toast.success('Attendee removed from event');
  };

  const handleEditEvent = () => {
    toast.success('Edit event feature coming soon!');
  };

  const handleDeleteEvent = () => {
    if (window.confirm('Are you sure you want to delete this event? This cannot be undone.')) {
      toast.success('Event deleted');
      onClose();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Event Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-900">{event.attendees.length}</div>
          <div className="text-sm text-blue-600">Attendees</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <Calendar className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-900">{event.capacity - event.attendees.length}</div>
          <div className="text-sm text-green-600">Spots Left</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <MessageCircle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-900">{event.unreadMessages}</div>
          <div className="text-sm text-purple-600">New Messages</div>
        </div>
      </div>

      {/* Event Details */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Event Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-gray-500 mr-2" />
            <span>{event.date} at {event.time}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-gray-500 mr-2" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 text-gray-500 mr-2" />
            <span>{event.attendees.length}/{event.capacity} people</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <button
          onClick={() => setShowMessaging(true)}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Message All Attendees</span>
          {event.unreadMessages > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {event.unreadMessages}
            </span>
          )}
        </button>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleEditEvent}
            className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Event</span>
          </button>
          
          <button
            onClick={handleDeleteEvent}
            className="bg-red-100 text-red-700 py-2 px-4 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAttendees = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Attendees ({event.attendees.length})</h3>
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1">
          <UserPlus className="w-4 h-4" />
          <span>Invite More</span>
        </button>
      </div>
      
      <div className="space-y-3">
        {event.attendees.map((attendee) => (
          <div key={attendee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {attendee.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {attendee.name}
                  {attendee.isHost && <span className="text-blue-600 text-sm ml-2">(Host)</span>}
                </div>
                <div className="text-sm text-gray-500">RSVP'd {attendee.rsvpDate}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowMessaging(true)}
                className="text-blue-600 hover:text-blue-700 p-2"
                title="Message"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
              {!attendee.isHost && (
                <button
                  onClick={() => handleRemoveAttendee(attendee.id)}
                  className="text-red-600 hover:text-red-700 p-2"
                  title="Remove from event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Event Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Event Visibility</div>
              <div className="text-sm text-gray-500">Who can see this event</div>
            </div>
            <select className="px-3 py-1 border border-gray-300 rounded text-sm">
              <option>Public</option>
              <option>Private</option>
              <option>Invite Only</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">RSVP Required</div>
              <div className="text-sm text-gray-500">Require RSVP to attend</div>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Allow Messaging</div>
              <div className="text-sm text-gray-500">Let attendees message each other</div>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </div>
      
      <div className="pt-4 border-t">
        <button
          onClick={handleDeleteEvent}
          className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          Delete Event Permanently
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{event.title}</h2>
              <p className="text-sm text-gray-600">Event Management</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <Settings size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {[
              { id: 'overview', label: 'Overview', icon: Calendar },
              { id: 'attendees', label: 'Attendees', icon: Users },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'attendees' && renderAttendees()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>

      {/* Messaging Modal */}
      {showMessaging && (
        <EventMessaging
          eventId={event.id}
          eventTitle={event.title}
          attendees={event.attendees}
          currentUserId="current-user"
          isHost={event.isHost}
          onClose={() => setShowMessaging(false)}
        />
      )}
    </>
  );
};