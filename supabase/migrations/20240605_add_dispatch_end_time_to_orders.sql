-- Add dispatch_end_time to orders to keep pickup window end times.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dispatch_end_time TEXT;

-- Backfill from time_slots when possible.
UPDATE orders o
SET dispatch_end_time = TO_CHAR(ts.end_time, 'HH24:MI')
FROM time_slots ts
WHERE
  o.dispatch_end_time IS NULL
  AND o.dispatch_date IS NOT NULL
  AND o.dispatch_time IS NOT NULL
  AND ts.date = TO_DATE(o.dispatch_date, 'YYYY-MM-DD')
  AND ts.time = TO_TIMESTAMP(o.dispatch_time, 'HH24:MI');
