// UTC YYYY-MM-DD. The Topic-of-the-Day rolls over at midnight UTC — the admin
// schedule (daily_topics.date) and the get_topic_of_the_day() RPC both key off
// the UTC date, so every surface agrees on "today".
export function localDateKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
