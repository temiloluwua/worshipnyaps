import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  includeText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', includeText = false }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const textSizeMap = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-5xl md:text-6xl',
  };

  const radiusMap = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
  };

  return (
    <div className={includeText ? 'flex items-center gap-3' : ''}>
      {/* Self-contained Yaps tile (white wordmark on its own blue square);
          just round the corners to match the app icon. */}
      <img
        src="/yaps-logo.png"
        alt="Yaps logo"
        className={`${sizeMap[size]} ${radiusMap[size]} flex-shrink-0 object-cover`}
        draggable={false}
      />

      {includeText && (
        <span className={`font-logo ${textSizeMap[size]} text-blue-600 dark:text-blue-400 tracking-tight`}>
          Worship N Yaps
        </span>
      )}
    </div>
  );
};
