-- Preserve regional cross-rates using CBSL USD/LKR 330.793 on 2026-09-29.
-- Source: https://www.cbsl.gov.lk/cbsl_custom/charts/usd/oneweek.php
ALTER TABLE "pricing_currencies" RENAME COLUMN "rate_per_usd" TO "lkr_per_unit";
UPDATE "pricing_currencies" SET "lkr_per_unit" = 330.793 / "lkr_per_unit", "updated_at" = CURRENT_TIMESTAMP;
INSERT INTO "pricing_currencies" ("code", "region", "lkr_per_unit", "rate_date") VALUES ('LKR', 'Sri Lanka', 1, '2026-09-29');
