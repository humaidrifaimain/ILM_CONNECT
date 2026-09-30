'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRole } from '@/lib/role-context';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  Clock,
  FileText,
  CreditCard,
  Settings,
  Users,
  BarChart3,
  Shield,
  Sliders,
  ClipboardList,
  DollarSign,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Library,
  MessageSquare,
  Award,
  HelpCircle,
  BookCheck,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface SupportTicketSummary {
  status: string;
}

const globalStudentNav: NavItem[] = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/courses', label: 'My Courses', icon: Library },
  { href: '/student/messages', label: 'Messages', icon: MessageSquare },
  { href: '/student/billing', label: 'Billing', icon: CreditCard },
  { href: '/student/support', label: 'Support & Help', icon: HelpCircle },
  { href: '/student/settings', label: 'Settings', icon: Settings },
];

const getCourseNav = (courseId: string): NavItem[] => [
  { href: '/student/courses', label: 'Back to My Courses', icon: ChevronLeft },
  { href: `/student/courses/${courseId}/materials`, label: 'Course Materials', icon: FileText },
  { href: `/student/courses/${courseId}/sessions`, label: 'Sessions', icon: Clock },
  { href: `/student/courses/${courseId}/sessions/book`, label: 'Book Session', icon: Calendar },
  { href: `/student/courses/${courseId}/assessments`, label: 'Assessments', icon: ClipboardList },
  { href: `/student/courses/${courseId}/feedback`, label: 'Session Feedback', icon: MessageSquare },
  { href: `/student/courses/${courseId}/awards`, label: 'Awards & Badges', icon: Award },
];

const lecturerNav: NavItem[] = [
  { href: '/lecturer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/lecturer/availability', label: 'Availability', icon: CalendarClock },
  { href: '/lecturer/sessions', label: 'Sessions', icon: Clock },
  { href: '/lecturer/courses', label: 'Courses', icon: Library },
  { href: '/lecturer/students', label: 'My Students', icon: GraduationCap },
  { href: '/lecturer/messages', label: 'Messages', icon: MessageSquare },
  { href: '/lecturer/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/lecturer/support', label: 'Support & Help', icon: HelpCircle },
  { href: '/lecturer/settings', label: 'Settings', icon: Settings },
];

const getLecturerCourseNav = (courseId: string): NavItem[] => [
  { href: '/lecturer/courses', label: 'Back to Courses', icon: ChevronLeft },
  { href: `/lecturer/courses/${courseId}`, label: 'Course Overview', icon: BookCheck },
];

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/requests', label: 'Requests', icon: ClipboardList },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/sessions', label: 'Sessions', icon: Clock },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/finance', label: 'Finance', icon: BarChart3 },
  { href: '/admin/config', label: 'Configuration', icon: Sliders },
  { href: '/admin/audit', label: 'Audit Log', icon: Shield },
];


export default function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  
  const isLecturerRoute = pathname.startsWith('/lecturer');
  const dashboardHref = pathname.startsWith('/admin') ? '/admin/dashboard' : isLecturerRoute ? '/lecturer/dashboard' : '/student/dashboard';
  const { data: profile } = useQuery({
    queryKey: ['profile', isLecturerRoute ? 'lecturer' : 'student'],
    queryFn: () => apiFetch(isLecturerRoute ? '/profile/lecturer' : '/profile/student'),
    enabled: !!user && (pathname.startsWith('/student') || pathname.startsWith('/lecturer')),
    retry: 1,
  });

  // Live unread message count — polls every 30s
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['unreadMessageCount'],
    queryFn: () => apiFetch('/messages/unread-count'),
    refetchInterval: 30000,
    enabled: !!user && (pathname.startsWith('/student') || pathname.startsWith('/lecturer')),
  });
  const unreadCount = unreadData?.count ?? 0;

  // Live admin pending requests count — polls every 30s
  const isAdminRoute = pathname.startsWith('/admin');
  const { data: adminTickets } = useQuery<SupportTicketSummary[]>({
    queryKey: ['adminSupportTickets'],
    queryFn: () => apiFetch('/support/tickets'),
    enabled: !!user && isAdminRoute,
    refetchInterval: 30000,
  });
  const pendingRequestsCount = adminTickets?.filter(
    (ticket) => ticket.status === 'PENDING' || ticket.status === 'IN_REVIEW'
  ).length ?? 0;
  
  let navItems: NavItem[] = [];
  let roleName = '';
  let userName = '';
  
  let adminRole = 'owner';
  try {
    const context = useRole();
    adminRole = context.role;
  } catch {}

  if (pathname.startsWith('/student')) {
    roleName = 'Student';
    userName = profile?.fullName || user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Muhammad Humaid';
    
    // Check if we are inside a specific course (e.g., /student/courses/beginner-qaida/...)
    const courseMatch = pathname.match(/^\/student\/courses\/([^/]+)/);
    if (courseMatch) {
      navItems = getCourseNav(courseMatch[1]);
    } else {
      navItems = globalStudentNav;
    }
  } else if (pathname.startsWith('/lecturer')) {
    roleName = 'Lecturer';
    userName = profile?.fullName || 'Maulavi Ahmed Raza';
    // Check if inside a specific lecturer course
    const lecturerCourseMatch = pathname.match(/^\/lecturer\/courses\/([^/]+)/);
    if (lecturerCourseMatch) {
      navItems = getLecturerCourseNav(lecturerCourseMatch[1]);
    } else {
      navItems = lecturerNav;
    }
  } else if (pathname.startsWith('/admin')) {
    navItems = adminRole === 'staff' 
      ? adminNav.filter(n => !['Finance', 'Configuration', 'Audit Log'].includes(n.label))
      : adminNav;
    roleName = adminRole === 'staff' ? 'Staff' : 'Administrator';
    userName = user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Administrator';
  }

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 border-r transition-all duration-300 border-[#477361] bg-[#0b3027] ${collapsed ? 'w-[68px]' : 'w-[260px]'}`}
    >
      {/* Logo */}
      <div className="flex h-20 items-center border-b px-4 border-white/10 bg-[#0b3027]">
        <Link href={dashboardHref} className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10BF8D]" aria-label={`${roleName} dashboard home`}>
          <Image
            src="/images/ilmbit-logo-white.png"
            alt="ILMBIT"
            width={collapsed ? 34 : 130}
            height={45}
            className={`${collapsed ? 'h-10' : 'h-11'} w-auto object-contain`}
          />
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-8 bg-[#0b3027]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          // Show live unread count on Messages nav item
          const isMessages = item.href.endsWith('/messages');
          const isRequests = item.href === '/admin/requests';
          let displayBadge = item.badge;
          if (isMessages && unreadCount > 0) {
            displayBadge = String(unreadCount > 99 ? '99+' : unreadCount);
          } else if (isRequests) {
            displayBadge = pendingRequestsCount > 0 ? String(pendingRequestsCount > 99 ? '99+' : pendingRequestsCount) : undefined;
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'rounded-full bg-[#10BF8D] text-[#0b3027] font-extrabold shadow-sm'
                  : 'rounded-xl text-white/80 hover:bg-white/[0.08] hover:text-white font-semibold'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-[#0b3027]' : 'text-white/70'
                }`} />
                {collapsed && isMessages && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9' : unreadCount}
                  </span>
                )}
                {collapsed && isRequests && pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {pendingRequestsCount > 9 ? '9' : pendingRequestsCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {displayBadge && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isMessages && unreadCount > 0
                        ? 'bg-red-500 text-white'
                        : isRequests && pendingRequestsCount > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-[#095F46] text-white'
                    }`}>
                      {displayBadge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t p-3 space-y-2 border-white/10 bg-[#0b3027]">
        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl border mb-1 border-white/10 bg-white/[0.06]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 bg-[#10BF8D] text-[#0b3027]">
              {userName.split(' ').map(n => n[0]).join('').slice(0,2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-white">{userName}</p>
              <p className="text-xs text-white/60">{roleName}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors text-white/60 hover:bg-white/[0.08] hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
