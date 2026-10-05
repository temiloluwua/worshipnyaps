import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { openExternal } from '../../lib/openExternal';

interface RichTextProps {
  children: string;
  className?: string;
}

// Renders user-authored Markdown (bold, bullets, numbered lists, links, line
// breaks) safely. react-markdown emits React elements — it never injects raw
// HTML — so there's no XSS surface even though the source is user content.
// GFM adds lists/autolinks; remark-breaks keeps single newlines as line breaks
// (matching how hosts type in the textarea).
export const RichText: React.FC<RichTextProps> = ({ children, className }) => {
  if (!children?.trim()) return null;
  return (
    <div className={`text-gray-600 dark:text-gray-300 leading-relaxed break-words ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{children}</h3>,
          h2: ({ children }) => <h3 className="font-bold text-base text-gray-900 dark:text-white mb-2">{children}</h3>,
          h3: ({ children }) => <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{children}</h4>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-blue-300 dark:border-blue-700 pl-3 italic text-gray-500 dark:text-gray-400 mb-3">{children}</blockquote>
          ),
          code: ({ children }) => <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[0.9em]">{children}</code>,
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => { e.preventDefault(); if (href) openExternal(href); }}
              className="text-blue-600 dark:text-blue-400 underline break-all"
              rel="noopener noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          // Images aren't supported in descriptions — render nothing.
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};
