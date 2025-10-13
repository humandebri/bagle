-- Add end_time column to time_slots for explicit slot duration handling.
ALTER TABLE time_slots
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- Backfill existing rows using previously implied ranges.
-- For rice_flour and other categories we fallback to 15 minute increments,
-- with 12:00 slots keeping the original 15:00 end.
UPDATE time_slots
SET end_time = CASE
  WHEN time = '11:00:00' THEN '11:15:00'
  WHEN time = '11:15:00' THEN '11:30:00'
  WHEN time = '11:30:00' THEN '11:45:00'
  WHEN time = '11:45:00' THEN '12:00:00'
  WHEN time = '12:00:00' THEN '15:00:00'
  ELSE time + INTERVAL '15 minutes'
END
WHERE end_time IS NULL;

-- Ensure column is required going forward.
ALTER TABLE time_slots
  ALTER COLUMN end_time SET NOT NULL;
