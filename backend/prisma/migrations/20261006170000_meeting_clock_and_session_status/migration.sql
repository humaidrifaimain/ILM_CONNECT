ALTER TABLE "sessions" ADD COLUMN "meeting_started_at" TIMESTAMP(3), ADD COLUMN "rescheduled_at" TIMESTAMP(3);
CREATE INDEX "sessions_status_meeting_started_at_idx" ON "sessions"("status", "meeting_started_at");
UPDATE "sessions" AS s SET "rescheduled_at" = a.last_rescheduled
FROM (SELECT "entity_id", MAX("created_at") AS last_rescheduled FROM "audit_logs" WHERE "action" = 'SESSION_RESCHEDULED' AND "entity" = 'SESSION' GROUP BY "entity_id") AS a
WHERE s."id" = a."entity_id";
