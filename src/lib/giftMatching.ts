// Maps a person's spiritual gifts to the kinds of help events ask for, so we
// can connect hosts who need help with the people gifted to give it.
//
// Two data vocabularies meet here:
//  - Spiritual gifts: what users pick on their profile. EVENT_GIFTS below is
//    the single source of truth for that picker (used by both EditProfileModal
//    and OnboardingFlow) — deliberately pruned to gifts that map to a real
//    event need.
//  - Help request types: the fixed `event_help_requests.request_type` enum
//    (prayer, worship, tech, discussion, hospitality, setup, other).

export type HelpType = 'prayer' | 'worship' | 'tech' | 'discussion' | 'hospitality' | 'setup' | 'other';

export interface Gift {
  id: string;
  label: string;
  emoji: string;
}

// The canonical list of selectable spiritual gifts. Every gift here maps to at
// least one event help need (see GIFT_TO_HELP_TYPES).
export const EVENT_GIFTS: Gift[] = [
  { id: 'Prayer', label: 'Prayer', emoji: '🙏' },
  { id: 'Worship', label: 'Worship', emoji: '🎵' },
  { id: 'Teaching', label: 'Teaching', emoji: '📖' },
  { id: 'Hosting', label: 'Hosting', emoji: '🏠' },
  { id: 'Connection', label: 'Connection', emoji: '🤝' },
  { id: 'Evangelism', label: 'Evangelism', emoji: '📣' },
];

// A gift → the help types someone with that gift is well suited to fill.
const GIFT_TO_HELP_TYPES: Record<string, HelpType[]> = {
  Prayer: ['prayer'],
  Worship: ['worship'],
  Teaching: ['discussion'],
  Hosting: ['hospitality', 'setup'],
  Connection: ['hospitality'],
  Evangelism: ['discussion'],
};

const GIFT_EMOJI: Record<string, string> = Object.fromEntries(
  EVENT_GIFTS.map((g) => [g.id, g.emoji])
);

export const giftEmoji = (gift: string): string => GIFT_EMOJI[gift] || '✨';

// The union of help types the given gifts can serve. Used to query open help
// requests worth recommending to a helper.
export function helpTypesForGifts(gifts: string[] | null | undefined): HelpType[] {
  if (!gifts || gifts.length === 0) return [];
  const set = new Set<HelpType>();
  for (const gift of gifts) {
    for (const type of GIFT_TO_HELP_TYPES[gift] || []) set.add(type);
  }
  return Array.from(set);
}

// The gifts that qualify someone to fill a given help type. Used to find
// people to suggest to a host for a specific request.
export function giftsForHelpType(type: string): string[] {
  return Object.keys(GIFT_TO_HELP_TYPES).filter((gift) =>
    (GIFT_TO_HELP_TYPES[gift] as string[]).includes(type)
  );
}

// The first of a person's gifts that matches a help type (for a "because you're
// gifted in X" label). Returns null when nothing matches.
export function matchingGiftForType(gifts: string[] | null | undefined, type: string): string | null {
  if (!gifts) return null;
  return gifts.find((gift) => (GIFT_TO_HELP_TYPES[gift] || []).includes(type as HelpType)) || null;
}
