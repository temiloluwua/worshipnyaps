import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface SelectProps {
  options: SelectOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  label: string;
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

export function Select({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select an option',
  multiple = false,
  searchable = false,
  disabled = false,
  error,
  helperText,
  required = false,
  className = '',
  id,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectId = id || `select-${Math.random().toString(36).slice(2)}`;
  const labelId = `${selectId}-label`;
  const listboxId = `${selectId}-listbox`;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText ? `${selectId}-helper` : undefined;

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const getSelectedLabels = () => {
    return selectedValues
      .map((v) => options.find((opt) => opt.value === v)?.label)
      .filter(Boolean)
      .join(', ');
  };

  const handleSelect = useCallback(
    (optionValue: string) => {
      const option = options.find((o) => o.value === optionValue);
      if (option?.disabled) return;

      if (multiple) {
        const newValues = selectedValues.includes(optionValue)
          ? selectedValues.filter((v) => v !== optionValue)
          : [...selectedValues, optionValue];
        onChange(newValues);
        setAnnouncement(
          selectedValues.includes(optionValue)
            ? `${option?.label} removed`
            : `${option?.label} selected`
        );
      } else {
        onChange(optionValue);
        setAnnouncement(`${option?.label} selected`);
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    },
    [multiple, onChange, options, selectedValues]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      const enabledOptions = filteredOptions.filter((o) => !o.disabled);

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setActiveIndex(0);
          } else if (activeIndex >= 0 && filteredOptions[activeIndex]) {
            handleSelect(filteredOptions[activeIndex].value);
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setActiveIndex(0);
          } else {
            setActiveIndex((prev) => {
              let next = prev + 1;
              while (next < filteredOptions.length && filteredOptions[next]?.disabled) {
                next++;
              }
              return next < filteredOptions.length ? next : prev;
            });
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (isOpen) {
            setActiveIndex((prev) => {
              let next = prev - 1;
              while (next >= 0 && filteredOptions[next]?.disabled) {
                next--;
              }
              return next >= 0 ? next : prev;
            });
          }
          break;

        case 'Home':
          event.preventDefault();
          if (isOpen) {
            const firstEnabled = filteredOptions.findIndex((o) => !o.disabled);
            setActiveIndex(firstEnabled >= 0 ? firstEnabled : 0);
          }
          break;

        case 'End':
          event.preventDefault();
          if (isOpen) {
            for (let i = filteredOptions.length - 1; i >= 0; i--) {
              if (!filteredOptions[i].disabled) {
                setActiveIndex(i);
                break;
              }
            }
          }
          break;

        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          buttonRef.current?.focus();
          break;

        case 'Tab':
          if (isOpen) {
            setIsOpen(false);
            setSearchQuery('');
          }
          break;

        default:
          if (!searchable && event.key.length === 1) {
            const char = event.key.toLowerCase();
            const matchIndex = filteredOptions.findIndex(
              (o) => !o.disabled && o.label.toLowerCase().startsWith(char)
            );
            if (matchIndex >= 0) {
              setActiveIndex(matchIndex);
              if (!isOpen) {
                setIsOpen(true);
              }
            }
          }
      }
    },
    [disabled, filteredOptions, isOpen, activeIndex, handleSelect, searchable]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listboxRef.current) {
      const activeElement = listboxRef.current.children[activeIndex] as HTMLElement;
      activeElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, activeIndex]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label
        id={labelId}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>

      <button
        ref={buttonRef}
        type="button"
        id={selectId}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={labelId}
        aria-controls={listboxId}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
        className={`
          w-full flex items-center justify-between
          px-3 py-2 rounded-lg
          border transition-colors
          text-left
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${
            error
              ? 'border-red-500 dark:border-red-400'
              : 'border-gray-300 dark:border-gray-600'
          }
          ${
            disabled
              ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
              : 'bg-white dark:bg-gray-700 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500'
          }
        `}
      >
        <span
          className={`truncate ${
            selectedValues.length
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {selectedValues.length ? getSelectedLabels() : placeholder}
        </span>
        <ChevronDown
          size={20}
          className={`
            ml-2 flex-shrink-0
            text-gray-400 dark:text-gray-500
            transition-transform
            ${isOpen ? 'rotate-180' : ''}
          `}
          aria-hidden="true"
        />
      </button>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {isOpen && (
        <div
          className="
            absolute z-50 w-full mt-1
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            max-h-60 overflow-hidden
          "
        >
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="
                    w-full pl-9 pr-8 py-2
                    bg-gray-50 dark:bg-gray-700
                    border border-gray-200 dark:border-gray-600
                    rounded-md
                    text-sm text-gray-900 dark:text-white
                    placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                  "
                  aria-label="Search options"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    aria-label="Clear search"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            aria-multiselectable={multiple}
            aria-activedescendant={
              activeIndex >= 0 ? `${selectId}-option-${activeIndex}` : undefined
            }
            className="overflow-y-auto max-h-48"
            tabIndex={-1}
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                No options found
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const isActive = activeIndex === index;

                return (
                  <li
                    key={option.value}
                    id={`${selectId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                    className={`
                      flex items-center gap-3 px-3 py-2 cursor-pointer
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                      ${isSelected && !isActive ? 'bg-gray-50 dark:bg-gray-700/50' : ''}
                      ${!isActive && !isSelected && !option.disabled ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
                    `}
                  >
                    {multiple && (
                      <span
                        className={`
                          flex-shrink-0 w-4 h-4 rounded border
                          flex items-center justify-center
                          ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300 dark:border-gray-600'
                          }
                        `}
                        aria-hidden="true"
                      >
                        {isSelected && <Check size={12} className="text-white" />}
                      </span>
                    )}

                    {option.icon && (
                      <span className="flex-shrink-0" aria-hidden="true">
                        {option.icon}
                      </span>
                    )}

                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-gray-900 dark:text-white truncate">
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                          {option.description}
                        </span>
                      )}
                    </span>

                    {!multiple && isSelected && (
                      <Check
                        size={16}
                        className="flex-shrink-0 text-blue-600 dark:text-blue-400"
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {helperText && !error && (
        <p id={helperId} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
}
