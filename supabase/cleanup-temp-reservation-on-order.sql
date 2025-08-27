-- 注文確定時に仮予約を削除する関数
CREATE OR REPLACE FUNCTION cleanup_temp_reservation_for_order(
  p_session_id TEXT,
  p_date DATE,
  p_time VARCHAR
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_time_value TIME;
BEGIN
  -- timeをTIME型に変換
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  -- セッションIDに関連する仮予約を削除
  DELETE FROM temporary_slot_reservations
  WHERE session_id = p_session_id
    AND date = p_date
    AND time = v_time_value;
END;
$$;