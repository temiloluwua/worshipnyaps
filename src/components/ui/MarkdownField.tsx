import React, { useRef } from 'react';
import { Bold, Italic, List, Link2 } from 'lucide-react';

interface MarkdownFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  className?: string;
}

// A plain textarea with a small formatting toolbar that inserts Markdown around
// the current selection. Keeps storage as plain text (Markdown) — rendered
// later by <RichText>. Friendly for non-technical hosts: they click Bold /
// Bullets / Link instead of typing syntax.
export const MarkdownField: React.FC<MarkdownFieldProps> = ({
  value, onChange, placeholder, rows = 4, id, className,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  // transform receives the selected text and returns the replacement plus where
  // to put the cursor/selection afterward (relative to the inserted text).
  const apply = (transform: (sel: string) => { text: string; selectOffset: number; selectLen: number }) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const { text, selectOffset, selectLen } = transform(selected);
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    // Restore focus + selection after React re-renders the controlled value.
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + selectOffset;
      el.setSelectionRange(pos, pos + selectLen);
    });
  };

  const wrap = (marker: string, placeholderText: string) =>
    apply((sel) => {
      const inner = sel || placeholderText;
      return { text: `${marker}${inner}${marker}`, selectOffset: marker.length, selectLen: inner.length };
    });

  const bulletize = () =>
    apply((sel) => {
      const lines = (sel || 'List item').split('\n');
      const text = lines.map((l) => (l.trim() ? `- ${l}` : l)).join('\n');
      return { text, selectOffset: 0, selectLen: text.length };
    });

  const link = () =>
    apply((sel) => {
      const label = sel || 'link text';
      const text = `[${label}](https://)`;
      // Place cursor inside the URL parens.
      return { text, selectOffset: text.length - 1, selectLen: 0 };
    });

  const btn = 'p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors';

  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <button type="button" onClick={() => wrap('**', 'bold text')} className={btn} title="Bold" aria-label="Bold"><Bold className="w-4 h-4" /></button>
        <button type="button" onClick={() => wrap('*', 'italic text')} className={btn} title="Italic" aria-label="Italic"><Italic className="w-4 h-4" /></button>
        <button type="button" onClick={bulletize} className={btn} title="Bulleted list" aria-label="Bulleted list"><List className="w-4 h-4" /></button>
        <button type="button" onClick={link} className={btn} title="Link" aria-label="Link"><Link2 className="w-4 h-4" /></button>
        <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">Formatting supported</span>
      </div>
      <textarea
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
    </div>
  );
};
