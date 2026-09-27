// ============================================
// Ilmbit — Mock Data for Development
// ============================================

export interface Lecturer {
  id: string;
  name: string;
  title: string;
  bio: string;
  specializations: string[];
  languages: string[];
  rating: number;
  reviewCount: number;
  studentsCount: number;
  sessionsCompleted: number;
  yearsExperience: number;
  avatar: string;
  status: 'active' | 'pending' | 'suspended';
  hourlyRate: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  country: string;
  timezone: string;
  tier: 'basic' | 'premium' | 'advanced';
  learningGoals: string[];
  avatar: string;
  joinedAt: string;
  sessionsCompleted: number;
  status: 'active' | 'inactive' | 'suspended';
}

export interface Session {
  id: string;
  studentId: string;
  lecturerId: string;
  studentName: string;
  lecturerName: string;
  subject: string;
  startsAt: string;
  endsAt: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'no_show_student' | 'no_show_lecturer' | 'canceled';
  zoomLink: string;
  notes?: string;
}

export interface Subscription {
  id: string;
  studentId: string;
  tier: 'basic' | 'premium' | 'advanced';
  status: 'active' | 'canceled' | 'past_due';
  amountLKR: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  isTrial?: boolean;
}

export interface Payout {
  id: string;
  lecturerId: string;
  amountLKR: number;
  sessionsCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  initiatedAt: string;
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ip: string;
  createdAt: string;
}

export interface AdminRequest {
  id: string;
  type: 'lecturer_change' | 'new_assignment';
  studentId: string;
  studentName: string;
  courseName: string;
  reason?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface SessionFeedback {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  lecturerId: string;
  lecturerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export const lecturers: Lecturer[] = [
  {
    id: 'l1',
    name: 'Sheikh Ahmed Al-Farsi',
    title: 'Senior Quran Instructor',
    bio: 'With over 15 years of experience in Quranic education, Sheikh Ahmed has guided hundreds of students through their journey of Quran recitation and memorization. He holds an Ijazah in Hafs and specializes in Tajweed correction for non-Arabic speakers.',
    specializations: ['Quran Recitation', 'Tajweed', 'Hifz'],
    languages: ['Arabic', 'English', 'Tamil'],
    rating: 4.9,
    reviewCount: 127,
    studentsCount: 45,
    sessionsCompleted: 1240,
    yearsExperience: 15,
    avatar: '',
    status: 'active',
    hourlyRate: 1250,
  },
  {
    id: 'l2',
    name: 'Maulavi Ismail Rahman',
    title: 'Hadith & Fiqh Scholar',
    bio: 'Maulavi Ismail graduated from the Jamia Naleemiah in Colombo and completed advanced studies in Hadith sciences at Al-Azhar University. He brings a unique perspective combining classical scholarship with modern pedagogical methods.',
    specializations: ['Hadith', 'Fiqh', 'Islamic History'],
    languages: ['Arabic', 'English', 'Sinhala', 'Tamil'],
    rating: 4.8,
    reviewCount: 89,
    studentsCount: 32,
    sessionsCompleted: 890,
    yearsExperience: 12,
    avatar: '',
    status: 'active',
    hourlyRate: 1250,
  },
  {
    id: 'l3',
    name: 'Ustadha Fatima Noor',
    title: 'Arabic Language Specialist',
    bio: 'Ustadha Fatima is a certified Arabic language instructor with a Masters in Arabic Linguistics. She specializes in teaching Arabic to non-native speakers using immersive methodology and has developed a unique curriculum for diaspora Muslims.',
    specializations: ['Arabic Language', 'Quran Recitation', 'Aqeedah'],
    languages: ['Arabic', 'English'],
    rating: 4.95,
    reviewCount: 156,
    studentsCount: 52,
    sessionsCompleted: 1560,
    yearsExperience: 10,
    avatar: '',
    status: 'active',
    hourlyRate: 1250,
  },
  {
    id: 'l4',
    name: 'Maulavi Yusuf Kareem',
    title: 'Quran Memorization Coach',
    bio: 'Hafiz Yusuf completed his Hifz at age 14 and has been teaching Quran memorization techniques for over 8 years. He uses structured memorization schedules and revision techniques designed for students with busy schedules.',
    specializations: ['Hifz', 'Quran Recitation', 'Tajweed'],
    languages: ['Arabic', 'English', 'Tamil'],
    rating: 4.7,
    reviewCount: 73,
    studentsCount: 28,
    sessionsCompleted: 670,
    yearsExperience: 8,
    avatar: '',
    status: 'active',
    hourlyRate: 1250,
  },
  {
    id: 'l5',
    name: 'Sheikh Muhammad Ashraf',
    title: 'Islamic Jurisprudence Expert',
    bio: 'Sheikh Ashraf is a graduate of the Islamic University of Madinah with specialization in comparative Fiqh. He has authored three books on practical Fiqh for Muslims living in Western countries and regularly conducts workshops on contemporary Islamic issues.',
    specializations: ['Fiqh', 'Aqeedah', 'Islamic Law'],
    languages: ['Arabic', 'English', 'Sinhala'],
    rating: 4.85,
    reviewCount: 94,
    studentsCount: 38,
    sessionsCompleted: 1100,
    yearsExperience: 18,
    avatar: '',
    status: 'active',
    hourlyRate: 1250,
  },
];

export const students: Student[] = [
  { id: 's1', name: 'Aisha Khan', email: 'aisha@example.com', country: 'United Kingdom', timezone: 'Europe/London', tier: 'premium', learningGoals: ['Quran Recitation', 'Tajweed'], avatar: '', joinedAt: '2024-09-15', sessionsCompleted: 32, status: 'active' },
  { id: 's2', name: 'Omar Malik', email: 'omar@example.com', country: 'Australia', timezone: 'Australia/Sydney', tier: 'basic', learningGoals: ['Hifz'], avatar: '', joinedAt: '2024-10-01', sessionsCompleted: 24, status: 'active' },
  { id: 's3', name: 'Fatima Hassan', email: 'fatima@example.com', country: 'Germany', timezone: 'Europe/Berlin', tier: 'advanced', learningGoals: ['Hadith', 'Fiqh'], avatar: '', joinedAt: '2024-08-20', sessionsCompleted: 48, status: 'active' },
  { id: 's4', name: 'Yusuf Ali', email: 'yusuf@example.com', country: 'Canada', timezone: 'America/Toronto', tier: 'premium', learningGoals: ['Arabic Language'], avatar: '', joinedAt: '2024-11-05', sessionsCompleted: 16, status: 'active' },
  { id: 's5', name: 'Maryam Saleem', email: 'maryam@example.com', country: 'UAE', timezone: 'Asia/Dubai', tier: 'basic', learningGoals: ['Quran Recitation'], avatar: '', joinedAt: '2024-12-01', sessionsCompleted: 8, status: 'active' },
  { id: 's6', name: 'Ibrahim Noor', email: 'ibrahim@example.com', country: 'Saudi Arabia', timezone: 'Asia/Riyadh', tier: 'advanced', learningGoals: ['Fiqh', 'Aqeedah'], avatar: '', joinedAt: '2024-07-10', sessionsCompleted: 56, status: 'active' },
  { id: 's7', name: 'Zainab Patel', email: 'zainab@example.com', country: 'United Kingdom', timezone: 'Europe/London', tier: 'premium', learningGoals: ['Hifz', 'Tajweed'], avatar: '', joinedAt: '2024-10-15', sessionsCompleted: 20, status: 'active' },
  { id: 's8', name: 'Ahmed Rahman', email: 'ahmed@example.com', country: 'France', timezone: 'Europe/Paris', tier: 'basic', learningGoals: ['Quran Recitation'], avatar: '', joinedAt: '2025-01-10', sessionsCompleted: 4, status: 'active' },
  { id: 's9', name: 'Khadija Osman', email: 'khadija@example.com', country: 'Netherlands', timezone: 'Europe/Amsterdam', tier: 'premium', learningGoals: ['Arabic Language', 'Quran Recitation'], avatar: '', joinedAt: '2024-09-01', sessionsCompleted: 36, status: 'active' },
  { id: 's10', name: 'Hamza Sharif', email: 'hamza@example.com', country: 'United States', timezone: 'America/New_York', tier: 'advanced', learningGoals: ['Hadith', 'Islamic History'], avatar: '', joinedAt: '2024-11-20', sessionsCompleted: 12, status: 'active' },
];

const now = new Date();
const today = now.toISOString().split('T')[0];

export const sessions: Session[] = [
  { id: 'ss1', studentId: 's1', lecturerId: 'l1', studentName: 'Aisha Khan', lecturerName: 'Sheikh Ahmed Al-Farsi', subject: 'Surah Al-Baqarah — Tajweed Review', startsAt: `${today}T14:00:00Z`, endsAt: `${today}T14:45:00Z`, status: 'scheduled', zoomLink: 'https://zoom.us/j/123456' },
  { id: 'ss2', studentId: 's2', lecturerId: 'l4', studentName: 'Omar Malik', lecturerName: 'Maulavi Yusuf Kareem', subject: 'Juz 5 Memorization', startsAt: `${today}T16:00:00Z`, endsAt: `${today}T16:45:00Z`, status: 'scheduled', zoomLink: 'https://zoom.us/j/234567' },
  { id: 'ss3', studentId: 's3', lecturerId: 'l2', studentName: 'Fatima Hassan', lecturerName: 'Maulavi Ismail Rahman', subject: 'Sahih Bukhari — Book of Prayer', startsAt: `${today}T18:00:00Z`, endsAt: `${today}T18:45:00Z`, status: 'scheduled', zoomLink: 'https://zoom.us/j/345678' },
  { id: 'ss4', studentId: 's4', lecturerId: 'l3', studentName: 'Yusuf Ali', lecturerName: 'Ustadha Fatima Noor', subject: 'Arabic Grammar — Ism & Fi\'l', startsAt: `${today}T10:00:00Z`, endsAt: `${today}T10:45:00Z`, status: 'completed', zoomLink: 'https://zoom.us/j/456789' },
  { id: 'ss5', studentId: 's5', lecturerId: 'l1', studentName: 'Maryam Saleem', lecturerName: 'Sheikh Ahmed Al-Farsi', subject: 'Surah Al-Fatiha — Beginner Recitation', startsAt: `${today}T08:00:00Z`, endsAt: `${today}T08:45:00Z`, status: 'completed', zoomLink: 'https://zoom.us/j/567890' },
  { id: 'ss6', studentId: 's6', lecturerId: 'l5', studentName: 'Ibrahim Noor', lecturerName: 'Sheikh Muhammad Ashraf', subject: 'Fiqh of Salah — Shafi\'i School', startsAt: `${today}T20:00:00Z`, endsAt: `${today}T20:45:00Z`, status: 'scheduled', zoomLink: 'https://zoom.us/j/678901' },
];

export const subscriptions: Subscription[] = [
  { id: 'sub1', studentId: 's1', tier: 'premium', status: 'active', amountLKR: 18000, currentPeriodStart: '2025-04-01', currentPeriodEnd: '2025-04-30', isTrial: true },
  { id: 'sub2', studentId: 's2', tier: 'basic', status: 'active', amountLKR: 15000, currentPeriodStart: '2025-04-01', currentPeriodEnd: '2025-04-30' },
  { id: 'sub3', studentId: 's3', tier: 'advanced', status: 'active', amountLKR: 20000, currentPeriodStart: '2025-04-01', currentPeriodEnd: '2025-04-30' },
  { id: 'sub4', studentId: 's4', tier: 'premium', status: 'active', amountLKR: 18000, currentPeriodStart: '2025-04-01', currentPeriodEnd: '2025-04-30' },
  { id: 'sub5', studentId: 's5', tier: 'basic', status: 'active', amountLKR: 15000, currentPeriodStart: '2025-04-01', currentPeriodEnd: '2025-04-30' },
  { id: 'sub6', studentId: 's6', tier: 'advanced', status: 'past_due', amountLKR: 20000, currentPeriodStart: '2025-04-01', currentPeriodEnd: '2025-04-30' },
];

export const payouts: Payout[] = [
  { id: 'p1', lecturerId: 'l1', amountLKR: 25000, sessionsCount: 20, status: 'completed', initiatedAt: '2025-04-05', completedAt: '2025-04-06' },
  { id: 'p2', lecturerId: 'l2', amountLKR: 17500, sessionsCount: 14, status: 'completed', initiatedAt: '2025-04-05', completedAt: '2025-04-06' },
  { id: 'p3', lecturerId: 'l3', amountLKR: 30000, sessionsCount: 24, status: 'processing', initiatedAt: '2025-05-05' },
  { id: 'p4', lecturerId: 'l4', amountLKR: 15000, sessionsCount: 12, status: 'pending', initiatedAt: '2025-05-05' },
  { id: 'p5', lecturerId: 'l5', amountLKR: 22500, sessionsCount: 18, status: 'completed', initiatedAt: '2025-04-05', completedAt: '2025-04-07' },
];

export const auditLogs: AuditLog[] = [
  { id: 'a1', actorId: 'admin1', actorName: 'Super Admin', action: 'USER_APPROVED', resourceType: 'lecturer', resourceId: 'l1', ip: '192.168.1.1', createdAt: '2025-04-28T10:30:00Z' },
  { id: 'a2', actorId: 's1', actorName: 'Aisha Khan', action: 'SESSION_BOOKED', resourceType: 'session', resourceId: 'ss1', ip: '82.34.21.5', createdAt: '2025-04-28T11:00:00Z' },
  { id: 'a3', actorId: 'admin1', actorName: 'Super Admin', action: 'PAYOUT_INITIATED', resourceType: 'payout', resourceId: 'p3', ip: '192.168.1.1', createdAt: '2025-04-28T12:00:00Z' },
  { id: 'a4', actorId: 's3', actorName: 'Fatima Hassan', action: 'SUBSCRIPTION_UPDATED', resourceType: 'subscription', resourceId: 'sub3', ip: '91.22.45.12', createdAt: '2025-04-28T13:15:00Z' },
  { id: 'a5', actorId: 'l2', actorName: 'Maulavi Ismail Rahman', action: 'AVAILABILITY_UPDATED', resourceType: 'availability', resourceId: 'l2', ip: '112.134.78.9', createdAt: '2025-04-28T14:30:00Z' },
  { id: 'a6', actorId: 'admin1', actorName: 'Super Admin', action: 'USER_SUSPENDED', resourceType: 'student', resourceId: 's11', ip: '192.168.1.1', createdAt: '2025-04-28T15:45:00Z' },
  { id: 'a7', actorId: 's7', actorName: 'Zainab Patel', action: 'PASSWORD_CHANGED', resourceType: 'user', resourceId: 's7', ip: '78.56.12.34', createdAt: '2025-04-28T16:00:00Z' },
  { id: 'a8', actorId: 'l1', actorName: 'Sheikh Ahmed Al-Farsi', action: 'SESSION_NOTES_ADDED', resourceType: 'session', resourceId: 'ss4', ip: '112.134.78.10', createdAt: '2025-04-28T17:00:00Z' },
];

export const mockRequests: AdminRequest[] = [
  { id: 'req1', type: 'new_assignment', studentId: 's8', studentName: 'Ahmed Rahman', courseName: 'Beginner: Noorani Qaida', status: 'pending', createdAt: '2025-04-28T09:00:00Z' },
  { id: 'req2', type: 'lecturer_change', studentId: 's1', studentName: 'Aisha Khan', courseName: 'Intermediate: Tajweed', reason: 'Scheduling conflict with current lecturer', status: 'pending', createdAt: '2025-04-27T14:30:00Z' },
];

export const mockFeedbacks: SessionFeedback[] = [
  { id: 'f1', sessionId: 'ss4', studentId: 's4', studentName: 'Yusuf Ali', lecturerId: 'l3', lecturerName: 'Ustadha Fatima Noor', rating: 5, comment: 'Ustadha Fatima was incredibly patient and explained the grammar rules very clearly. I finally understand the difference between Ism and Fi\'l!', createdAt: '2025-04-28T11:30:00Z' },
  { id: 'f2', sessionId: 'ss5', studentId: 's5', studentName: 'Maryam Saleem', lecturerId: 'l1', lecturerName: 'Sheikh Ahmed Al-Farsi', rating: 4, comment: 'Great session, but we started about 5 minutes late. Otherwise, the pronunciation tips were very helpful.', createdAt: '2025-04-28T09:15:00Z' },
  { id: 'f3', sessionId: 'ss_old1', studentId: 's2', studentName: 'Omar Malik', lecturerId: 'l4', lecturerName: 'Maulavi Yusuf Kareem', rating: 5, comment: 'Maulavi Yusuf\'s revision techniques are amazing. I memorized the whole page perfectly.', createdAt: '2025-04-25T17:00:00Z' },
  { id: 'f4', sessionId: 'ss_old2', studentId: 's1', studentName: 'Aisha Khan', lecturerId: 'l1', lecturerName: 'Sheikh Ahmed Al-Farsi', rating: 2, comment: 'The connection kept dropping on his end, and we could barely hear each other. Also felt rushed.', createdAt: '2025-04-24T15:00:00Z' },
  { id: 'f5', sessionId: 'ss_old3', studentId: 's3', studentName: 'Fatima Hassan', lecturerId: 'l2', lecturerName: 'Maulavi Ismail Rahman', rating: 5, comment: 'Excellent breakdown of the Hadith context. Very deep knowledge.', createdAt: '2025-04-22T19:30:00Z' },
];

export const courseOfferings = [
  {
    id: 'beginner-qaida',
    name: 'Beginner: Noorani Qaida',
    description: 'Fundamental course for beginners to learn the Arabic alphabet and basic pronunciation rules.',
    basicPriceUSD: 59,
    premiumPriceUSD: 89,
    basicPriceLKR: 17700,
    premiumPriceLKR: 26700,
    premiumExtras: ['12 sessions per month (3/week)', 'Faster progression', 'Session recordings (cloud stored)', 'Monthly progress report'],
    features: [
      '8 sessions per month (2/week) on Standard',
      '45-minute 1:1 sessions',
      'Qualified Arabic instructor',
      'Letter recognition and basic rules',
      'Progress tracking dashboard',
    ],
    comingSoon: false,
    isGroup: false,
  },
  {
    id: 'intermediate-tajweed',
    name: 'Intermediate: Tajweed Quran Recitation',
    description: 'Quran recitation with proper pronunciation rules (Tajweed) for intermediate learners.',
    basicPriceUSD: 59,
    premiumPriceUSD: 89,
    basicPriceLKR: 17700,
    premiumPriceLKR: 26700,
    premiumExtras: ['12 sessions per month (3/week)', 'Faster progression', 'Session recordings (cloud stored)', 'End-of-month detailed progress report'],
    features: [
      '8 sessions per month (2/week) on Standard',
      '45-minute 1:1 sessions',
      'Qualified Tajweed instructor',
      'Pronunciation correction',
      'Session scheduling flexibility',
      'In-app messaging with lecturer',
      'Progress tracking dashboard',
    ],
    comingSoon: false,
    isGroup: false,
  },
  {
    id: 'advanced-hifz',
    name: 'Advanced: Hifz',
    description: 'Advanced Quran memorization — structured memorization program with revision tracking.',
    basicPriceUSD: 59,
    premiumPriceUSD: 89,
    basicPriceLKR: 17700,
    premiumPriceLKR: 26700,
    premiumExtras: ['12 sessions per month (3/week)', 'Faster progression', 'Session recordings (cloud stored)', 'End-of-month detailed progress report'],
    features: [
      '8 sessions per month (2/week) on Standard',
      '45-minute 1:1 sessions',
      'Dedicated Hifz coach',
      'Structured memorization schedule',
      'Revision tracking',
      'In-app messaging with lecturer',
      'Progress tracking dashboard',
    ],
    comingSoon: false,
    isGroup: false,
  },
];

// Keep old pricingTiers for backward compat
export const pricingTiers = courseOfferings;

export const testimonials = [
  {
    name: 'Sarah Ahmed',
    location: 'London, UK',
    text: 'Ilmbit has been a blessing for our family. My children can now learn proper Quran recitation with a qualified teacher from the comfort of our home. The flexibility of scheduling around school hours is invaluable.',
    rating: 5,
  },
  {
    name: 'Muhammad Rashid',
    location: 'Sydney, Australia',
    text: 'As a revert to Islam, finding qualified teachers in my area was nearly impossible. Ilmbit connected me with a patient, knowledgeable scholar who has transformed my understanding of the deen.',
    rating: 5,
  },
  {
    name: 'Amina Diallo',
    location: 'Paris, France',
    text: 'The quality of teaching is exceptional. My daughter\'s Tajweed has improved dramatically in just 3 months. The progress reports help me stay involved in her learning journey.',
    rating: 5,
  },
];

// Admin dashboard stats (removed break-even and operational cost per change request 5.1)
export const adminStats = {
  totalStudents: 156,
  activeStudents: 142,
  totalLecturers: 12,
  activeLecturers: 10,
  mrrLKR: 2340000,
  mrrUSD: 7800,
  sessionsThisWeek: 312,
  sessionsToday: 48,
  churnRate: 3.2,
  avgRating: 4.85,
  pendingApplications: 3,
  paymentFailures: 2,
  revenueThisMonth: 2340000,
  payoutsThisMonth: 1560000,
  profitThisMonth: 709800,
  unassignedStudents: 1,
  lecturerChangeRequests: 1,
};

