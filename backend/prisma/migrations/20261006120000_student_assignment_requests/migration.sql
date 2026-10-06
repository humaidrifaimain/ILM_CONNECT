INSERT INTO "support_tickets" ("id", "user_id", "type", "reason", "status", "created_at")
SELECT gen_random_uuid()::text, u."id", 'STUDENT_REGISTRATION',
       'Student awaiting lecturer assignment. Review the available time windows before assigning.',
       'PENDING', CURRENT_TIMESTAMP
FROM "users" u
JOIN "student_profiles" s ON s."user_id" = u."id"
WHERE u."role" = 'STUDENT' AND u."status" = 'ACTIVE' AND u."deleted_at" IS NULL
  AND s."assigned_lecturer_id" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "support_tickets" t
    WHERE t."user_id" = u."id" AND t."type" = 'STUDENT_REGISTRATION'
  );
