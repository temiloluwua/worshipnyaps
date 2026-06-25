export type BibleVersion = 'NIV' | 'ESV' | 'KJV' | 'NLT' | 'NASB' | 'NKJV' | 'MSG';

export const BIBLE_VERSIONS: { code: BibleVersion; label: string }[] = [
  { code: 'NIV', label: 'NIV — New International Version' },
  { code: 'ESV', label: 'ESV — English Standard Version' },
  { code: 'KJV', label: 'KJV — King James Version' },
  { code: 'NLT', label: 'NLT — New Living Translation' },
  { code: 'NASB', label: 'NASB — New American Standard Bible' },
  { code: 'NKJV', label: 'NKJV — New King James Version' },
  { code: 'MSG', label: 'MSG — The Message' },
];

// Build a deep link to a passage in the user's preferred translation.
// ESV has its own canonical site; everything else routes through BibleGateway.
export function bibleLinkFor(reference: string, version: BibleVersion = 'NIV'): string {
  const cleanRef = reference.trim();
  if (version === 'ESV') {
    return `https://www.esv.org/${encodeURIComponent(cleanRef.replace(/\s+/g, '+'))}/`;
  }
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(cleanRef)}&version=${version}`;
}
