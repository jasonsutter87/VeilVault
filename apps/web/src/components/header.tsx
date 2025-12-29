'use client';

import { Button, Input, Dropdown, DropdownItem, DropdownSeparator, cn } from '@veilvault/ui';
import { useTheme } from '@veilvault/ui';

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function CommandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

export function Header({ title, description, actions }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6">
      <div className="flex items-center justify-between h-full">
        {/* Left: Title */}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
              {description}
            </p>
          )}
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Input
              placeholder="Search... (⌘K)"
              leftIcon={<SearchIcon className="w-4 h-4" />}
              size="sm"
              className="bg-neutral-50 dark:bg-neutral-800 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {actions}

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <button
            className={cn(
              'relative p-2 rounded-lg transition-colors',
              'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
              'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
            aria-label="Notifications"
          >
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full" />
          </button>

          {/* User menu */}
          <Dropdown
            trigger={
              <button
                className={cn(
                  'flex items-center gap-2 p-1.5 rounded-lg transition-colors',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
              </button>
            }
            align="end"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">John Doe</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">john@veilvault.com</p>
            </div>
            <DropdownSeparator />
            <DropdownItem icon={<UserIcon className="w-4 h-4" />}>Profile</DropdownItem>
            <DropdownItem icon={<CommandIcon className="w-4 h-4" />}>Keyboard shortcuts</DropdownItem>
            <DropdownSeparator />
            <DropdownItem destructive>Sign out</DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
