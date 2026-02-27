import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Clock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';

const createIcon = (color: string, size: number) => L.divIcon({
  className: '',
  html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="${size * 0.4}" height="${size * 0.4}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  </div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size],
  popupAnchor: [0, -size],
});

const defaultIcon = createIcon('#2563eb', 32);
const selectedIcon = createIcon('#dc2626', 40);

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

function UserLocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);
        map.setView(coords, 12);
      },
      () => {},
      { timeout: 5000 }
    );
  }, [map]);

  if (!position) return null;

  const userIcon = L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(59,130,246,0.2),0 2px 4px rgba(0,0,0,0.2);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return <Marker position={position} icon={userIcon} />;
}

function FitBounds({ events }: { events: MapEvent[] }) {
  const map = useMap();

  useEffect(() => {
    if (events.length === 0) return;

    const bounds = L.latLngBounds(
      events.map(e => [e.coordinates.lat, e.coordinates.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [events, map]);

  return null;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ events, onEventClick }) => {
  const { t } = useTranslation();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const validEvents = events.filter(
    e => e.coordinates && e.coordinates.lat !== 0 && e.coordinates.lng !== 0
  );

  return (
    <div className="relative w-full h-80 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <UserLocationMarker />
        {validEvents.length > 0 && <FitBounds events={validEvents} />}

        {validEvents.map((event) => (
          <Marker
            key={event.id}
            position={[event.coordinates.lat, event.coordinates.lng]}
            icon={selectedEvent === event.id ? selectedIcon : defaultIcon}
            eventHandlers={{
              click: () => setSelectedEvent(event.id),
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <h4 className="font-semibold text-sm text-gray-900 mb-1">{event.title}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {event.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.attendees}/{event.capacity}
                  </span>
                </div>
                <button
                  onClick={() => onEventClick(event.id)}
                  className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  {t('events.view')}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .leaflet-popup-content {
          margin: 10px 12px;
        }
      `}</style>
    </div>
  );
};
