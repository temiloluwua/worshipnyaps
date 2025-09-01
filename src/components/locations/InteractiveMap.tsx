import React, { useState } from 'react';
import { MapPin, Clock, Users, Eye, EyeOff } from 'lucide-react';

interface MapEvent {
  id: string;
  title: string;
  time: string;
  attendees: number;
  capacity: number;
  coordinates: { lat: number; lng: number };
  isPrivate: boolean;
  category: string;
}

interface InteractiveMapProps {
  events: MapEvent[];
  onEventClick: (eventId: string) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ events, onEventClick }) => {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  // Calgary bounds
  const calgaryBounds = {
    north: 51.2,
    south: 50.8,
    east: -113.8,
    west: -114.4
  };

  // Convert lat/lng to pixel position (simplified)
  const getPixelPosition = (lat: number, lng: number) => {
    const x = ((lng - calgaryBounds.west) / (calgaryBounds.east - calgaryBounds.west)) * 100;
    const y = ((calgaryBounds.north - lat) / (calgaryBounds.north - calgaryBounds.south)) * 100;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'bible study': return 'bg-blue-500';
      case 'activity': return 'bg-orange-500';
      case 'prayer': return 'bg-purple-500';
      case 'worship': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="relative w-full h-80 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg overflow-hidden border-2 border-gray-200">
      {/* Map Background */}
      <div className="absolute inset-0 opacity-20">
        <svg viewBox="0 0 400 300" className="w-full h-full">
          {/* Simplified Calgary street grid */}
          <g stroke="#666" strokeWidth="1" fill="none">
            {/* Major roads */}
            <line x1="0" y1="150" x2="400" y2="150" strokeWidth="2" /> {/* Bow River */}
            <line x1="200" y1="0" x2="200" y2="300" strokeWidth="2" /> {/* Centre St */}
            <line x1="100" y1="0" x2="100" y2="300" /> {/* 14th St */}
            <line x1="300" y1="0" x2="300" y2="300" /> {/* Macleod Trail */}
            <line x1="0" y1="100" x2="400" y2="100" /> {/* 16th Ave */}
            <line x1="0" y1="200" x2="400" y2="200" /> {/* Glenmore Trail */}
          </g>
          {/* Bow River */}
          <path d="M0,150 Q100,140 200,150 T400,145" stroke="#4A90E2" strokeWidth="3" fill="none" opacity="0.6" />
        </svg>
      </div>

      {/* Location Labels */}
      <div className="absolute top-2 left-2 text-xs font-semibold text-gray-700 bg-white/80 px-2 py-1 rounded">
        Calgary
      </div>
      <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">
        Interactive Map
      </div>

      {/* Event Pins */}
      {events.map((event) => {
        const position = getPixelPosition(event.coordinates.lat, event.coordinates.lng);
        const isSelected = selectedEvent === event.id;
        
        return (
          <div key={event.id} className="absolute transform -translate-x-1/2 -translate-y-1/2">
            <div
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              className="absolute"
            >
              {/* Pin */}
              <button
                onClick={() => {
                  setSelectedEvent(isSelected ? null : event.id);
                  onEventClick(event.id);
                }}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg transition-all hover:scale-110 ${
                  getCategoryColor(event.category)
                } ${isSelected ? 'scale-125 ring-2 ring-blue-400' : ''}`}
              >
                {event.isPrivate ? (
                  <EyeOff className="w-3 h-3 text-white" />
                ) : (
                  <MapPin className="w-3 h-3 text-white" />
                )}
                
                {/* Pulse animation for selected */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-full bg-current animate-ping opacity-25"></div>
                )}
              </button>

              {/* Info Popup */}
              {isSelected && (
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-3 min-w-48 z-10 border">
                  <div className="text-center">
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">{event.title}</h4>
                    <div className="flex items-center justify-center space-x-3 text-xs text-gray-600 mb-2">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {event.time}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {event.attendees}/{event.capacity}
                      </div>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      event.category === 'Bible Study' ? 'bg-blue-100 text-blue-800' :
                      event.category === 'Activity' ? 'bg-orange-100 text-orange-800' :
                      event.category === 'Prayer' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.category}
                    </span>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-white/90 rounded-lg p-2 text-xs">
        <div className="font-semibold mb-1">Legend:</div>
        <div className="space-y-1">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Bible Study</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <span>Activity</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
            <span>Prayer</span>
          </div>
        </div>
      </div>
    </div>
  );
};