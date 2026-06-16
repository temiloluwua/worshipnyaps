import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Check } from 'lucide-react';
import { searchAddresses, AddressSuggestion } from '../../lib/geocode';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  // Fired when the user accepts a suggestion (click or pressing Enter on one).
  // The parent should remember the coords so we don't re-geocode at submit.
  onPick?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  required?: boolean;
  name?: string;
}

const previewIcon = L.divIcon({
  className: 'address-preview-icon',
  html: '<div style="background:#2563eb;border:2px solid white;border-radius:50%;width:14px;height:14px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onPick,
  placeholder,
  required,
  name,
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<AddressSuggestion | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const q = value.trim();
    // If the field matches what the user picked, no need to keep searching.
    if (picked && q === picked.displayName) return;
    if (q.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      const results = await searchAddresses(q, ctrl.signal);
      if (!ctrl.signal.aborted) {
        setSuggestions(results);
        setOpen(results.length > 0);
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, picked]);

  const accept = (s: AddressSuggestion) => {
    setPicked(s);
    setOpen(false);
    setSuggestions([]);
    onChange(s.displayName);
    onPick?.(s);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (picked && e.target.value !== picked.displayName) setPicked(null);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        {picked && (
          <Check className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-green-600" />
        )}
        {loading && !picked && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={`${s.latitude}-${s.longitude}-${i}`}>
              <button
                type="button"
                onClick={() => accept(s)}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <span className="leading-snug">{s.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {picked && (
        <div className="mt-2 h-32 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
          <MapContainer
            center={[picked.latitude, picked.longitude]}
            zoom={15}
            scrollWheelZoom={false}
            zoomControl={false}
            dragging={false}
            doubleClickZoom={false}
            style={{ height: '100%', width: '100%' }}
            key={`${picked.latitude},${picked.longitude}`}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[picked.latitude, picked.longitude]} icon={previewIcon} />
          </MapContainer>
        </div>
      )}
    </div>
  );
};
