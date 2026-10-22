CREATE TABLE "course_assessments" (
  "id" TEXT NOT NULL,
  "learning_path_id" TEXT NOT NULL,
  "lecturer_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "questions" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_assessments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "course_assessments_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "course_assessments_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "course_assessments_learning_path_id_lecturer_id_idx" ON "course_assessments"("learning_path_id", "lecturer_id");
