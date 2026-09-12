'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--destructive)/0.1)] flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-8 w-8 text-[hsl(var(--destructive))]" />
        </div>
        <h1 className="text-2xl font-bold mb-3 text-[hsl(var(--foreground))]">Something Went Wrong</h1>
        <p className="text-[hsl(var(--muted-foreground))] mb-4 text-sm">
          We apologize for the inconvenience. Please try again or contact support if the problem persists.
        </p>

        {error?.message && (
          <div className="mb-6 p-3 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] font-mono break-words text-left">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[hsl(168,80%,26%)] to-[hsl(168,60%,35%)] hover:shadow-lg transition-all"
          >
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
          <Link
            href="/student/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <Home className="h-4 w-4" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
