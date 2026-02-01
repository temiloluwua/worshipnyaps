import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  showSystemOption?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'switch';
}

export function ThemeToggle({
  showSystemOption = false,
  size = 'md',
  variant = 'button'
}: ThemeToggleProps) {
  const { theme, toggleTheme, resetToSystem, isSystemPreference, isDark } = useTheme();

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (variant === 'switch') {
    return (
      <div className="flex items-center gap-2">
        <Sun className={`${iconSizes[size]} text-amber-500 dark:text-gray-500 transition-colors`} />
        <button
          onClick={toggleTheme}
          role="switch"
          aria-checked={isDark}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors focus-visible:ring-2 focus-visible:ring-offset-2
            ${isDark
              ? 'bg-blue-600 focus-visible:ring-blue-500'
              : 'bg-gray-300 dark:bg-gray-600 focus-visible:ring-gray-500'
            }
          `}
        >
          <span className="sr-only">Toggle dark mode</span>
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white shadow-lg
              transition-transform duration-200 ease-in-out
              ${isDark ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        <Moon className={`${iconSizes[size]} text-gray-400 dark:text-blue-400 transition-colors`} />
      </div>
    );
  }

  if (showSystemOption) {
    return (
      <div
        className="flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 gap-1"
        role="radiogroup"
        aria-label="Theme selection"
      >
        <ThemeOption
          icon={<Sun className={iconSizes[size]} />}
          label="Light theme"
          isActive={theme === 'light' && !isSystemPreference}
          onClick={() => {
            const { setTheme } = useTheme();
            setTheme('light');
          }}
          sizeClass={sizeClasses[size]}
        />
        <ThemeOption
          icon={<Monitor className={iconSizes[size]} />}
          label="System theme"
          isActive={isSystemPreference}
          onClick={resetToSystem}
          sizeClass={sizeClasses[size]}
        />
        <ThemeOption
          icon={<Moon className={iconSizes[size]} />}
          label="Dark theme"
          isActive={theme === 'dark' && !isSystemPreference}
          onClick={() => {
            const { setTheme } = useTheme();
            setTheme('dark');
          }}
          sizeClass={sizeClasses[size]}
        />
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode. Currently in ${theme} mode.`}
      aria-live="polite"
      className={`
        ${sizeClasses[size]}
        rounded-lg
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        text-gray-700 dark:text-gray-300
        transition-all duration-200
        focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-gray-900
      `}
    >
      <span className="sr-only">
        {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
      <div className="relative w-5 h-5">
        <Sun
          className={`
            ${iconSizes[size]} absolute inset-0
            transition-all duration-300
            ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
          `}
          aria-hidden="true"
        />
        <Moon
          className={`
            ${iconSizes[size]} absolute inset-0
            transition-all duration-300
            ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}
          `}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}

interface ThemeOptionProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  sizeClass: string;
}

function ThemeOption({ icon, label, isActive, onClick, sizeClass }: ThemeOptionProps) {
  return (
    <button
      role="radio"
      aria-checked={isActive}
      aria-label={label}
      onClick={onClick}
      className={`
        ${sizeClass}
        rounded-md transition-all duration-200
        ${isActive
          ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }
      `}
    >
      {icon}
    </button>
  );
}
