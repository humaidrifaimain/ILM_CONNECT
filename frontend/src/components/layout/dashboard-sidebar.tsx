'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRole } from '@/lib/role-context';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import {
  BookOpen,
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
  Star,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Library,
  MessageSquare,
  Award,
  HelpCircle,
  BookCheck,
  Unlock,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
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
  { href: '/admin/requests', label: 'Requests', icon: ClipboardList, badge: '2' },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/sessions', label: 'Sessions', icon: Clock },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/admin/finance', label: 'Finance', icon: BarChart3 },
  { href: '/admin/config', label: 'Configuration', icon: Sliders },
  { href: '/admin/audit', label: 'Audit Log', icon: Shield },
];


export default function DashboardSidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  
  const isLecturerRoute = pathname.startsWith('/lecturer');
  const { data: profile } = useQuery({
    queryKey: ['profile', isLecturerRoute ? 'lecturer' : 'student'],
    queryFn: () => apiFetch(isLecturerRoute ? '/profile/lecturer' : '/profile/student'),
    enabled: !!user && (pathname.startsWith('/student') || pathname.startsWith('/lecturer')),
  });

  // Live unread message count — polls every 30s
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['unreadMessageCount'],
    queryFn: () => apiFetch('/messages/unread-count'),
    refetchInterval: 30000,
    enabled: !!user && (pathname.startsWith('/student') || pathname.startsWith('/lecturer')),
  });
  const unreadCount = unreadData?.count ?? 0;
  
  let navItems: NavItem[] = [];
  let roleName = '';
  let userName = '';
  let initials = 'AK';
  
  let adminRole = 'owner';
  try {
    const context = useRole();
    adminRole = context.role;
  } catch(e) {}

  if (pathname.startsWith('/student')) {
    roleName = 'Student';
    userName = profile?.fullName || 'Student';
    initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
    
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
    initials = profile?.fullName ? profile.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'MA';
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
    userName = adminRole === 'staff' ? 'Support Rep' : 'Super Admin';
    initials = 'AD';
  }

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-16 px-4 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(168,65%,45%)] to-[hsl(168,50%,55%)] flex-shrink-0">
          <BookOpen className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-[hsl(var(--sidebar-foreground))] tracking-tight">
            IlmConnect
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          // Show live unread count on Messages nav item
          const isMessages = item.href.endsWith('/messages');
          const displayBadge = isMessages && unreadCount > 0
            ? String(unreadCount > 99 ? '99+' : unreadCount)
            : item.badge;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]'
                  : 'text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent)/0.5)]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className="relative">
                <Icon className="h-5 w-5 flex-shrink-0" />
                {collapsed && isMessages && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9' : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {displayBadge && (
                    <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                      isMessages && unreadCount > 0
                        ? 'bg-red-500 text-white'
                        : 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
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
      <div className="border-t border-[hsl(var(--sidebar-border))] p-2 space-y-1">
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          title={collapsed ? (resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[hsl(var(--sidebar-foreground)/0.7)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent)/0.5)] transition-colors"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5 flex-shrink-0" />
          ) : (
            <Moon className="h-5 w-5 flex-shrink-0" />
          )}
          {!collapsed && <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] text-xs font-bold flex-shrink-0">
              {userName.split(' ').map(n => n[0]).join('').slice(0,2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[hsl(var(--sidebar-foreground))] truncate">{userName}</p>
              <p className="text-xs text-[hsl(var(--sidebar-foreground)/0.5)]">{roleName}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[hsl(var(--sidebar-foreground)/0.5)] hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent)/0.5)] transition-colors"
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
