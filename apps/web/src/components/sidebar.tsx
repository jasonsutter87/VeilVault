'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@veilvault/ui';
import { useState } from 'react';

// Navigation structure based on GRC needs
const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
  },
  {
    name: 'Audit',
    icon: ClipboardIcon,
    children: [
      { name: 'Audits', href: '/audit' },
      { name: 'Workpapers', href: '/audit/workpapers' },
      { name: 'PBC Requests', href: '/audit/pbc' },
      { name: 'Evidence', href: '/audit/evidence' },
    ],
  },
  {
    name: 'Risk & Controls',
    icon: ShieldIcon,
    children: [
      { name: 'Risk Register', href: '/risk' },
      { name: 'Risk Heat Map', href: '/risk/heat-map' },
      { name: 'Controls', href: '/controls' },
      { name: 'Control Testing', href: '/controls/testing' },
      { name: 'RCM', href: '/risk/rcm' },
    ],
  },
  {
    name: 'Integrity',
    icon: LockIcon,
    children: [
      { name: 'Ledgers', href: '/integrity/ledgers' },
      { name: 'Verifications', href: '/integrity/verify' },
      { name: 'Audit Packages', href: '/integrity/packages' },
    ],
  },
  {
    name: 'Compliance',
    icon: CheckCircleIcon,
    children: [
      { name: 'SOX', href: '/compliance/sox' },
      { name: 'Issues', href: '/compliance/issues' },
      { name: 'Certifications', href: '/compliance/certifications' },
    ],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: ChartIcon,
  },
];

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
  { name: 'Help', href: '/help', icon: HelpIcon },
];

// Icons
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function HelpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}

function ChevronIcon({ className, expanded }: { className?: string; expanded: boolean }) {
  return (
    <svg
      className={cn(className, 'transition-transform duration-200', expanded && 'rotate-90')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

interface NavItemProps {
  item: typeof navigation[0];
  pathname: string;
  collapsed: boolean;
}

function NavItem({ item, pathname, collapsed }: NavItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = 'children' in item && item.children;
  const isActive = 'href' in item ? pathname === item.href : item.children?.some(child => pathname.startsWith(child.href));

  // Auto-expand if child is active
  useState(() => {
    if (hasChildren && item.children?.some(child => pathname.startsWith(child.href))) {
      setExpanded(true);
    }
  });

  if (hasChildren) {
    return (
      <li>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isActive
              ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
          )}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.name}</span>
              <ChevronIcon className="w-4 h-4" expanded={expanded} />
            </>
          )}
        </button>
        {!collapsed && expanded && (
          <ul className="mt-1 ml-8 space-y-1">
            {item.children?.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className={cn(
                    'block px-3 py-1.5 rounded-md text-sm transition-colors',
                    pathname === child.href || pathname.startsWith(child.href + '/')
                      ? 'bg-brand-50 text-brand-700 font-medium dark:bg-brand-900/20 dark:text-brand-300'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                  )}
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href!}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    </li>
  );
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white dark:bg-neutral-900',
        'border-r border-neutral-200 dark:border-neutral-800',
        'transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 h-16 px-4',
        'border-b border-neutral-200 dark:border-neutral-800'
      )}>
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">VeilVault</span>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 -mt-0.5">GRC Platform</p>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <ul className="space-y-1">
          {bottomNavigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
