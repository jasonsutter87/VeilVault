// ==========================================================================
// TIMELINE COMPONENT
// Audit trail and activity timeline
// ==========================================================================

import React from 'react';
import { cn } from '../../utils.js';

export type TimelineVariant = 'default' | 'compact' | 'detailed';

export interface TimelineEvent {
  /** Unique identifier */
  id: string;
  /** Event title */
  title: string;
  /** Event description */
  description?: string;
  /** Timestamp */
  timestamp: Date | string;
  /** Event type for styling */
  type?: 'info' | 'success' | 'warning' | 'error' | 'default';
  /** Custom icon */
  icon?: React.ReactNode;
  /** User who performed the action */
  user?: {
    name: string;
    avatar?: string;
  };
  /** Additional metadata */
  metadata?: Record<string, string | number>;
}

export interface TimelineProps {
  /** Timeline events */
  events: TimelineEvent[];
  /** Visual variant */
  variant?: TimelineVariant;
  /** Show connector line */
  showConnector?: boolean;
  /** Reverse order (newest first) */
  reverse?: boolean;
  /** Max events to show (with "show more" button) */
  maxEvents?: number;
  /** Show more handler */
  onShowMore?: () => void;
  /** Event click handler */
  onEventClick?: (event: TimelineEvent) => void;
  /** Custom class name */
  className?: string;
}

const typeColors: Record<'default' | 'info' | 'success' | 'warning' | 'error', { dot: string; icon: string }> = {
  default: {
    dot: 'bg-neutral-400 dark:bg-neutral-500',
    icon: 'text-neutral-500 dark:text-neutral-400',
  },
  info: {
    dot: 'bg-brand-500 dark:bg-brand-400',
    icon: 'text-brand-500 dark:text-brand-400',
  },
  success: {
    dot: 'bg-success-500 dark:bg-success-400',
    icon: 'text-success-500 dark:text-success-400',
  },
  warning: {
    dot: 'bg-warning-500 dark:bg-warning-400',
    icon: 'text-warning-500 dark:text-warning-400',
  },
  error: {
    dot: 'bg-error-500 dark:bg-error-400',
    icon: 'text-error-500 dark:text-error-400',
  },
};

// Default icons
const defaultIcons: Record<string, React.FC<{ className?: string }>> = {
  default: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <circle cx="10" cy="10" r="3" />
    </svg>
  ),
  info: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  success: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

function formatTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60000) return 'Just now';
  // Less than 1 hour
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  // Less than 1 day
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  // Less than 7 days
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  // Older than 7 days
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export const Timeline: React.FC<TimelineProps> = ({
  events,
  variant = 'default',
  showConnector = true,
  reverse = false,
  maxEvents,
  onShowMore,
  onEventClick,
  className,
}) => {
  const displayEvents = reverse ? [...events].reverse() : events;
  const visibleEvents = maxEvents ? displayEvents.slice(0, maxEvents) : displayEvents;
  const hasMore = maxEvents ? displayEvents.length > maxEvents : false;

  return (
    <div className={cn('relative', className)}>
      {/* Timeline line */}
      {showConnector && visibleEvents.length > 1 && (
        <div
          className={cn(
            'absolute left-3 top-2 bottom-2 w-0.5',
            'bg-neutral-200 dark:bg-neutral-700'
          )}
          aria-hidden="true"
        />
      )}

      {/* Events */}
      <ul className="space-y-4" role="list">
        {visibleEvents.map((event, index) => {
          const type = event.type ?? 'default';
          const colors = typeColors[type] ?? typeColors.default;
          const Icon = event.icon ? () => <>{event.icon}</> : (defaultIcons[type] ?? defaultIcons.default);

          return (
            <li
              key={event.id}
              className={cn(
                'relative flex gap-3',
                onEventClick && 'cursor-pointer'
              )}
              onClick={() => onEventClick?.(event)}
            >
              {/* Icon/dot */}
              <div
                className={cn(
                  'relative z-10 flex-shrink-0 flex items-center justify-center',
                  variant === 'compact' ? 'w-2.5 h-2.5 mt-1.5' : 'w-6 h-6',
                  variant === 'compact'
                    ? cn('rounded-full', colors.dot)
                    : cn(
                        'rounded-full bg-white dark:bg-neutral-900',
                        'border-2 border-neutral-200 dark:border-neutral-700'
                      )
                )}
              >
                {variant !== 'compact' && Icon && (
                  <Icon className={cn('w-3.5 h-3.5', colors.icon)} />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  'flex-1 min-w-0',
                  variant === 'detailed' &&
                    'bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 -mt-1'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {/* Title */}
                    <p
                      className={cn(
                        'text-sm font-medium',
                        'text-neutral-900 dark:text-neutral-100',
                        onEventClick && 'hover:text-brand-600 dark:hover:text-brand-400'
                      )}
                    >
                      {event.title}
                    </p>

                    {/* User */}
                    {event.user && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {event.user.avatar ? (
                          <img
                            src={event.user.avatar}
                            alt=""
                            className="w-4 h-4 rounded-full"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                        )}
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {event.user.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <time
                    dateTime={
                      typeof event.timestamp === 'string'
                        ? event.timestamp
                        : event.timestamp.toISOString()
                    }
                    className="flex-shrink-0 text-xs text-neutral-400 dark:text-neutral-500"
                  >
                    {formatTimestamp(event.timestamp)}
                  </time>
                </div>

                {/* Description */}
                {event.description && variant !== 'compact' && (
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {event.description}
                  </p>
                )}

                {/* Metadata */}
                {event.metadata && variant === 'detailed' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <span
                        key={key}
                        className={cn(
                          'inline-flex items-center px-2 py-0.5',
                          'text-xs rounded',
                          'bg-neutral-100 dark:bg-neutral-700',
                          'text-neutral-600 dark:text-neutral-300'
                        )}
                      >
                        <span className="font-medium">{key}:</span>
                        <span className="ml-1">{value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Show more */}
      {hasMore && onShowMore && (
        <button
          type="button"
          onClick={onShowMore}
          className={cn(
            'mt-4 w-full py-2 text-sm font-medium',
            'text-brand-600 dark:text-brand-400',
            'hover:text-brand-700 dark:hover:text-brand-300',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20',
            'rounded-md transition-colors duration-fast'
          )}
        >
          Show {displayEvents.length - (maxEvents || 0)} more events
        </button>
      )}
    </div>
  );
};

Timeline.displayName = 'Timeline';
