import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Loader2, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';

interface LoadMoreProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  pageSize?: number;
  loadingText?: string;
  loadMoreText?: string;
  endText?: string;
  mode?: 'button' | 'auto' | 'hybrid';
  threshold?: number;
  itemLabel?: string;
  className?: string;
  gridCols?: 1 | 2 | 3 | 4;
}

export function LoadMore<T>({
  items,
  renderItem,
  keyExtractor,
  onLoadMore,
  hasMore,
  isLoading,
  error,
  onRetry,
  pageSize = 10,
  loadingText = 'Loading more items...',
  loadMoreText = 'Load more',
  endText = 'No more items to load',
  mode = 'button',
  threshold = 200,
  itemLabel = 'item',
  className = '',
  gridCols = 1,
}: LoadMoreProps<T>) {
  const [announcement, setAnnouncement] = useState('');
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const previousItemCount = useRef(items.length);

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setAnnouncement(`Loading more ${itemLabel}s...`);

    try {
      await onLoadMore();
    } catch (err) {
      setAnnouncement(`Failed to load more ${itemLabel}s`);
    }
  }, [isLoading, hasMore, onLoadMore, itemLabel]);

  useEffect(() => {
    if (items.length > previousItemCount.current) {
      const newCount = items.length - previousItemCount.current;
      setAnnouncement(
        `Loaded ${newCount} new ${itemLabel}${newCount !== 1 ? 's' : ''}. Total: ${items.length}`
      );
    }
    previousItemCount.current = items.length;
  }, [items.length, itemLabel]);

  useEffect(() => {
    if (mode !== 'auto' && mode !== 'hybrid') return;
    if (!hasMore || isLoading) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    if (listEndRef.current) {
      observer.observe(listEndRef.current);
    }

    return () => observer.disconnect();
  }, [mode, hasMore, isLoading, threshold, handleLoadMore]);

  return (
    <div className={className}>
      <div
        role="feed"
        aria-busy={isLoading}
        aria-label={`${itemLabel} list`}
        className={`grid gap-4 ${gridClasses[gridCols]}`}
      >
        {items.map((item, index) => (
          <article
            key={keyExtractor(item)}
            aria-posinset={index + 1}
            aria-setsize={hasMore ? -1 : items.length}
            aria-label={`${itemLabel} ${index + 1}`}
          >
            {renderItem(item, index)}
          </article>
        ))}
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div
        ref={listEndRef}
        className="mt-6 flex flex-col items-center gap-4"
      >
        {isLoading && (
          <div
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
            role="status"
          >
            <Loader2
              size={20}
              className="animate-spin"
              aria-hidden="true"
            />
            <span>{loadingText}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex flex-col items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={20} aria-hidden="true" />
              <span>{error}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="
                  flex items-center gap-2 px-4 py-2
                  bg-red-100 dark:bg-red-900/40
                  hover:bg-red-200 dark:hover:bg-red-900/60
                  rounded-lg transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
                "
              >
                <RefreshCw size={16} aria-hidden="true" />
                <span>Try again</span>
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && hasMore && (mode === 'button' || mode === 'hybrid') && (
          <button
            ref={loadMoreRef}
            onClick={handleLoadMore}
            className="
              flex items-center gap-2 px-6 py-3
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              text-gray-700 dark:text-gray-300
              rounded-lg font-medium
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            "
          >
            <span>{loadMoreText}</span>
            <ChevronDown size={20} aria-hidden="true" />
          </button>
        )}

        {!hasMore && items.length > 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
            {endText}
          </p>
        )}

        {items.length === 0 && !isLoading && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No {itemLabel}s found
          </p>
        )}
      </div>

      {(mode === 'auto' || mode === 'hybrid') && (
        <p className="sr-only">
          Scroll down to load more {itemLabel}s, or use the load more button if available.
        </p>
      )}
    </div>
  );
}

interface PaginatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  itemLabel?: string;
  className?: string;
  gridCols?: 1 | 2 | 3 | 4;
}

export function PaginatedList<T>({
  items,
  renderItem,
  keyExtractor,
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  isLoading = false,
  itemLabel = 'item',
  className = '',
  gridCols = 1,
}: PaginatedListProps<T>) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const [announcement, setAnnouncement] = useState('');

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const handlePageChange = (page: number) => {
    onPageChange(page);
    setAnnouncement(`Page ${page} of ${totalPages}`);
  };

  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className={className}>
      <div
        role="region"
        aria-busy={isLoading}
        aria-label={`${itemLabel} list, page ${currentPage} of ${totalPages}`}
        className={`grid gap-4 ${gridClasses[gridCols]}`}
      >
        {items.map((item, index) => (
          <article
            key={keyExtractor(item)}
            aria-label={`${itemLabel} ${(currentPage - 1) * pageSize + index + 1}`}
          >
            {renderItem(item, index)}
          </article>
        ))}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex justify-center items-center gap-1 mt-6"
        >
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            aria-label="Previous page"
            className="
              p-2 rounded-lg
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            "
          >
            <ChevronDown size={20} className="rotate-90 text-gray-700 dark:text-gray-300" />
          </button>

          {getVisiblePages().map((page, index) =>
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-gray-400"
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                disabled={isLoading}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
                className={`
                  min-w-[40px] h-10 px-3 rounded-lg
                  font-medium transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            aria-label="Next page"
            className="
              p-2 rounded-lg
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            "
          >
            <ChevronDown size={20} className="-rotate-90 text-gray-700 dark:text-gray-300" />
          </button>
        </nav>
      )}
    </div>
  );
}
