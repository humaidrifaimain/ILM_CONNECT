CREATE TABLE "pricing_currencies" ("code" TEXT PRIMARY KEY, "region" TEXT NOT NULL, "rate_per_usd" DOUBLE PRECISION NOT NULL CHECK ("rate_per_usd" > 0), "rate_date" TEXT NOT NULL, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO "pricing_currencies" ("code", "region", "rate_per_usd", "rate_date") VALUES
('USD','United States',1,'2026-09-29'),
('GBP','United Kingdom',0.85718/1.1355,'2026-09-29'),
('EUR','Europe',1/1.1355,'2026-09-29'),
('AUD','Australia',1.6211/1.1355,'2026-09-29');
