'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Switch,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  Alert,
  cn,
} from '@veilvault/ui';
import { AppLayout } from '@/components/app-layout';
import { useTheme } from '@veilvault/ui';

// Icons
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
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

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
    </svg>
  );
}

function PaintBrushIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [auditAlerts, setAuditAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');

  return (
    <AppLayout
      title="Settings"
      description="Manage your account and preferences"
    >
      <div className="p-6">
        <Tabs defaultValue="profile" orientation="vertical">
          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <div className="w-64 flex-shrink-0">
              <TabList aria-label="Settings sections" className="flex flex-col space-y-1">
                <TabTrigger value="profile" className="justify-start">
                  <UserIcon className="w-4 h-4 mr-2" />
                  Profile
                </TabTrigger>
                <TabTrigger value="appearance" className="justify-start">
                  <PaintBrushIcon className="w-4 h-4 mr-2" />
                  Appearance
                </TabTrigger>
                <TabTrigger value="notifications" className="justify-start">
                  <BellIcon className="w-4 h-4 mr-2" />
                  Notifications
                </TabTrigger>
                <TabTrigger value="security" className="justify-start">
                  <ShieldIcon className="w-4 h-4 mr-2" />
                  Security
                </TabTrigger>
                <TabTrigger value="api" className="justify-start">
                  <KeyIcon className="w-4 h-4 mr-2" />
                  API Keys
                </TabTrigger>
                <TabTrigger value="system" className="justify-start">
                  <CogIcon className="w-4 h-4 mr-2" />
                  System
                </TabTrigger>
              </TabList>
            </div>

            {/* Content Area */}
            <div className="flex-1 max-w-2xl">
              <TabContent value="profile">
                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
                    Profile Settings
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                        <span className="text-xl font-semibold text-brand-600 dark:text-brand-400">JS</span>
                      </div>
                      <div>
                        <Button variant="outline" size="sm">Change Avatar</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          First Name
                        </label>
                        <Input defaultValue="Jane" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Last Name
                        </label>
                        <Input defaultValue="Smith" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Email
                      </label>
                      <Input type="email" defaultValue="jane.smith@company.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Role
                      </label>
                      <Input defaultValue="Senior Auditor" disabled />
                      <p className="text-xs text-neutral-500 mt-1">Contact admin to change role</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Department
                      </label>
                      <Select
                        options={[
                          { value: 'internal-audit', label: 'Internal Audit' },
                          { value: 'finance', label: 'Finance' },
                          { value: 'it', label: 'IT' },
                          { value: 'compliance', label: 'Compliance' },
                        ]}
                        defaultValue="internal-audit"
                      />
                    </div>
                    <div className="pt-4">
                      <Button variant="primary">Save Changes</Button>
                    </div>
                  </div>
                </div>
              </TabContent>

              <TabContent value="appearance">
                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
                    Appearance Settings
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                        Theme
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'light', label: 'Light' },
                          { value: 'dark', label: 'Dark' },
                          { value: 'system', label: 'System' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setTheme(opt.value as 'light' | 'dark' | 'system')}
                            className={cn(
                              'p-4 rounded-lg border-2 text-center transition-colors',
                              theme === opt.value
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                            )}
                          >
                            <span className="text-sm font-medium">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Date Format
                      </label>
                      <Select
                        options={[
                          { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                          { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                        ]}
                        defaultValue="MM/DD/YYYY"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Time Zone
                      </label>
                      <Select
                        options={[
                          { value: 'America/New_York', label: 'Eastern Time (ET)' },
                          { value: 'America/Chicago', label: 'Central Time (CT)' },
                          { value: 'America/Denver', label: 'Mountain Time (MT)' },
                          { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                          { value: 'UTC', label: 'UTC' },
                        ]}
                        defaultValue="America/New_York"
                      />
                    </div>
                  </div>
                </div>
              </TabContent>

              <TabContent value="notifications">
                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
                    Notification Preferences
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-neutral-200 dark:border-neutral-700">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Email Notifications</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive updates via email</p>
                      </div>
                      <Switch checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-neutral-200 dark:border-neutral-700">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Push Notifications</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Browser push notifications</p>
                      </div>
                      <Switch checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-neutral-200 dark:border-neutral-700">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Audit Alerts</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Alerts for audit deadlines and issues</p>
                      </div>
                      <Switch checked={auditAlerts} onChange={(e) => setAuditAlerts(e.target.checked)} />
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Weekly Digest</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Summary of weekly activity</p>
                      </div>
                      <Switch checked={weeklyDigest} onChange={(e) => setWeeklyDigest(e.target.checked)} />
                    </div>
                  </div>
                </div>
              </TabContent>

              <TabContent value="security">
                <div className="space-y-6">
                  <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
                      Security Settings
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-neutral-200 dark:border-neutral-700">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">Two-Factor Authentication</p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Add an extra layer of security</p>
                        </div>
                        <Switch checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Session Timeout (minutes)
                        </label>
                        <Select
                          options={[
                            { value: '15', label: '15 minutes' },
                            { value: '30', label: '30 minutes' },
                            { value: '60', label: '1 hour' },
                            { value: '120', label: '2 hours' },
                          ]}
                          value={sessionTimeout}
                          onChange={(e) => setSessionTimeout(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      Change Password
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Current Password
                        </label>
                        <Input type="password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          New Password
                        </label>
                        <Input type="password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Confirm New Password
                        </label>
                        <Input type="password" />
                      </div>
                      <Button variant="primary">Update Password</Button>
                    </div>
                  </div>
                </div>
              </TabContent>

              <TabContent value="api">
                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
                    API Keys
                  </h2>
                  <Alert variant="info" className="mb-6">
                    API keys allow external applications to access VeilVault data. Keep your keys secure.
                  </Alert>
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Production Key</p>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300">
                          Active
                        </span>
                      </div>
                      <code className="block p-2 bg-neutral-100 dark:bg-neutral-900 rounded text-sm font-mono text-neutral-600 dark:text-neutral-400">
                        vv_prod_****************************1234
                      </code>
                      <p className="text-xs text-neutral-500 mt-2">Created Dec 1, 2024</p>
                    </div>
                    <Button variant="outline">
                      Generate New Key
                    </Button>
                  </div>
                </div>
              </TabContent>

              <TabContent value="system">
                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
                    System Settings
                  </h2>
                  <Alert variant="warning" className="mb-6">
                    These settings affect all users in your organization. Changes require admin approval.
                  </Alert>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Default Fiscal Year End
                      </label>
                      <Select
                        options={[
                          { value: '12-31', label: 'December 31' },
                          { value: '06-30', label: 'June 30' },
                          { value: '03-31', label: 'March 31' },
                          { value: '09-30', label: 'September 30' },
                        ]}
                        defaultValue="12-31"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Default Currency
                      </label>
                      <Select
                        options={[
                          { value: 'USD', label: 'USD - US Dollar' },
                          { value: 'EUR', label: 'EUR - Euro' },
                          { value: 'GBP', label: 'GBP - British Pound' },
                          { value: 'CAD', label: 'CAD - Canadian Dollar' },
                        ]}
                        defaultValue="USD"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Data Retention Period
                      </label>
                      <Select
                        options={[
                          { value: '3', label: '3 years' },
                          { value: '5', label: '5 years' },
                          { value: '7', label: '7 years' },
                          { value: '10', label: '10 years' },
                        ]}
                        defaultValue="7"
                      />
                    </div>
                  </div>
                </div>
              </TabContent>
            </div>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
