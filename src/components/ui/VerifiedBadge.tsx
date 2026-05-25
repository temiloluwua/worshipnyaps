import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  verified?: boolean | null;
  size?: number;
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  verified,
  size = 16,
  className = '',
}) => {
  if (!verified) return null;
  return (
    <BadgeCheck
      size={size}
      className={`inline-block text-blue-500 fill-blue-100 dark:fill-blue-900/40 flex-shrink-0 ${className}`}
      aria-label="Verified attendee"
    />
  );
};
