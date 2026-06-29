export function formatTime12h(time?: string | null): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10) || 0;
  if (isNaN(h)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

export function formatDateShort(date?: string | null): string {
  if (!date) return '';
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

const LOCATION_TYPE_LABELS: Record<string, string> = {
  home: '🏠 Home',
  church: '⛪ Church',
  park: '🌿 Outdoors',
  cafe: '☕ Café',
  online: '💻 Online',
};

const YAP_VIBE_LABELS: Record<string, string> = {
  games: '🎲 Games',
  food: '🍽️ Food',
  sports: '🏅 Sports',
  music: '🎶 Music',
  hanging: '🗣️ Just hanging',
};

export function formatLocationType(locationType?: string | null): string {
  if (!locationType) return '';
  return LOCATION_TYPE_LABELS[locationType] || locationType;
}

export function formatEventTypeLabel(event: { event_type?: string | null; yap_vibe?: string | null; type?: string | null }): string {
  const evType = event.event_type;
  if (evType === 'bible_study') return '📖 Bible Study';
  if (evType === 'church') return '✨ Yap';
  if (evType === 'yap') {
    return YAP_VIBE_LABELS[event.yap_vibe || ''] || '🎉 Yap';
  }
  // Fallback to legacy `type` column
  if (event.type) {
    return event.type.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
  return 'Event';
}

export function formatLocationNameOrType(event: { locations?: { name?: string | null } | null; location_type?: string | null }): string {
  const name = event.locations?.name?.trim();
  if (name) return name;
  if (event.location_type) return formatLocationType(event.location_type);
  return 'Location TBD';
}
