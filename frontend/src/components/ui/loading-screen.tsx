'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

/**
 * High-aesthetic Loading Screen adhering to the site's Islamic geometric & emerald design system
 */
export function LoadingScreen({
  message = 'Loading...',
  subtitle = 'Please wait a moment while we prepare your view',
  fullScreen = false,
}: LoadingScreenProps) {
  const content = (
    <div className="relative flex flex-col items-center justify-center p-8 text-center animate-fade-in z-10 max-w-sm mx-auto">
      {/* Ambient Emerald Radial Glow */}
      <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[hsl(168,80%,26%/0.25)] via-[hsl(168,80%,26%/0.08)] to-transparent rounded-full blur-2xl pointer-events-none -z-10 animate-pulse" />

      {/* Central Animated Logo Emblem with Single Solid Rotating Ring */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Single continuous solid rotating line (no dashes or dots) */}
        <div className="h-20 w-20 rounded-full border-2 border-[hsl(168,80%,26%/0.15)] border-t-[hsl(168,80%,26%)] animate-spin" />

        {/* Center Ilm Connect Book Logo */}
        <div className="absolute inset-2.5 rounded-full bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] flex items-center justify-center shadow-lg shadow-[hsl(168,80%,26%/0.25)] transition-transform">
          <BookOpen className="h-7 w-7 text-white" strokeWidth={2.2} />
        </div>
      </div>

      {/* Title & Subtitle */}
      <h3 className="text-lg font-bold text-[hsl(var(--foreground))] tracking-tight mb-1">
        {message}
      </h3>
      {subtitle && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xs">
          {subtitle}
        </p>
      )}

      {/* Brand Watermark */}
      <div className="flex items-center gap-1 mt-3.5 opacity-85">
        <span className="text-xs font-bold tracking-tight text-gradient-primary">Ilm</span>
        <span className="text-xs font-bold tracking-tight text-[hsl(var(--foreground))]">Connect</span>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[70vh] w-full flex items-center justify-center bg-transparent">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full py-12 flex items-center justify-center">
      {content}
    </div>
  );
}

/**
 * Reusable table skeleton loader
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-sm animate-pulse p-4">
      {/* Header bar */}
      <div className="h-10 rounded-xl bg-[hsl(var(--muted)/0.7)] mb-4 w-full" />
      {/* Table rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b border-[hsl(var(--border)/0.5)] last:border-none">
            {Array.from({ length: cols }).map((_, j) => (
              <div
                key={j}
                className="h-6 rounded-lg bg-[hsl(var(--muted)/0.5)]"
                style={{ width: j === 0 ? '30%' : j === 1 ? '25%' : '15%' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Reusable card grid skeleton loader
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[hsl(var(--muted))]" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-[hsl(var(--muted))] rounded w-3/4" />
              <div className="h-3 bg-[hsl(var(--muted))] rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 bg-[hsl(var(--muted))] rounded w-full" />
            <div className="h-3 bg-[hsl(var(--muted))] rounded w-5/6" />
          </div>
          <div className="h-8 bg-[hsl(var(--muted)/0.6)] rounded-xl w-full mt-2" />
        </div>
      ))}
    </div>
  );
}
