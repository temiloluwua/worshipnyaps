// Local YYYY-MM-DD for a date (NOT UTC). The admin Topic-of-the-Day schedule
// is keyed to the viewer's calendar day, matching the date-hash fallback used
// by the Topics feed and landing page.
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
