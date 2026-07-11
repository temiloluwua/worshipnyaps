import React from 'react';
import { openExternal } from './openExternal';

const URL_SPLIT = /(https?:\/\/[^\s]+)/g;
const IS_URL = /^https?:\/\//;

// Render message text with tappable links. Plain URLs (e.g. a shared post
// link) become clickable and open in the in-app browser instead of sitting
// there as dead text.
export function linkifyMessage(text: string, isOwn: boolean): React.ReactNode {
  if (!text) return text;
  const parts = text.split(URL_SPLIT);
  return parts.map((part, i) => {
    if (IS_URL.test(part)) {
      // strip trailing punctuation that isn't part of the URL
      const trailing = part.match(/[.,!?)]+$/)?.[0] ?? '';
      const url = trailing ? part.slice(0, -trailing.length) : part;
      return (
        <React.Fragment key={i}>
          <a
            href={url}
            onClick={(e) => { e.preventDefault(); openExternal(url); }}
            className={`underline break-all ${isOwn ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}
          >
            {url}
          </a>
          {trailing}
        </React.Fragment>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
