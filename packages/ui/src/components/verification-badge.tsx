// ==========================================================================
// VERIFICATION BADGE
// Checkmark/X badge for verification status
// ==========================================================================

import React from 'react';
import { cn } from '../utils.js';

interface VerificationBadgeProps {
  verified: boolean;
  timestamp?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 'w-4 h-4', text: 'text-xs', container: 'gap-1' },
  md: { icon: 'w-5 h-5', text: 'text-sm', container: 'gap-1.5' },
  lg: { icon: 'w-6 h-6', text: 'text-base', container: 'gap-2' },
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export function VerificationBadge({
  verified,
  timestamp,
  label,
  size = 'md',
  showLabel = true,
  className,
}: VerificationBadgeProps) {
  const config = sizeConfig[size];
  const displayLabel = label ?? (verified ? 'Verified' : 'Not Verified');

  return (
    <div
      className={cn(
        'inline-flex items-center',
        config.container,
        className
      )}
    >
      <div
        className={cn(
          'rounded-full p-1',
          verified ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        )}
      >
        {verified ? (
          <CheckIcon className={config.icon} />
        ) : (
          <XIcon className={config.icon} />
        )}
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-medium',
              config.text,
              verified ? 'text-green-700' : 'text-red-700'
            )}
          >
            {displayLabel}
          </span>
          {timestamp && (
            <span className="text-xs text-gray-500">{timestamp}</span>
          )}
        </div>
      )}
    </div>
  );
}
