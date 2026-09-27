'use client';

import { Library, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function MyCoursesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1 text-stone-950">My Courses</h1>
        <p className="text-stone-600 text-sm">
          Manage your enrolled courses.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border-2 border-[#095F46] bg-white shadow-sm relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-4">
             <span className="inline-flex items-center rounded-full bg-[#095F46]/10 px-2.5 py-0.5 text-xs font-semibold text-[#095F46]">
                Active
              </span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-lg bg-[#095F46]/10 flex items-center justify-center text-[#095F46] flex-shrink-0">
              <Library className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-950 line-clamp-1">Beginner: Noorani Qaida</h2>
              <p className="text-sm text-stone-600">Instructor: Sheikh Ahmed Al-Farsi</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-8 flex-1">
             <div>
               <div className="flex justify-between text-sm mb-1">
                 <span className="font-medium">Course Progress</span>
                 <span>30%</span>
               </div>
               <div className="w-full bg-[hsl(var(--muted))] rounded-full h-2">
                 <div className="bg-[hsl(var(--primary))] h-2 rounded-full" style={{ width: '30%' }}></div>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-auto">
             <Link href="/student/courses/beginner-qaida/materials" className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors text-sm">
                Materials <ChevronRight className="h-4 w-4" />
             </Link>
             <Link href="/student/courses/beginner-qaida/sessions/book" className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors text-[hsl(var(--foreground))] text-sm">
                Book Session
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
