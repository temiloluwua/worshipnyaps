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

  return (
    <div className={includeText ? 'flex items-center gap-3' : ''}>
      <svg
        viewBox="0 0 100 100"
        className={`${sizeMap[size]} flex-shrink-0`}
        aria-label="Worship N Yaps logo"
      >
        <rect width="100" height="100" fill="#2563eb" rx={size === 'lg' ? 12 : 8} />
        <text
          x="50"
          y="65"
          fontSize="48"
          fontFamily="'Fredoka One'"
          fontWeight="700"
          textAnchor="middle"
          fill="white"
          letterSpacing="-2"
        >
          WnY
        </text>
      </svg>

      {includeText && (
        <span className={`font-logo ${textSizeMap[size]} text-blue-600 dark:text-blue-400 tracking-tight`}>
          Worship N Yaps
        </span>
      )}
    </div>
  );
};
