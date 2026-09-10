'use client';

import { useState } from 'react';
import { User, Mail, Globe, Clock, Bell, Shield, Camera } from 'lucide-react';
import { toast } from '@/components/ui/toast';

export default function StudentSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Settings Saved', 'Your student profile preferences have been updated.');
    }, 400);
  };
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <h2 className="font-semibold mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,50%,45%)] flex items-center justify-center text-white font-bold text-xl">AK</div>
            <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <div className="font-medium">Aisha Khan</div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">aisha@example.com</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <input type="text" defaultValue="Aisha Khan" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input type="email" defaultValue="aisha@example.com" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Country</label>
            <select className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
              <option>United Kingdom</option><option>Australia</option><option>Germany</option><option>Canada</option><option>United States</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Timezone</label>
            <select className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
              <option>Europe/London (GMT+0)</option><option>Australia/Sydney (GMT+11)</option><option>America/New_York (GMT-5)</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Notifications — SMS removed per change request 3.3 */}
      <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <h2 className="font-semibold mb-4">Notifications</h2>
        <div className="space-y-4">
          {[
            { label: 'Session reminders (24h & 1h before)', checked: true },
            { label: 'Email notifications for new materials', checked: true },
            { label: 'Monthly progress report', checked: true },
            { label: 'In-app session notifications', checked: true },
            { label: 'Marketing & announcements', checked: false },
          ].map((n) => (
            <label key={n.label} className="flex items-center justify-between">
              <span className="text-sm">{n.label}</span>
              <input type="checkbox" defaultChecked={n.checked} className="h-4 w-4 rounded" />
            </label>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <h2 className="font-semibold mb-4">Security</h2>
        <div className="space-y-3">
          <button className="w-full text-left px-4 py-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center justify-between">
            <div className="flex items-center gap-3"><Shield className="h-4 w-4 text-[hsl(var(--primary))]" /><span className="text-sm font-medium">Change Password</span></div>
          </button>
          <button className="w-full text-left px-4 py-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center justify-between">
            <div className="flex items-center gap-3"><Shield className="h-4 w-4 text-[hsl(var(--primary))]" /><span className="text-sm font-medium">Enable Two-Factor Authentication</span></div>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]">Recommended</span>
          </button>
        </div>
      </div>
    </div>
  );
}
