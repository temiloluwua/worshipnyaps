// Proactive, client-side profanity screen for user-generated text (chat, DMs,
// comments, posts, topics). This is a first line of defense that catches the
// obvious stuff before it's ever stored — it complements, but does not replace,
// the reactive report/block moderation. It is intentionally conservative to
// avoid false positives (the "Scunthorpe problem"): we match whole words on a
// small, high-signal list rather than naive substring checks.
//
// NOTE: a determined user can bypass any client filter, so treat this as UX,
// not security. A server-side trigger would be the hard gate (see follow-up).

// High-signal slurs / explicit profanity. Kept short and unambiguous on
// purpose. Expand carefully — every entry is matched as a whole word.
const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'piss',
  'slut', 'whore', 'faggot', 'nigger', 'nigga', 'retard', 'spic', 'kike',
  'chink', 'coon', 'wetback', 'tranny',
];

// Normalize common leetspeak / symbol substitutions so "sh1t" / "f*ck" are
// still caught, then collapse repeats ("shiiit" → "shit").
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[^a-z\s]/g, '') // drop remaining punctuation/symbols
    .replace(/(.)\1{2,}/g, '$1$1'); // collapse 3+ repeats to 2
}

const WORD_PATTERNS = BLOCKED_WORDS.map(
  (w) => new RegExp(`\\b${w}s?\\b`, 'i'),
);

// Returns the list of blocked words found (empty = clean).
export function findProfanity(text: string): string[] {
  if (!text) return [];
  const normalized = normalize(text);
  const hits: string[] = [];
  for (let i = 0; i < WORD_PATTERNS.length; i++) {
    if (WORD_PATTERNS[i].test(normalized)) hits.push(BLOCKED_WORDS[i]);
  }
  return hits;
}

export function containsProfanity(text: string): boolean {
  return findProfanity(text).length > 0;
}
