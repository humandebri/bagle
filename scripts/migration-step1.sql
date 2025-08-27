-- Step 1: Add columns to time_slots table
ALTER TABLE time_slots 
ADD COLUMN IF NOT EXISTS reservation_session_id TEXT DEFAULT NULL;

ALTER TABLE time_slots
ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for expiry checking
CREATE INDEX IF NOT EXISTS idx_time_slots_reservation_expires_at 
ON time_slots(reservation_expires_at) 
WHERE reservation_expires_at IS NOT NULL;