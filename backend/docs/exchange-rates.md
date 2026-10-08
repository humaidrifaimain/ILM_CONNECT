# Automatic exchange rates and regional prices

Apply migration `20261006190000_regional_pricing` before starting the updated backend. It adds the independent, nullable `monthly_lkr` plan price and exchange source/retrieval metadata. Existing USD prices and recorded payment amounts stay intact. Admins must enter their chosen Sri Lankan prices in Configuration; the migration does not invent those prices.

`ExchangeRateService` retrieves USD-based LKR, GBP, EUR and AUD rates from Frankfurter v2 on startup and every five minutes. Requests also trigger a refresh when due, with concurrent requests sharing one fetch. The public daily reference feed needs no API key. It is not an intraday trading feed or Google Finance integration. Google documents that GOOGLEFINANCE quotes can be delayed; connecting a Google Sheet would require a supplied sheet and access configuration.

The backend validates completeness, dates and positive rates, calculates LKR per foreign unit, and saves all five currencies atomically under a database advisory lock. Snapshots include `source`, provider `rateDate` (a date only), and `fetchedAt` (the actual retrieval timestamp). The provider does not supply a publication time, so retrieval time must not be described as that time. Finance presents retrieval time in Asia/Colombo and exports the UTC timestamp.

If refresh fails, the stored snapshot is retained and labelled stale. Unsourced legacy manual rows are unavailable for foreign conversion until a successful automatic fetch. Snapshots retrieved more than ten minutes ago or dated more than four days ago are stale; stale conversions are hidden. Configured USD and LKR prices remain available without a feed. Conversions use the backend snapshot and round final amounts to two decimals.

Sri Lankan displayed prices use `monthlyLkr` directly. GBP/EUR/AUD displayed prices convert the international `monthlyUsd` price. Finance's international LKR equivalent is a current reference valuation, separate from the local price and from money collected. Historical revenue continues to sum recorded successful `Payment.amountLkr` amounts. Payment checkout is still the existing unconnected gateway flow; this change does not add charging or gateway settlement.

Finance and public/student plan displays refresh every thirty seconds. Configuration avoids focus/interval refreshes while editing so unsaved inputs are not reset. Manual currency PATCH routes and inputs have been removed.

Sources: https://frankfurter.dev/ and https://support.google.com/docs/answer/3093281?hl=en
