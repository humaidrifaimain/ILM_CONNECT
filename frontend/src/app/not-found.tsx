import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 pattern-islamic">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-[hsl(var(--primary)/0.15)] mb-4">404</div>
        <h1 className="text-2xl font-bold mb-3">Page Not Found</h1>
        <p className="text-[hsl(var(--muted-foreground))] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let us guide you back.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="brand-button brand-button-primary">
            <Home className="h-4 w-4" /> Go Home
          </Link>

        </div>
      </div>
    </div>
  );
}
