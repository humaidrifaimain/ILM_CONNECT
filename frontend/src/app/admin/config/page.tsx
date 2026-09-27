'use client';

import { Save } from 'lucide-react';

export default function AdminConfigPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuration</h1>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#095F46] hover:bg-[#074c38] shadow-sm transition-all">
          <Save className="h-4 w-4" /> Save All
        </button>
      </div>

      {/* Pricing — Noorani Qaida */}
      <div className="p-6 rounded-xl border border-stone-200/90 bg-white shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-stone-950">Beginner: Noorani Qaida Pricing (USD/month)</h2>
          <span className="text-xs font-mono text-[#095F46] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">8 or 12 sessions</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Standard Plan (2 / week · 8 sessions)</label>
            <input type="number" defaultValue={59} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#095F46]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#095F46] uppercase tracking-wider mb-1.5">Fast Track Plan (3 / week · 12 sessions)</label>
            <input type="number" defaultValue={89} className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/20 text-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#095F46]" />
          </div>
        </div>
      </div>

      {/* Pricing — Tajweed Quran Recitation */}
      <div className="p-6 rounded-xl border-2 border-[#095F46]/30 bg-white shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-stone-950">Intermediate: Tajweed Recitation Pricing (USD/month)</h2>
          <span className="text-xs font-bold text-white bg-[#095F46] px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px]">Popular</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Standard Plan (2 / week · 8 sessions)</label>
            <input type="number" defaultValue={59} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#095F46]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#095F46] uppercase tracking-wider mb-1.5">Fast Track Plan (3 / week · 12 sessions)</label>
            <input type="number" defaultValue={89} className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/20 text-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#095F46]" />
          </div>
        </div>
      </div>

      {/* Pricing — Hifz Memorization */}
      <div className="p-6 rounded-xl border border-stone-200/90 bg-white shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-stone-950">Advanced: Hifz Memorization Pricing (USD/month)</h2>
          <span className="text-xs font-mono text-[#095F46] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">8 or 12 sessions</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Standard Plan (2 / week · 8 sessions)</label>
            <input type="number" defaultValue={59} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#095F46]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#095F46] uppercase tracking-wider mb-1.5">Fast Track Plan (3 / week · 12 sessions)</label>
            <input type="number" defaultValue={89} className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/20 text-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#095F46]" />
          </div>
        </div>
      </div>

      {/* Session Rules */}
      <div className="p-6 rounded-xl border border-stone-200/90 bg-white shadow-xs">
        <h2 className="font-semibold mb-4 text-stone-950">Session & Scheduling Rules</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-stone-700">Session Duration (minutes)</label>
            <input type="number" defaultValue={45} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#095F46]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-stone-700">Standard Plan Sessions (monthly)</label>
            <input type="number" defaultValue={8} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#095F46]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#095F46]">Fast Track Sessions (monthly)</label>
            <input type="number" defaultValue={12} className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#095F46]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-stone-700">Min Gap Between Sessions (days)</label>
            <input type="number" defaultValue={2} className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#095F46]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Free Reschedule Window (hours)</label>
            <input type="number" defaultValue={12} className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Min Booking Lead Time (hours)</label>
            <input type="number" defaultValue={12} className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Lecturer Rate per Session (LKR)</label>
            <input type="number" defaultValue={1250} className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Payout Cycle</label>
            <select className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
              <option>Bi-weekly</option><option>Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Payment Processing Fee (%)</label>
            <input type="number" defaultValue={3} step={0.1} className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" />
          </div>
        </div>
      </div>
    </div>
  );
}
