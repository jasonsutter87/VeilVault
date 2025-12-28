// ==========================================================================
// INTEGRITY INDICATOR
// Visual integrity status with score
// ==========================================================================

import React from 'react';
import { cn } from '../utils.js';

interface IntegrityIndicatorProps {
  score: number; // 0-100
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

function getScoreStatus(score: number): 'healthy' | 'warning' | 'error' {
  if (score >= 95) return 'healthy';
  if (score >= 80) return 'warning';
  return 'error';
}

const sizeConfig = {
  sm: { ring: 'w-12 h-12', text: 'text-xs', stroke: 3 },
  md: { ring: 'w-16 h-16', text: 'text-sm', stroke: 4 },
  lg: { ring: 'w-24 h-24', text: 'text-lg', stroke: 5 },
};

export function IntegrityIndicator({
  score,
  label = 'Integrity',
  size = 'md',
  showScore = true,
  className,
}: IntegrityIndicatorProps) {
  const status = getScoreStatus(score);
  const config = sizeConfig[size];
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const statusColors = {
    healthy: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    error: 'stroke-red-500',
  };

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className={cn('relative', config.ring)}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn('transition-all duration-500', statusColors[status])}
          />
        </svg>
        {showScore && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('font-bold', config.text)}>{score}%</span>
          </div>
        )}
      </div>
      {label && (
        <span className={cn('text-gray-600', config.text)}>{label}</span>
      )}
    </div>
  );
}
