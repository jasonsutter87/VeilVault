// ==========================================================================
// RISK HEAT MAP COMPONENT
// 5x5 likelihood/impact matrix visualization
// ==========================================================================

import React from 'react';
import { cn } from '../../utils.js';

// Risk levels
type LikelihoodLevel = 1 | 2 | 3 | 4 | 5;
type ImpactLevel = 1 | 2 | 3 | 4 | 5;

export interface RiskHeatMapCell {
  likelihood: LikelihoodLevel;
  impact: ImpactLevel;
  score: number;
  color: 'green' | 'yellow' | 'orange' | 'red';
  riskCount: number;
}

export interface RiskHeatMapProps {
  /** Heat map data (5x5 matrix) */
  data: RiskHeatMapCell[][];
  /** Cell click handler */
  onCellClick?: (cell: RiskHeatMapCell) => void;
  /** Currently selected cell */
  selectedCell?: { likelihood: LikelihoodLevel; impact: ImpactLevel } | null;
  /** Show risk counts in cells */
  showCounts?: boolean;
  /** Show cell scores */
  showScores?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const impactLabels = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

const colorClasses: Record<'green' | 'yellow' | 'orange' | 'red', { bg: string; text: string; hover: string; border: string }> = {
  green: {
    bg: 'bg-success-100 dark:bg-success-900/30',
    text: 'text-success-700 dark:text-success-300',
    hover: 'hover:bg-success-200 dark:hover:bg-success-900/50',
    border: 'border-success-300 dark:border-success-700',
  },
  yellow: {
    bg: 'bg-warning-100 dark:bg-warning-900/30',
    text: 'text-warning-700 dark:text-warning-300',
    hover: 'hover:bg-warning-200 dark:hover:bg-warning-900/50',
    border: 'border-warning-300 dark:border-warning-700',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    hover: 'hover:bg-orange-200 dark:hover:bg-orange-900/50',
    border: 'border-orange-300 dark:border-orange-700',
  },
  red: {
    bg: 'bg-error-100 dark:bg-error-900/30',
    text: 'text-error-700 dark:text-error-300',
    hover: 'hover:bg-error-200 dark:hover:bg-error-900/50',
    border: 'border-error-300 dark:border-error-700',
  },
};

const sizeClasses = {
  sm: {
    cell: 'w-12 h-12 text-xs',
    label: 'text-xs',
    gap: 'gap-0.5',
  },
  md: {
    cell: 'w-16 h-16 text-sm',
    label: 'text-xs',
    gap: 'gap-1',
  },
  lg: {
    cell: 'w-20 h-20 text-base',
    label: 'text-sm',
    gap: 'gap-1.5',
  },
};

export const RiskHeatMap: React.FC<RiskHeatMapProps> = ({
  data,
  onCellClick,
  selectedCell,
  showCounts = true,
  showScores = false,
  size = 'md',
  className,
}) => {
  const sizeClass = sizeClasses[size];

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Impact header */}
      <div className={cn('flex ml-20', sizeClass.gap)}>
        {impactLabels.map((label, i) => (
          <div
            key={i}
            className={cn(
              sizeClass.cell,
              'flex items-end justify-center pb-1',
              'text-neutral-500 dark:text-neutral-400 font-medium',
              sizeClass.label
            )}
          >
            <span className="truncate transform -rotate-45 origin-bottom-left">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Likelihood labels */}
        <div className={cn('flex flex-col justify-around w-20', sizeClass.gap)}>
          {likelihoodLabels.reverse().map((label, i) => (
            <div
              key={i}
              className={cn(
                sizeClass.cell,
                'flex items-center justify-end pr-2',
                'text-neutral-500 dark:text-neutral-400 font-medium',
                sizeClass.label
              )}
            >
              <span className="truncate text-right">{label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className={cn('flex flex-col', sizeClass.gap)}>
          {data.map((row, rowIndex) => (
            <div key={rowIndex} className={cn('flex', sizeClass.gap)}>
              {row.map((cell) => {
                const isSelected =
                  selectedCell?.likelihood === cell.likelihood &&
                  selectedCell?.impact === cell.impact;
                const colors = colorClasses[cell.color];

                return (
                  <button
                    key={`${cell.likelihood}-${cell.impact}`}
                    type="button"
                    onClick={() => onCellClick?.(cell)}
                    disabled={!onCellClick}
                    className={cn(
                      sizeClass.cell,
                      'flex flex-col items-center justify-center',
                      'rounded-md border-2 transition-all duration-fast',
                      colors.bg,
                      colors.text,
                      colors.border,
                      onCellClick && [colors.hover, 'cursor-pointer'],
                      !onCellClick && 'cursor-default',
                      isSelected && 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-neutral-900',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50'
                    )}
                    aria-label={`Likelihood: ${cell.likelihood}, Impact: ${cell.impact}, ${cell.riskCount} risks`}
                  >
                    {showScores && (
                      <span className="font-bold">{cell.score}</span>
                    )}
                    {showCounts && cell.riskCount > 0 && (
                      <span
                        className={cn(
                          'font-semibold',
                          showScores && 'text-xs'
                        )}
                      >
                        {cell.riskCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Axis labels */}
      <div className="flex justify-between mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        <span className="ml-20">← Lower Impact</span>
        <span>Higher Impact →</span>
      </div>
      <div className="flex justify-center mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        <span>Higher Likelihood ↑</span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {(['green', 'yellow', 'orange', 'red'] as const).map((color) => {
          const colorStyle = colorClasses[color];
          return (
            <div key={color} className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-4 h-4 rounded border',
                  colorStyle.bg,
                  colorStyle.border
                )}
              />
              <span className={cn('text-xs capitalize', colorStyle.text)}>
                {color === 'green' ? 'Low' : color === 'yellow' ? 'Medium' : color === 'orange' ? 'High' : 'Critical'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

RiskHeatMap.displayName = 'RiskHeatMap';

// ==========================================================================
// HELPER: Generate empty heat map data
// ==========================================================================

export function createEmptyHeatMapData(): RiskHeatMapCell[][] {
  const data: RiskHeatMapCell[][] = [];

  for (let likelihood = 5; likelihood >= 1; likelihood--) {
    const row: RiskHeatMapCell[] = [];
    for (let impact = 1; impact <= 5; impact++) {
      const score = likelihood * impact;
      let color: 'green' | 'yellow' | 'orange' | 'red';

      if (score <= 4) color = 'green';
      else if (score <= 9) color = 'yellow';
      else if (score <= 15) color = 'orange';
      else color = 'red';

      row.push({
        likelihood: likelihood as LikelihoodLevel,
        impact: impact as ImpactLevel,
        score,
        color,
        riskCount: 0,
      });
    }
    data.push(row);
  }

  return data;
}
