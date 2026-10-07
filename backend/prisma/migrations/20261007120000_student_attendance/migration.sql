ALTER TABLE "sessions"
ADD COLUMN "student_joined_at" TIMESTAMP(3),
ADD COLUMN "student_last_seen_at" TIMESTAMP(3),
ADD COLUMN "student_left_at" TIMESTAMP(3),
ADD COLUMN "attendance_prompt_after" TIMESTAMP(3),
ADD COLUMN "attendance_reset_at" TIMESTAMP(3);
