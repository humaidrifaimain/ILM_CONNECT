CREATE TABLE "subscription_plans" (
  "id" TEXT PRIMARY KEY,
  "course_id" TEXT NOT NULL,
  "course" TEXT NOT NULL,
  "tier" TEXT NOT NULL,
  "monthly_usd" DOUBLE PRECISION NOT NULL CHECK ("monthly_usd" > 0 AND "monthly_usd" <= 10000),
  "sessions" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Initialize existing advertised prices as persistent application configuration.
INSERT INTO "subscription_plans" ("id", "course_id", "course", "tier", "monthly_usd", "sessions") VALUES
('beginner-qaida-standard', 'beginner-qaida', 'Noorani Qaida', 'Standard', 59, 8),
('beginner-qaida-fast-track', 'beginner-qaida', 'Noorani Qaida', 'Fast Track', 89, 12),
('intermediate-tajweed-standard', 'intermediate-tajweed', 'Tajweed Quran Recitation', 'Standard', 59, 8),
('intermediate-tajweed-fast-track', 'intermediate-tajweed', 'Tajweed Quran Recitation', 'Fast Track', 89, 12),
('advanced-hifz-standard', 'advanced-hifz', 'Hifz Memorization', 'Standard', 59, 8),
('advanced-hifz-fast-track', 'advanced-hifz', 'Hifz Memorization', 'Fast Track', 89, 12);
