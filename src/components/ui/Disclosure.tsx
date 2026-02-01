import React, { useState, useId, useCallback, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DisclosureProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onToggle?: (isOpen: boolean) => void;
}

export function Disclosure({
  title,
  children,
  defaultOpen = false,
  disabled = false,
  className = '',
  titleClassName = '',
  contentClassName = '',
  icon,
  badge,
  onToggle,
}: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    defaultOpen ? undefined : 0
  );

  const id = useId();
  const buttonId = `disclosure-button-${id}`;
  const panelId = `disclosure-panel-${id}`;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        setContentHeight(contentRef.current.scrollHeight);
        const timer = setTimeout(() => setContentHeight(undefined), 200);
        return () => clearTimeout(timer);
      } else {
        setContentHeight(contentRef.current.scrollHeight);
        requestAnimationFrame(() => setContentHeight(0));
      }
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  }, [disabled, isOpen, onToggle]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <h3>
        <button
          id={buttonId}
          type="button"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={`
            w-full flex items-center justify-between
            px-4 py-3
            text-left font-medium
            rounded-lg
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
            ${
              disabled
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }
            ${isOpen ? 'rounded-b-none' : ''}
            ${titleClassName}
          `}
        >
          <span className="flex items-center gap-3">
            {icon && <span aria-hidden="true">{icon}</span>}
            <span className="text-gray-900 dark:text-white">{title}</span>
            {badge && <span>{badge}</span>}
          </span>
          <ChevronDown
            size={20}
            className={`
              flex-shrink-0 text-gray-500 dark:text-gray-400
              ${!prefersReducedMotion ? 'transition-transform duration-200' : ''}
              ${isOpen ? 'rotate-180' : ''}
            `}
            aria-hidden="true"
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen && contentHeight === 0}
        style={{
          height: prefersReducedMotion ? (isOpen ? 'auto' : 0) : contentHeight,
          overflow: 'hidden',
          transition: prefersReducedMotion ? 'none' : 'height 200ms ease-out',
        }}
      >
        <div ref={contentRef} className={`px-4 pb-4 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface AccordionProps {
  children: React.ReactNode;
  allowMultiple?: boolean;
  defaultIndex?: number | number[];
  className?: string;
}

interface AccordionContextValue {
  openIndices: number[];
  toggleIndex: (index: number) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export function Accordion({
  children,
  allowMultiple = false,
  defaultIndex,
  className = '',
}: AccordionProps) {
  const [openIndices, setOpenIndices] = useState<number[]>(() => {
    if (defaultIndex === undefined) return [];
    return Array.isArray(defaultIndex) ? defaultIndex : [defaultIndex];
  });

  const toggleIndex = useCallback(
    (index: number) => {
      setOpenIndices((prev) => {
        if (prev.includes(index)) {
          return prev.filter((i) => i !== index);
        }
        if (allowMultiple) {
          return [...prev, index];
        }
        return [index];
      });
    },
    [allowMultiple]
  );

  return (
    <AccordionContext.Provider value={{ openIndices, toggleIndex }}>
      <div className={`space-y-2 ${className}`}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  index: number;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function AccordionItem({
  index,
  title,
  children,
  disabled = false,
  icon,
  badge,
}: AccordionItemProps) {
  const context = React.useContext(AccordionContext);

  if (!context) {
    throw new Error('AccordionItem must be used within an Accordion');
  }

  const { openIndices, toggleIndex } = context;
  const isOpen = openIndices.includes(index);

  return (
    <Disclosure
      title={title}
      defaultOpen={isOpen}
      disabled={disabled}
      icon={icon}
      badge={badge}
      onToggle={() => toggleIndex(index)}
    >
      {children}
    </Disclosure>
  );
}
