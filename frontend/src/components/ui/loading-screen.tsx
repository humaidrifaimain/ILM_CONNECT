'use client';

import React from 'react';

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

      {/* Central Animated Geometric Emblem */}
      <div className="relative mb-6">
        {/* Outer rotating dashed ring */}
        <div className="h-20 w-20 rounded-full border-2 border-dashed border-[hsl(168,80%,26%/0.4)] dark:border-[hsl(168,60%,45%/0.4)] animate-[spin_12s_linear_infinite]" />

        {/* Middle reverse-spinning gradient ring */}
        <div className="absolute inset-1.5 rounded-full border-2 border-transparent border-t-[hsl(168,80%,26%)] border-r-[hsl(43,96%,56%)] animate-[spin_2.5s_linear_infinite_reverse]" />

        {/* Center glowing Islamic star/crescent icon */}
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[hsl(168,80%,26%)] to-[hsl(168,60%,38%)] flex items-center justify-center shadow-lg shadow-[hsl(168,80%,26%/0.35)]">
          <svg
            className="h-7 w-7 text-white animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Islamic 8-Point Rub el Hizb Star */}
            <path d="M12 2L15 6.5L20 6.5L18.5 11.5L22 15L17.5 17L16.5 22L12 19.5L7.5 22L6.5 17L2 15L5.5 11.5L4 6.5L9 6.5L12 2Z" fill="currentColor" fillOpacity="0.25" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
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

      {/* Three Animated Pulse Dots */}
      <div className="flex items-center gap-1.5 mt-4">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(168,80%,26%)] animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(168,80%,26%)] animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(43,96%,56%)] animate-bounce" />
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
