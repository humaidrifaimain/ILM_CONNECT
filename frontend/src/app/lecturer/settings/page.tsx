'use client';

import { useState } from 'react';
import { Camera, Shield, Globe, Bell, CreditCard } from 'lucide-react';
import { toast } from '@/components/ui/toast';

export default function LecturerSettingsPage() {
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPayout, setIsSavingPayout] = useState(false);

  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    setTimeout(() => {
      setIsSavingProfile(false);
      toast.success('Profile Saved', 'Lecturer credentials and public profile updated successfully.');
    }, 400);
  };

  const handleSavePayout = () => {
    setIsSavingPayout(true);
    setTimeout(() => {
      setIsSavingPayout(false);
      toast.success('Payout Details Saved', 'Your banking information has been saved securely.');
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
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,50%,45%)] flex items-center justify-center text-white font-bold text-xl">SA</div>
            <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <div className="font-medium">Sheikh Ahmed Al-Farsi</div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">alfarsi@scholar.com</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1.5">Full Name</label><input type="text" defaultValue="Sheikh Ahmed Al-Farsi" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Title</label><input type="text" defaultValue="Senior Quran Instructor" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1.5">Bio</label><textarea rows={3} defaultValue="With over 15 years of experience in Quranic education..." className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Languages</label><input type="text" defaultValue="Arabic, English, Tamil" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Specializations</label><input type="text" defaultValue="Quran Recitation, Tajweed, Hifz" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1.5">Qualifications</label><textarea rows={2} defaultValue="Ijazah in Hafs, Al-Azhar University graduate" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSavingProfile ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Notifications — No SMS */}
      <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <h2 className="font-semibold mb-4">Notifications</h2>
        <div className="space-y-4">
          {[
            { label: 'Session reminders (24h & 1h before)', checked: true },
            { label: 'Email notifications for new bookings', checked: true },
            { label: 'In-app notifications', checked: true },
            { label: 'Payout notifications', checked: true },
            { label: 'Marketing & announcements', checked: false },
          ].map(n => (
            <label key={n.label} className="flex items-center justify-between"><span className="text-sm">{n.label}</span><input type="checkbox" defaultChecked={n.checked} className="h-4 w-4 rounded" /></label>
          ))}
        </div>
      </div>

      {/* Payout Method */}
      <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <h2 className="font-semibold mb-4">Payout Details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1.5">Bank Name</label><input type="text" defaultValue="Bank of Ceylon" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Account Number</label><input type="text" defaultValue="•••••••1234" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Branch</label><input type="text" defaultValue="Colombo Main" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
          <div><label className="block text-sm font-medium mb-1.5">NIC Number</label><input type="text" defaultValue="•••••V" className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
        </div>
        <button
          onClick={handleSavePayout}
          disabled={isSavingPayout}
          className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSavingPayout ? 'Updating...' : 'Update Payout Details'}
        </button>
      </div>

      {/* Security */}
      <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <h2 className="font-semibold mb-4">Security</h2>
        <div className="space-y-3">
          <button
            onClick={() => toast.info('Password Reset', 'Password change instructions have been sent to your registered email.')}
            className="w-full text-left px-4 py-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] flex items-center gap-3 transition-colors"
          >
            <Shield className="h-4 w-4 text-[hsl(var(--primary))]" /><span className="text-sm font-medium">Change Password</span>
          </button>
          <button
            onClick={() => toast.info('Two-Factor Auth', 'Authenticator setup code generated. Complete pairing in your authenticator app.')}
            className="w-full text-left px-4 py-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3"><Shield className="h-4 w-4 text-[hsl(var(--primary))]" /><span className="text-sm font-medium">Enable Two-Factor Authentication</span></div>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]">Recommended</span>
          </button>
        </div>
      </div>
    </div>
  );
}
