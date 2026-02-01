import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CardCarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  label: string;
  itemsPerPage?: number;
  showPagination?: boolean;
  showNavButtons?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onItemChange?: (index: number, item: T) => void;
  className?: string;
}

export function CardCarousel<T>({
  items,
  renderItem,
  keyExtractor,
  label,
  itemsPerPage = 1,
  showPagination = true,
  showNavButtons = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  onItemChange,
  className = '',
}: CardCarouselProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const currentPage = Math.floor(currentIndex / itemsPerPage);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const goToIndex = useCallback(
    (index: number, announce = true) => {
      const newIndex = Math.max(0, Math.min(index, items.length - 1));
      setCurrentIndex(newIndex);

      if (announce) {
        setAnnouncement(
          `Showing item ${newIndex + 1} of ${items.length}`
        );
      }

      if (onItemChange && items[newIndex]) {
        onItemChange(newIndex, items[newIndex]);
      }
    },
    [items, onItemChange]
  );

  const goToNextPage = useCallback(() => {
    const nextIndex = currentIndex + itemsPerPage;
    if (nextIndex < items.length) {
      goToIndex(nextIndex);
    } else {
      goToIndex(0);
    }
  }, [currentIndex, itemsPerPage, items.length, goToIndex]);

  const goToPrevPage = useCallback(() => {
    const prevIndex = currentIndex - itemsPerPage;
    if (prevIndex >= 0) {
      goToIndex(prevIndex);
    } else {
      goToIndex(Math.max(0, items.length - itemsPerPage));
    }
  }, [currentIndex, itemsPerPage, items.length, goToIndex]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevPage();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNextPage();
          break;
        case 'Home':
          event.preventDefault();
          goToIndex(0);
          break;
        case 'End':
          event.preventDefault();
          goToIndex(items.length - 1);
          break;
      }
    },
    [goToPrevPage, goToNextPage, goToIndex, items.length]
  );

  useEffect(() => {
    if (autoPlay && !isPaused && !prefersReducedMotion) {
      autoPlayRef.current = setInterval(goToNextPage, autoPlayInterval);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [autoPlay, isPaused, prefersReducedMotion, goToNextPage, autoPlayInterval]);

  const visibleItems = items.slice(
    currentIndex,
    currentIndex + itemsPerPage
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div
        ref={containerRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg"
      >
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>

        <div
          role="group"
          aria-label={`${currentPage + 1} of ${totalPages}`}
          className={`
            grid gap-4
            ${itemsPerPage === 1 ? 'grid-cols-1' : ''}
            ${itemsPerPage === 2 ? 'grid-cols-1 sm:grid-cols-2' : ''}
            ${itemsPerPage === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : ''}
            ${itemsPerPage >= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : ''}
          `}
        >
          {visibleItems.map((item, idx) => {
            const actualIndex = currentIndex + idx;
            return (
              <div
                key={keyExtractor(item)}
                role="group"
                aria-roledescription="slide"
                aria-label={`${actualIndex + 1} of ${items.length}`}
                className={`
                  ${!prefersReducedMotion ? 'transition-opacity duration-300' : ''}
                `}
              >
                {renderItem(item, actualIndex, true)}
              </div>
            );
          })}
        </div>
      </div>

      {showNavButtons && items.length > itemsPerPage && (
        <div className="flex justify-between mt-4">
          <button
            onClick={goToPrevPage}
            aria-label="Previous items"
            disabled={currentIndex === 0 && !autoPlay}
            className="
              p-2 rounded-full
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            "
          >
            <ChevronLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>

          <button
            onClick={goToNextPage}
            aria-label="Next items"
            disabled={currentIndex >= items.length - itemsPerPage && !autoPlay}
            className="
              p-2 rounded-full
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            "
          >
            <ChevronRight size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      )}

      {showPagination && totalPages > 1 && (
        <nav
          aria-label={`${label} pagination`}
          className="flex justify-center gap-2 mt-4"
        >
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => goToIndex(i * itemsPerPage)}
              aria-label={`Go to page ${i + 1}`}
              aria-current={currentPage === i ? 'true' : undefined}
              className={`
                w-3 h-3 rounded-full
                transition-all
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                ${
                  currentPage === i
                    ? 'bg-blue-600 dark:bg-blue-400 w-6'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }
              `}
            />
          ))}
        </nav>
      )}

      {autoPlay && (
        <button
          onClick={() => setIsPaused(!isPaused)}
          aria-label={isPaused ? 'Play carousel' : 'Pause carousel'}
          className="
            absolute top-2 right-2
            p-2 rounded-full
            bg-white/80 dark:bg-gray-800/80
            hover:bg-white dark:hover:bg-gray-800
            transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          "
        >
          {isPaused ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
