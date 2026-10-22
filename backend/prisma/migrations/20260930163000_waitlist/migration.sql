CREATE TABLE "waitlist_entries" ("id" TEXT PRIMARY KEY, "full_name" TEXT NOT NULL, "email" TEXT NOT NULL, "phone" TEXT NOT NULL, "country" TEXT NOT NULL, "course" TEXT NOT NULL, "pace" TEXT NOT NULL, "notes" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "waitlist_entries_email_course_key" ON "waitlist_entries"("email", "course");
