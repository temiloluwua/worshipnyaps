// Build an iCalendar (.ics) string for one event and trigger a share or
// download in a way that works in browsers, the Capacitor WebView on iOS,
// and Android. iOS handles `data:text/calendar` URLs by opening the
// Calendar app's "Add Event" sheet — no native plugin required.

interface IcsEvent {
  id: string;
  title: string;
  date: string;     // YYYY-MM-DD
  time: string;     // HH:MM (24h)
  description?: string;
  durationHours?: number;
  locationName?: string;
  locationAddress?: string;
}

function pad(n: number): string { return n.toString().padStart(2, '0'); }

function toIcsDate(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildIcs(event: IcsEvent): string {
  const start = new Date(`${event.date}T${event.time || '00:00'}`);
  const end = new Date(start.getTime() + (event.durationHours ?? 2) * 60 * 60 * 1000);
  const now = new Date();
  const location = [event.locationName, event.locationAddress].filter(Boolean).join(', ');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Worship N Yaps//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@worshipnyaps.com`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : '',
    location ? `LOCATION:${escapeIcs(location)}` : '',
    `URL:https://worshipnyaps.com/event/${event.id}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export async function shareIcs(event: IcsEvent): Promise<void> {
  const ics = buildIcs(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });

  // Prefer the native share sheet on iOS/Android — lets the user pick
  // Calendar, Mail, AirDrop, etc. Falls back to download on desktop.
  if (typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
    try {
      const file = new File([blob], `${event.title.replace(/[^a-z0-9]/gi, '_') || 'event'}.ics`, {
        type: 'text/calendar',
      });
      // Some browsers reject canShare on files — fall through to download.
      if ((navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }).canShare?.({ files: [file] })) {
        await (navigator as Navigator & { share: (data: { files: File[]; title?: string }) => Promise<void> }).share({
          files: [file],
          title: event.title,
        });
        return;
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        // fall through to download
      } else {
        return;
      }
    }
  }

  // Fallback: trigger a download. Most desktop browsers and the iOS
  // WebView will open the ICS in Calendar after the download lands.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, '_') || 'event'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
