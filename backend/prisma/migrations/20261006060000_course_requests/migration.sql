CREATE TYPE "CourseRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
CREATE TABLE "course_requests" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "lecturer_id" TEXT NOT NULL,
  "learning_path_id" TEXT NOT NULL,
  "status" "CourseRequestStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  CONSTRAINT "course_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "course_requests_student_id_learning_path_id_key" ON "course_requests"("student_id", "learning_path_id");
CREATE INDEX "course_requests_lecturer_id_status_idx" ON "course_requests"("lecturer_id", "status");
ALTER TABLE "course_requests" ADD CONSTRAINT "course_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_requests" ADD CONSTRAINT "course_requests_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_requests" ADD CONSTRAINT "course_requests_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;
