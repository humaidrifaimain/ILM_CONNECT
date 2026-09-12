const { PrismaClient, Role, UserStatus, SessionStatus, SlotStatus, SubscriptionStatus } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const isLocal = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');
const ssl = isLocal ? false : { rejectUnauthorized: false };
const pool = new Pool({ connectionString, ssl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Starting demo data population for Lecturer Tariq (Sheikh Tariq Al-Jamil)...');

  const passwordHash = await bcrypt.hash('ilmconnect123', 10);

  // 1. Ensure or update Lecturer Tariq
  let tariq = await prisma.user.findFirst({
    where: { email: 'tariq.jamil@ilmconnect.com' },
    include: { lecturerProfile: true },
  });

  if (!tariq) {
    console.log('Creating Sheikh Tariq user...');
    tariq = await prisma.user.create({
      data: {
        email: 'tariq.jamil@ilmconnect.com',
        passwordHash,
        role: Role.LECTURER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        lecturerProfile: {
          create: {
            fullName: 'Sheikh Tariq Al-Jamil',
            bio: "Senior Islamic Scholar & Certified Qari with Ijazah in 10 Qira'at from Al-Azhar University. Over 15 years experience in Tajweed and Quranic sciences.",
            qualifications: "Ijazah in Hafs 'an Asim, M.A. in Islamic Studies (Al-Azhar), Certified Qari",
            specializations: ['Tajweed', 'Hifz Program', 'Makharij & Sifaat', 'Ten Qiraat'],
            languages: ['English', 'Arabic', 'Urdu'],
            hourlyAvailabilityJson: [10, 11, 14, 15, 16, 17],
            payoutMethod: 'bank_transfer',
            payoutDetails: 'Standard Bank - IBAN: AE070331234567890123456',
            ratingAvg: 4.95,
            ratingCount: 42,
            status: UserStatus.ACTIVE,
          },
        },
      },
      include: { lecturerProfile: true },
    });
  } else {
    console.log('Updating Sheikh Tariq profile details...');
    await prisma.lecturerProfile.upsert({
      where: { userId: tariq.id },
      create: {
        userId: tariq.id,
        fullName: 'Sheikh Tariq Al-Jamil',
        bio: "Senior Islamic Scholar & Certified Qari with Ijazah in 10 Qira'at from Al-Azhar University. Over 15 years experience in Tajweed and Quranic sciences.",
        qualifications: "Ijazah in Hafs 'an Asim, M.A. in Islamic Studies (Al-Azhar), Certified Qari",
        specializations: ['Tajweed', 'Hifz Program', 'Makharij & Sifaat', 'Ten Qiraat'],
        languages: ['English', 'Arabic', 'Urdu'],
        hourlyAvailabilityJson: [10, 11, 14, 15, 16, 17],
        payoutMethod: 'bank_transfer',
        payoutDetails: 'Standard Bank - IBAN: AE070331234567890123456',
        ratingAvg: 4.95,
        ratingCount: 42,
        status: UserStatus.ACTIVE,
      },
      update: {
        fullName: 'Sheikh Tariq Al-Jamil',
        bio: "Senior Islamic Scholar & Certified Qari with Ijazah in 10 Qira'at from Al-Azhar University. Over 15 years experience in Tajweed and Quranic sciences.",
        qualifications: "Ijazah in Hafs 'an Asim, M.A. in Islamic Studies (Al-Azhar), Certified Qari",
        specializations: ['Tajweed', 'Hifz Program', 'Makharij & Sifaat', 'Ten Qiraat'],
        languages: ['English', 'Arabic', 'Urdu'],
        ratingAvg: 4.95,
        ratingCount: 42,
      },
    });
  }

  const tariqId = tariq.id;
  console.log(`Lecturer Tariq ID: ${tariqId}`);

  // 2. Ensure Learning Paths, Modules, Lessons
  console.log('📚 Ensuring curriculum learning paths...');
  
  // A. Noorani Qaida
  let qaida = await prisma.learningPath.findFirst({ where: { title: 'Noorani Qaida' } });
  if (!qaida) {
    qaida = await prisma.learningPath.create({
      data: {
        title: 'Noorani Qaida',
        level: 'Foundation',
        difficulty: 'Beginner',
        description: 'Foundational Arabic alphabet, pronunciation, vowels, and reading skills.',
        targetAudience: 'Beginners and children starting Quran education.',
        objectives: 'Recognize letters, apply Harakat, read simple Quranic words.',
      },
    });
  }
  let qaidaModule = await prisma.module.findFirst({ where: { learningPathId: qaida.id } });
  if (!qaidaModule) {
    qaidaModule = await prisma.module.create({
      data: {
        learningPathId: qaida.id,
        title: 'Arabic Alphabet & Pronunciation',
        orderIndex: 1,
      },
    });
  }
  let qaidaLesson = await prisma.lesson.findFirst({ where: { moduleId: qaidaModule.id } });
  if (!qaidaLesson) {
    qaidaLesson = await prisma.lesson.create({
      data: {
        moduleId: qaidaModule.id,
        title: 'Alif to Khaa (Letter Forms & Articulation)',
        objectives: 'Master basic pronunciation and Makharij of initial letters',
        durationMinutes: 45,
        orderIndex: 1,
      },
    });
  }

  // B. Tajweed Mastery & Quran Recitation
  let tajweedPath = await prisma.learningPath.findFirst({ where: { title: 'Tajweed Mastery & Recitation' } });
  if (!tajweedPath) {
    tajweedPath = await prisma.learningPath.create({
      data: {
        title: 'Tajweed Mastery & Recitation',
        level: 'Intermediate',
        difficulty: 'Intermediate',
        description: 'Comprehensive study of Quranic Tajweed rules, Makharij, Sifaat, and application.',
        targetAudience: 'Students who can read Arabic and seek precise recitation.',
        objectives: 'Apply Noon Sakinah, Meem Sakinah, Madd, and Waqf rules seamlessly.',
      },
    });
  }
  let tajweedMod1 = await prisma.module.findFirst({ where: { learningPathId: tajweedPath.id, title: 'Makharij & Sifaat (Points of Articulation)' } });
  if (!tajweedMod1) {
    tajweedMod1 = await prisma.module.create({
      data: {
        learningPathId: tajweedPath.id,
        title: 'Makharij & Sifaat (Points of Articulation)',
        orderIndex: 1,
      },
    });
  }
  let tajweedMod2 = await prisma.module.findFirst({ where: { learningPathId: tajweedPath.id, title: 'Rules of Noon Sakinah & Tanween' } });
  if (!tajweedMod2) {
    tajweedMod2 = await prisma.module.create({
      data: {
        learningPathId: tajweedPath.id,
        title: 'Rules of Noon Sakinah & Tanween',
        orderIndex: 2,
      },
    });
  }
  let tajweedLesson1 = await prisma.lesson.findFirst({ where: { moduleId: tajweedMod2.id, title: 'Izhar Halqi & Idgham with Ghunnah' } });
  if (!tajweedLesson1) {
    tajweedLesson1 = await prisma.lesson.create({
      data: {
        moduleId: tajweedMod2.id,
        title: 'Izhar Halqi & Idgham with Ghunnah',
        objectives: 'Identify and apply throat letters with Izhar and resonant Idgham',
        durationMinutes: 45,
        orderIndex: 1,
      },
    });
  }
  let tajweedLesson2 = await prisma.lesson.findFirst({ where: { moduleId: tajweedMod2.id, title: 'Iqlab & Ikhfa Haqiqi with Precise Timings' } });
  if (!tajweedLesson2) {
    tajweedLesson2 = await prisma.lesson.create({
      data: {
        moduleId: tajweedMod2.id,
        title: 'Iqlab & Ikhfa Haqiqi with Precise Timings',
        objectives: 'Master the 15 letters of Ikhfa and the 2-count nasal Ghunnah',
        durationMinutes: 45,
        orderIndex: 2,
      },
    });
  }

  // C. Juz Amma Memorization & Hifz Program
  let hifzPath = await prisma.learningPath.findFirst({ where: { title: 'Juz Amma Memorization & Hifz' } });
  if (!hifzPath) {
    hifzPath = await prisma.learningPath.create({
      data: {
        title: 'Juz Amma Memorization & Hifz',
        level: 'Advanced',
        difficulty: 'Advanced',
        description: 'Systematic memorization and retention of the 30th Juz of the Noble Quran with Tajweed.',
        targetAudience: 'Students dedicated to committing Surahs to heart with melodious recitation.',
        objectives: 'Memorize Surahs An-Naba through An-Nas with flawless recall and proper stops.',
      },
    });
  }
  let hifzMod1 = await prisma.module.findFirst({ where: { learningPathId: hifzPath.id, title: 'Surah An-Naba to Al-Mutaffifin' } });
  if (!hifzMod1) {
    hifzMod1 = await prisma.module.create({
      data: {
        learningPathId: hifzPath.id,
        title: 'Surah An-Naba to Al-Mutaffifin',
        orderIndex: 1,
      },
    });
  }
  let hifzLesson1 = await prisma.lesson.findFirst({ where: { moduleId: hifzMod1.id, title: 'Surah An-Naba (Ayah 1-40) Recitation & Waqf' } });
  if (!hifzLesson1) {
    hifzLesson1 = await prisma.lesson.create({
      data: {
        moduleId: hifzMod1.id,
        title: 'Surah An-Naba (Ayah 1-40) Recitation & Waqf',
        objectives: 'Commit full Surah An-Naba to memory with attention to stopping symbols',
        durationMinutes: 45,
        orderIndex: 1,
      },
    });
  }
  let hifzLesson2 = await prisma.lesson.findFirst({ where: { moduleId: hifzMod1.id, title: "Surah An-Nazi'at Fluency & Revision" } });
  if (!hifzLesson2) {
    hifzLesson2 = await prisma.lesson.create({
      data: {
        moduleId: hifzMod1.id,
        title: "Surah An-Nazi'at Fluency & Revision",
        objectives: 'Consolidate verses 1-46 with rhythmic cadences and Qalqalah precision',
        durationMinutes: 45,
        orderIndex: 2,
      },
    });
  }

  // 3. Demo Students for Tariq
  console.log('👤 Creating/Updating Demo Students for Sheikh Tariq...');

  // Student 1: Zayd Al-Mansoor
  let zaydUser = await prisma.user.findFirst({ where: { email: 'zayd.mansoor@ilmconnect.com' } });
  if (!zaydUser) {
    zaydUser = await prisma.user.create({
      data: {
        email: 'zayd.mansoor@ilmconnect.com',
        passwordHash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        studentProfile: {
          create: {
            fullName: 'Zayd Al-Mansoor',
            phone: '+44 7700 900123',
            country: 'United Kingdom',
            timezone: 'Europe/London',
            preferredLanguage: 'English',
            learningGoals: 'Complete Juz Amma memorization with certified Tajweed and perfect Makharij',
            currentTier: 'Quran Intensive',
            assignedLecturerId: tariqId,
          },
        },
      },
    });
  } else {
    await prisma.studentProfile.upsert({
      where: { userId: zaydUser.id },
      create: {
        userId: zaydUser.id,
        fullName: 'Zayd Al-Mansoor',
        phone: '+44 7700 900123',
        country: 'United Kingdom',
        timezone: 'Europe/London',
        preferredLanguage: 'English',
        learningGoals: 'Complete Juz Amma memorization with certified Tajweed and perfect Makharij',
        currentTier: 'Quran Intensive',
        assignedLecturerId: tariqId,
      },
      update: {
        fullName: 'Zayd Al-Mansoor',
        country: 'United Kingdom',
        timezone: 'Europe/London',
        preferredLanguage: 'English',
        learningGoals: 'Complete Juz Amma memorization with certified Tajweed and perfect Makharij',
        currentTier: 'Quran Intensive',
        assignedLecturerId: tariqId,
      },
    });
  }

  // Student 2: Fatima Zahra
  let fatimaUser = await prisma.user.findFirst({ where: { email: 'fatima.zahra@ilmconnect.com' } });
  if (!fatimaUser) {
    fatimaUser = await prisma.user.create({
      data: {
        email: 'fatima.zahra@ilmconnect.com',
        passwordHash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        studentProfile: {
          create: {
            fullName: 'Fatima Zahra',
            phone: '+1 416 555 0199',
            country: 'Canada',
            timezone: 'America/Toronto',
            preferredLanguage: 'English',
            learningGoals: 'Master intermediate Tajweed rules and fluent Quran recitation',
            currentTier: 'Tajweed Mastery',
            assignedLecturerId: tariqId,
          },
        },
      },
    });
  } else {
    await prisma.studentProfile.upsert({
      where: { userId: fatimaUser.id },
      create: {
        userId: fatimaUser.id,
        fullName: 'Fatima Zahra',
        phone: '+1 416 555 0199',
        country: 'Canada',
        timezone: 'America/Toronto',
        preferredLanguage: 'English',
        learningGoals: 'Master intermediate Tajweed rules and fluent Quran recitation',
        currentTier: 'Tajweed Mastery',
        assignedLecturerId: tariqId,
      },
      update: {
        fullName: 'Fatima Zahra',
        country: 'Canada',
        timezone: 'America/Toronto',
        preferredLanguage: 'English',
        learningGoals: 'Master intermediate Tajweed rules and fluent Quran recitation',
        currentTier: 'Tajweed Mastery',
        assignedLecturerId: tariqId,
      },
    });
  }

  // Student 3: Yusuf Ibrahim
  let yusufUser = await prisma.user.findFirst({ where: { email: 'yusuf.ibrahim@ilmconnect.com' } });
  if (!yusufUser) {
    yusufUser = await prisma.user.create({
      data: {
        email: 'yusuf.ibrahim@ilmconnect.com',
        passwordHash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        studentProfile: {
          create: {
            fullName: 'Yusuf Ibrahim',
            phone: '+61 2 9876 5432',
            country: 'Australia',
            timezone: 'Australia/Sydney',
            preferredLanguage: 'English',
            learningGoals: 'Foundation Quran reading from Arabic alphabet to word joining',
            currentTier: 'Quran Basic',
            assignedLecturerId: tariqId,
          },
        },
      },
    });
  } else {
    await prisma.studentProfile.upsert({
      where: { userId: yusufUser.id },
      create: {
        userId: yusufUser.id,
        fullName: 'Yusuf Ibrahim',
        phone: '+61 2 9876 5432',
        country: 'Australia',
        timezone: 'Australia/Sydney',
        preferredLanguage: 'English',
        learningGoals: 'Foundation Quran reading from Arabic alphabet to word joining',
        currentTier: 'Quran Basic',
        assignedLecturerId: tariqId,
      },
      update: {
        fullName: 'Yusuf Ibrahim',
        country: 'Australia',
        timezone: 'Australia/Sydney',
        preferredLanguage: 'English',
        learningGoals: 'Foundation Quran reading from Arabic alphabet to word joining',
        currentTier: 'Quran Basic',
        assignedLecturerId: tariqId,
      },
    });
  }

  // 4. Subscriptions
  console.log('💳 Ensuring active subscriptions...');
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const prevMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.deleteMany({
    where: { studentId: { in: [zaydUser.id, fatimaUser.id, yusufUser.id] } },
  });

  await prisma.subscription.create({
    data: {
      studentId: zaydUser.id,
      tier: 'Quran Intensive',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: prevMonth,
      currentPeriodEnd: nextMonth,
      lkrAmount: 18000,
      fxRateApplied: 300,
    },
  });

  await prisma.subscription.create({
    data: {
      studentId: fatimaUser.id,
      tier: 'Tajweed Mastery',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: prevMonth,
      currentPeriodEnd: nextMonth,
      lkrAmount: 14000,
      fxRateApplied: 300,
    },
  });

  await prisma.subscription.create({
    data: {
      studentId: yusufUser.id,
      tier: 'Quran Basic',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: prevMonth,
      currentPeriodEnd: nextMonth,
      lkrAmount: 10000,
      fxRateApplied: 300,
    },
  });

  // 5. Student Progress
  console.log('📈 Setting student curriculum progress...');
  await prisma.studentProgress.upsert({
    where: { studentId: zaydUser.id },
    create: {
      studentId: zaydUser.id,
      currentLearningPathId: hifzPath.id,
      currentModuleId: hifzMod1.id,
      currentLessonId: hifzLesson2.id,
      progressPercentage: 75.0,
    },
    update: {
      currentLearningPathId: hifzPath.id,
      currentModuleId: hifzMod1.id,
      currentLessonId: hifzLesson2.id,
      progressPercentage: 75.0,
    },
  });

  await prisma.studentProgress.upsert({
    where: { studentId: fatimaUser.id },
    create: {
      studentId: fatimaUser.id,
      currentLearningPathId: tajweedPath.id,
      currentModuleId: tajweedMod2.id,
      currentLessonId: tajweedLesson2.id,
      progressPercentage: 55.0,
    },
    update: {
      currentLearningPathId: tajweedPath.id,
      currentModuleId: tajweedMod2.id,
      currentLessonId: tajweedLesson2.id,
      progressPercentage: 55.0,
    },
  });

  await prisma.studentProgress.upsert({
    where: { studentId: yusufUser.id },
    create: {
      studentId: yusufUser.id,
      currentLearningPathId: qaida.id,
      currentModuleId: qaidaModule.id,
      currentLessonId: qaidaLesson.id,
      progressPercentage: 35.0,
    },
    update: {
      currentLearningPathId: qaida.id,
      currentModuleId: qaidaModule.id,
      currentLessonId: qaidaLesson.id,
      progressPercentage: 35.0,
    },
  });

  // 6. Certificates
  console.log('🏆 Setting certificates...');
  await prisma.certificate.deleteMany({
    where: { studentId: { in: [zaydUser.id, fatimaUser.id, yusufUser.id] } },
  });

  await prisma.certificate.create({
    data: {
      studentId: zaydUser.id,
      learningPathId: qaida.id,
      scholarId: tariqId,
      issuedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      performanceSummary: 'Distinction in Arabic Articulation and Foundation Tajweed. Scored 98% in final oral recitation with exceptional Makharij accuracy.',
    },
  });

  // 7. Sessions, Notes, Ratings
  console.log('📅 Creating sessions, notes, and ratings for Sheikh Tariq...');
  // Clean existing sessions for these students with Tariq
  await prisma.session.deleteMany({
    where: {
      lecturerId: tariqId,
      studentId: { in: [zaydUser.id, fatimaUser.id, yusufUser.id] },
    },
  });

  // Helper to create session with notes and rating
  async function createCompletedSession({ studentId, lessonId, date, topics, homework, progressRating, sharedNotes, internalNotes, reviewComment }) {
    const sStart = new Date(date);
    const sEnd = new Date(sStart.getTime() + 45 * 60 * 1000);
    const sessionId = crypto.randomUUID();

    const session = await prisma.session.create({
      data: {
        id: sessionId,
        studentId,
        lecturerId: tariqId,
        lessonId,
        startsAt: sStart,
        endsAt: sEnd,
        status: SessionStatus.COMPLETED,
        livekitRoomName: `ilm-${sessionId}`,
      },
    });

    await prisma.sessionNotes.create({
      data: {
        sessionId,
        lecturerId: tariqId,
        topicsCovered: topics,
        homework,
        studentProgressRating: progressRating,
        sharedNotes,
        internalNotes,
      },
    });

    if (reviewComment) {
      await prisma.rating.create({
        data: {
          sessionId,
          studentId,
          lecturerId: tariqId,
          score: 5,
          comment: reviewComment,
          createdAt: new Date(sEnd.getTime() + 30 * 60 * 1000),
        },
      });
    }
  }

  // --- Zayd's Sessions ---
  // Session 1: 14 days ago
  await createCompletedSession({
    studentId: zaydUser.id,
    lessonId: hifzLesson1.id,
    date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    topics: 'Surah An-Naba: Verses 1 to 20 with focus on Noon Mushaddadah and proper stopping rules (Waqf).',
    homework: 'Memorize Ayah 21 to 40 and practice 5 times daily before next session.',
    progressRating: 5,
    sharedNotes: "Masha'Allah Zayd, your pronunciation of the letter Ayn is much clearer today! Keep using the mirror technique.",
    internalNotes: 'Student grasps concepts rapidly. Ready for advanced Madd rules next week.',
    reviewComment: "Sheikh Tariq's explanation of Makharij was very clear and easy to follow. Alhamdulillah!",
  });

  // Session 2: 10 days ago
  await createCompletedSession({
    studentId: zaydUser.id,
    lessonId: hifzLesson1.id,
    date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    topics: 'Surah An-Naba: Verses 21-40 recitation from memory, checking Ghunnah timings.',
    homework: 'Review entire Surah An-Naba and write down occurrences of Idgham in notebook.',
    progressRating: 5,
    sharedNotes: 'Flawless recitation of Ayah 30-40. Very pleased with retention and breath control.',
    internalNotes: "Memorization is rock solid. Advancing to Surah An-Nazi'at.",
    reviewComment: 'Excellent feedback and encouraging atmosphere as always.',
  });

  // Session 3: 6 days ago
  await createCompletedSession({
    studentId: zaydUser.id,
    lessonId: hifzLesson2.id,
    date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    topics: "Surah An-Nazi'at: Ayah 1-25. Practiced Madd Munfasil and Qalqalah letters (Qaf, Taa, Baa, Jeem, Dal).",
    homework: "Memorize Ayah 26-46 of Surah An-Nazi'at.",
    progressRating: 4,
    sharedNotes: 'Pay close attention to Qalqalah Kubra at the end of verses. Avoid over-bouncing.',
    internalNotes: 'Need to re-check Qalqalah on letter Baa next class.',
    reviewComment: 'The Sheikh noticed small details in my pronunciation that others missed. Great teacher!',
  });

  // Session 4: 2 days ago
  await createCompletedSession({
    studentId: zaydUser.id,
    lessonId: hifzLesson2.id,
    date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    topics: "Full recitation of Surah An-Nazi'at from memory. Assessed fluency and rhythm.",
    homework: 'Begin listening to Surah Abasa audio reciter Sheikh Al-Minshawi.',
    progressRating: 5,
    sharedNotes: 'Superb recitation today. The Qalqalah issue was completely corrected!',
    internalNotes: 'Ready for monthly assessment exam.',
    reviewComment: 'I feel my Tajweed improving every single week with Sheikh Tariq.',
  });

  // Zayd Upcoming 1 (Tomorrow at 14:00)
  const zUpcoming1 = new Date();
  zUpcoming1.setDate(zUpcoming1.getDate() + 1);
  zUpcoming1.setHours(14, 0, 0, 0);
  const zUpcoming1End = new Date(zUpcoming1.getTime() + 45 * 60 * 1000);
  await prisma.session.create({
    data: {
      studentId: zaydUser.id,
      lecturerId: tariqId,
      lessonId: hifzLesson1.id,
      startsAt: zUpcoming1,
      endsAt: zUpcoming1End,
      status: SessionStatus.SCHEDULED,
      livekitRoomName: `ilm-${crypto.randomUUID()}`,
    },
  });

  // Zayd Upcoming 2 (4 days from now at 14:00)
  const zUpcoming2 = new Date();
  zUpcoming2.setDate(zUpcoming2.getDate() + 4);
  zUpcoming2.setHours(14, 0, 0, 0);
  const zUpcoming2End = new Date(zUpcoming2.getTime() + 45 * 60 * 1000);
  await prisma.session.create({
    data: {
      studentId: zaydUser.id,
      lecturerId: tariqId,
      lessonId: hifzLesson2.id,
      startsAt: zUpcoming2,
      endsAt: zUpcoming2End,
      status: SessionStatus.SCHEDULED,
      livekitRoomName: `ilm-${crypto.randomUUID()}`,
    },
  });

  // Zayd Canceled Session
  const zCanceled = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const zCanceledId = crypto.randomUUID();
  await prisma.session.create({
    data: {
      id: zCanceledId,
      studentId: zaydUser.id,
      lecturerId: tariqId,
      lessonId: hifzLesson1.id,
      startsAt: zCanceled,
      endsAt: new Date(zCanceled.getTime() + 45 * 60 * 1000),
      status: SessionStatus.CANCELED,
    },
  });
  await prisma.sessionNotes.create({
    data: {
      sessionId: zCanceledId,
      lecturerId: tariqId,
      topicsCovered: 'Session Rescheduled - University Exam',
      homework: 'Self-study Surah An-Naba',
      studentProgressRating: 0,
      sharedNotes: 'Rescheduled upon student request due to exam conflicts.',
      internalNotes: 'Session credit retained for student.',
    },
  });

  // --- Fatima's Sessions ---
  // Session 1: 12 days ago
  await createCompletedSession({
    studentId: fatimaUser.id,
    lessonId: tajweedLesson1.id,
    date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
    topics: 'Izhar Halqi rules and the 6 throat letters: Hamzah, Haa, Ayn, Haa, Ghayn, Khaa.',
    homework: 'Identify 10 examples of Izhar Halqi in Surah Al-Mulk.',
    progressRating: 5,
    sharedNotes: 'Very clear recitation of throat letters. Excellent listening ear!',
    internalNotes: 'Strong auditory learner. Responds well to phonetic modeling.',
    reviewComment: 'Sheikh Tariq is so patient and explains everything with such clarity!',
  });

  // Session 2: 7 days ago
  await createCompletedSession({
    studentId: fatimaUser.id,
    lessonId: tajweedLesson1.id,
    date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    topics: 'Idgham with Ghunnah (Ya, Noon, Meem, Waw) vs Idgham without Ghunnah (Lam, Raa).',
    homework: 'Recite verses 1-15 of Surah Ya-Seen applying both types of Idgham.',
    progressRating: 4,
    sharedNotes: 'Remember to sustain the nasal sound for exactly 2 counts during Idgham with Ghunnah.',
    internalNotes: 'Needs slight reinforcement on Idgham without Ghunnah in connected words.',
    reviewComment: 'The best Tajweed class I have ever attended. Highly recommend Sheikh Tariq!',
  });

  // Session 3: 3 days ago
  await createCompletedSession({
    studentId: fatimaUser.id,
    lessonId: tajweedLesson2.id,
    date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    topics: 'Iqlab rule: changing Noon Sakinah into Meem with Ghunnah before letter Baa.',
    homework: 'Practice Surah Al-Humazah verses 1-9 paying attention to Iqlab.',
    progressRating: 5,
    sharedNotes: 'Perfect gentle lip touch on Iqlab. No harsh pressing of the lips.',
    internalNotes: 'Advancing smoothly through Module 2.',
    reviewComment: 'I really appreciate how thorough the Sheikh is with every single rule.',
  });

  // Fatima Upcoming (in 2 days at 16:00)
  const fUpcoming = new Date();
  fUpcoming.setDate(fUpcoming.getDate() + 2);
  fUpcoming.setHours(16, 0, 0, 0);
  await prisma.session.create({
    data: {
      studentId: fatimaUser.id,
      lecturerId: tariqId,
      lessonId: tajweedLesson2.id,
      startsAt: fUpcoming,
      endsAt: new Date(fUpcoming.getTime() + 45 * 60 * 1000),
      status: SessionStatus.SCHEDULED,
      livekitRoomName: `ilm-${crypto.randomUUID()}`,
    },
  });

  // --- Yusuf's Sessions ---
  // Session 1: 9 days ago
  await createCompletedSession({
    studentId: yusufUser.id,
    lessonId: qaidaLesson.id,
    date: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
    topics: 'Arabic Alphabet: Alif through Daal. Letter shapes and isolated pronunciation.',
    homework: 'Trace and recite letters Alif to Daal 10 times daily.',
    progressRating: 4,
    sharedNotes: 'Great effort Yusuf! Keep practicing the difference between Haa and Khaa.',
    internalNotes: 'Beginner adult student with high motivation.',
    reviewComment: 'Sheikh Tariq makes starting Arabic as an adult feel easy and stress-free.',
  });

  // Session 2: 4 days ago
  await createCompletedSession({
    studentId: yusufUser.id,
    lessonId: qaidaLesson.id,
    date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    topics: 'Arabic Alphabet: Dhaal through Yaa. Heavy letters vs light letters introduction.',
    homework: 'Listen to Qaida audio lesson 2 and repeat out loud.',
    progressRating: 4,
    sharedNotes: 'Good pronunciation of heavy letter Saad and Daad.',
    internalNotes: 'Pace is steady and consistent.',
    reviewComment: 'Wonderful teacher, very encouraging!',
  });

  // Yusuf Upcoming (in 3 days at 11:00)
  const yUpcoming = new Date();
  yUpcoming.setDate(yUpcoming.getDate() + 3);
  yUpcoming.setHours(11, 0, 0, 0);
  await prisma.session.create({
    data: {
      studentId: yusufUser.id,
      lecturerId: tariqId,
      lessonId: qaidaLesson.id,
      startsAt: yUpcoming,
      endsAt: new Date(yUpcoming.getTime() + 45 * 60 * 1000),
      status: SessionStatus.SCHEDULED,
      livekitRoomName: `ilm-${crypto.randomUUID()}`,
    },
  });

  // Yusuf No-Show Session (5 days ago)
  const yNoShowId = crypto.randomUUID();
  const yNoShowDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      id: yNoShowId,
      studentId: yusufUser.id,
      lecturerId: tariqId,
      lessonId: qaidaLesson.id,
      startsAt: yNoShowDate,
      endsAt: new Date(yNoShowDate.getTime() + 45 * 60 * 1000),
      status: SessionStatus.NO_SHOW_STUDENT,
    },
  });
  await prisma.sessionNotes.create({
    data: {
      sessionId: yNoShowId,
      lecturerId: tariqId,
      topicsCovered: 'Session Missed - Emergency Travel',
      homework: 'Catch up on Qaida audio exercises',
      studentProgressRating: 0,
      sharedNotes: 'Student informed that flight was delayed. Recorded as no-show per policy.',
      internalNotes: 'Advised student to notify 12 hours in advance if possible.',
    },
  });

  // 8. Progress Reports (with Quizzes & Assessments inside contentJson)
  console.log('📝 Creating rich progress reports and assessments...');
  await prisma.progressReport.deleteMany({
    where: {
      lecturerId: tariqId,
      studentId: { in: [zaydUser.id, fatimaUser.id, yusufUser.id] },
    },
  });

  // Zayd's Progress Report
  await prisma.progressReport.create({
    data: {
      studentId: zaydUser.id,
      lecturerId: tariqId,
      periodMonth: 'August 2026',
      generatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      sentAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      contentJson: {
        summary: 'Zayd has shown extraordinary commitment and discipline throughout August. His pronunciation of difficult guttural letters (Ayn, Haa) has improved to near native standards.',
        attendanceRate: '100%',
        overallGrade: 'A+',
        memorizationMilestone: 'Completed Surah An-Naba and Surah An-Nazi\'at (86 verses total) with flawless Tajweed.',
        strengths: [
          'Flawless Noon Sakinah and Tanween rules',
          'Excellent breath control (Waqf) on long verses',
          'Consistent daily revision schedule',
          'Precise Qalqalah execution without unnecessary bounce',
        ],
        improvements: [
          'Maintain Madd Lazim duration strictly to 6 Harakat counts',
          'Slight hesitation when transitioning between melodic cadences',
        ],
        recommendations: 'Approved to advance to Surah Abasa and At-Takwir in the Hifz program. Keep up the high standard!',
        assessments: [
          {
            id: 'as-101',
            title: 'Surah An-Naba Memorization Oral Exam',
            type: 'Oral Recitation Exam',
            score: 98,
            maxScore: 100,
            grade: 'A+',
            date: '2026-08-25',
            remarks: 'Recited all 40 verses without a single stutter. Tajweed rules strictly applied with beautiful melody.',
          },
          {
            id: 'as-102',
            title: 'Mid-Term Tajweed Theoretical Quiz',
            type: 'Written Quiz',
            score: 95,
            maxScore: 100,
            grade: 'A',
            date: '2026-08-15',
            remarks: 'Mastery of all 4 Noon Sakinah rules and their Qur\'anic examples.',
          },
          {
            id: 'as-103',
            title: 'Makharij & Articulation Practical Evaluation',
            type: 'Practical Assessment',
            score: 92,
            maxScore: 100,
            grade: 'A',
            date: '2026-08-05',
            remarks: 'Strong mastery of throat and deep tongue Makharij (Qaf, Kaaf).',
          },
        ],
      },
    },
  });

  // Fatima's Progress Report
  await prisma.progressReport.create({
    data: {
      studentId: fatimaUser.id,
      lecturerId: tariqId,
      periodMonth: 'August 2026',
      generatedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      sentAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      contentJson: {
        summary: 'Fatima is making admirable progress in applied Tajweed. Her confidence in reciting aloud in front of the class has flourished noticeably.',
        attendanceRate: '95%',
        overallGrade: 'A',
        memorizationMilestone: 'Mastered Surah Al-Mulk recitation with applied Tajweed rules.',
        strengths: [
          'Clear pronunciation of Meem Sakinah rules',
          'Receptive to phonetic corrections',
          'Consistent homework submission',
        ],
        improvements: [
          'Needs more practice sustaining Ghunnah for full 2 counts consistently',
        ],
        recommendations: 'Continue daily practice with the provided audio recordings of Sheikh Al-Husary.',
        assessments: [
          {
            id: 'as-201',
            title: 'Tajweed Recitation Evaluation',
            type: 'Oral Recitation Exam',
            score: 91,
            maxScore: 100,
            grade: 'A',
            date: '2026-08-28',
            remarks: 'Accurate application of Idgham with Ghunnah and clear letter articulation.',
          },
          {
            id: 'as-202',
            title: 'Meem Sakinah & Qalqalah Quiz',
            type: 'Written Quiz',
            score: 88,
            maxScore: 100,
            grade: 'B+',
            date: '2026-08-18',
            remarks: 'Understands Ikhfa Shafawi and Idgham Shafawi well.',
          },
        ],
      },
    },
  });

  // Yusuf's Progress Report
  await prisma.progressReport.create({
    data: {
      studentId: yusufUser.id,
      lecturerId: tariqId,
      periodMonth: 'August 2026',
      generatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      sentAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      contentJson: {
        summary: 'Yusuf is establishing strong foundations in recognizing joined Arabic letters and basic Harakat (Fatha, Kasra, Damma).',
        attendanceRate: '85%',
        overallGrade: 'B+',
        memorizationMilestone: 'Completed first 10 lessons of Noorani Qaida.',
        strengths: [
          'High dedication and willingness to learn',
          'Good differentiation between heavy and light letters',
        ],
        improvements: [
          'Extra focus needed on connected letter forms (initial, medial, and final)',
        ],
        recommendations: 'Recommended to use the interactive digital Qaida for 15 minutes each evening.',
        assessments: [
          {
            id: 'as-301',
            title: 'Arabic Alphabet Recognition & Makharij Test',
            type: 'Oral Test',
            score: 86,
            maxScore: 100,
            grade: 'B',
            date: '2026-08-20',
            remarks: 'Great progress on isolated and connected letters.',
          },
        ],
      },
    },
  });

  // 9. Availability Slots for Tariq
  console.log('⏰ Creating availability slots for Sheikh Tariq...');
  await prisma.availabilitySlot.deleteMany({ where: { lecturerId: tariqId } });

  const today = new Date();
  for (let d = 0; d < 14; d++) {
    const slotDate = new Date(today);
    slotDate.setDate(today.getDate() + d);
    const hours = [10, 14, 16];
    for (const h of hours) {
      const startsAt = new Date(slotDate);
      startsAt.setHours(h, 0, 0, 0);
      const endsAt = new Date(startsAt);
      endsAt.setMinutes(45);
      if (startsAt > new Date()) {
        await prisma.availabilitySlot.create({
          data: {
            lecturerId: tariqId,
            startsAt,
            endsAt,
            status: SlotStatus.OPEN,
          },
        });
      }
    }
  }

  console.log('✅ Demo data for Sheikh Tariq seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
