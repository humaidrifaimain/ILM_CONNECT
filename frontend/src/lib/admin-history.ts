export interface Person {
  userId: string;
  fullName: string;
}
export interface HistoryUser {
  id: string;
  email: string;
  role: 'STUDENT' | 'LECTURER';
  status: string;
  createdAt: string;
  gender?: string;
  dateOfBirth?: string;
  deletedAt?: string;
  studentProfile?: Person & { currentTier?: string; assignedLecturer?: Person };
  lecturerProfile?: Person;
}
export interface PaymentRecord {
  id: string;
  tier: string;
  amountLkr: number;
  status: string;
  gateway: string;
  gatewayChargeId: string;
  processedAt: string;
  subscriptionId: string;
}
export interface HistoryData {
  account: HistoryUser;
  summary: Record<string, number | string[]>;
  profile: Person & {
    phone?: string;
    country?: string;
    timezone?: string;
    preferredLanguage?: string;
    learningGoals?: string;
    currentTier?: string;
    preferredHours?: number[];
    assignedLecturer?: Person;
    bio?: string;
    qualifications?: string;
    specializations?: string[];
    languages?: string[];
    hourlyAvailabilityJson?: number[];
    payoutMethod?: string;
    payoutDetails?: string;
    ratingAvg?: number;
    ratingCount?: number;
    progress?: {
      progressPercentage: number;
      currentLearningPath: { title: string };
      currentModule?: { title: string };
      currentLesson?: { title: string };
    };
    subscriptions?: {
      id: string;
      tier: string;
      status: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      lkrAmount: number;
    }[];
    certificates?: {
      id: string;
      learningPath: { title: string };
      issuedAt: string;
      performanceSummary: string;
    }[];
    courseRequests?: {
      id: string;
      learningPath: { title: string };
      status: string;
      createdAt: string;
      lecturer?: { lecturerProfile?: Person };
    }[];
    assignedStudents?: (Person & {
      currentTier: string;
      country: string;
      user: { email: string; status: string };
    })[];
    payouts?: {
      id: string;
      amountLkr: number;
      status: string;
      method: string;
      initiatedAt: string;
      completedAt?: string;
      failureReason?: string;
      sessionBlocksIncluded: string[];
    }[];
    sessionBlocks?: {
      id: string;
      student: Person;
      status: string;
      completedAt?: string;
      payoutAmountLkr: number;
      session1Id?: string;
      session2Id?: string;
    }[];
    ratingsReceived?: {
      id: string;
      student: Person;
      score: number;
      comment: string;
      createdAt: string;
    }[];
  };
  sessions: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    student: Person;
    lecturer: Person;
    rescheduledAt?: string;
    meetingStartedAt?: string;
    lesson?: { title: string; module: { learningPath: { title: string } } };
    notes?: {
      topicsCovered: string;
      homework: string;
      sharedNotes: string;
      internalNotes: string;
      studentProgressRating: number;
    };
    rating?: { score: number; comment: string };
    materials: { id: string; title: string; fileType: string }[];
  }[];
  assessments: {
    id?: string;
    reportId: string;
    title?: string;
    score?: number;
    maxScore?: number;
    feedback?: string;
    date?: string;
    reportMonth: string;
    student: Person;
    lecturer: Person;
  }[];
  reports: {
    id: string;
    periodMonth: string;
    generatedAt: string;
    student: Person;
    lecturer: Person;
    contentJson: unknown;
  }[];
  payments?: PaymentRecord[];
  authoredAssessments?: {
    id: string;
    title: string;
    createdAt: string;
    learningPath: { title: string };
  }[];
  tickets: {
    id: string;
    type: string;
    reason?: string;
    status: string;
    createdAt: string;
    resolvedAt?: string;
    messages: {
      id: string;
      senderName: string;
      senderRole: string;
      message: string;
      createdAt: string;
    }[];
  }[];
  auditLogs: {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    details: unknown;
    createdAt: string;
    actor: { email: string };
  }[];
}
