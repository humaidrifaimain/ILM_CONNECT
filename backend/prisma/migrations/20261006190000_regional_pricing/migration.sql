ALTER TABLE "subscription_plans" ADD COLUMN "monthly_lkr" DOUBLE PRECISION;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_positive_lkr" CHECK (monthly_lkr IS NULL OR (monthly_lkr > 0 AND monthly_lkr <= 10000000));
ALTER TABLE "pricing_currencies" ADD COLUMN "source" TEXT, ADD COLUMN "fetched_at" TIMESTAMP(3);
