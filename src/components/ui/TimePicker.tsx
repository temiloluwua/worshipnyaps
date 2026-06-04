import React, { useEffect } from 'react';

// 12-hour time picker. Stores value as 24h "HH:mm" string but displays in 12h
// (e.g. 7:30 PM). Use for any event time input across the app.
export function TwelveHourTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const parse = (v: string) => {
    if (!v) return { hour12: 7, minute: 0, period: 'PM' as 'AM' | 'PM' };
    const [hStr, mStr] = v.split(':');
    const h24 = parseInt(hStr, 10) || 0;
    const minute = parseInt(mStr, 10) || 0;
    const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    let hour12 = h24 % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, minute, period };
  };

  const { hour12, minute, period } = parse(value);

  const commit = (h12: number, m: number, p: 'AM' | 'PM') => {
    let h24 = h12 % 12;
    if (p === 'PM') h24 += 12;
    const hh = String(h24).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  // If parent passed an empty string, push the shown default ("7:30 PM" → 19:00)
  // up to parent state so the form submission has a valid time even when the
  // user never interacts with the picker.
  useEffect(() => {
    if (!value) commit(hour12, minute, period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cls = "px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm";

  return (
    <div className="flex items-center gap-1">
      <select value={hour12} onChange={(e) => commit(parseInt(e.target.value, 10), minute, period)} className={cls} aria-label="Hour">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-gray-500 dark:text-gray-400">:</span>
      <select value={minute} onChange={(e) => commit(hour12, parseInt(e.target.value, 10), period)} className={cls} aria-label="Minute">
        {[0, 15, 30, 45].map(m => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
      <select value={period} onChange={(e) => commit(hour12, minute, e.target.value as 'AM' | 'PM')} className={cls} aria-label="AM or PM">
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
