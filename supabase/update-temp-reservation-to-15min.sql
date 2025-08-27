-- 仮予約の有効期限を15分に更新

-- 既存の関数を更新（15分で期限切れ）
CREATE OR REPLACE FUNCTION create_temporary_reservation(
  p_session_id TEXT,
  p_date DATE,
  p_time VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_time_value TIME;
BEGIN
  -- 期限切れの仮予約をクリーンアップ
  DELETE FROM temporary_slot_reservations
  WHERE expires_at < NOW();
  
  -- timeをTIME型に変換（"12:00" or "12:00:00"）
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  -- 既存の仮予約を削除（同じセッション）
  DELETE FROM temporary_slot_reservations
  WHERE session_id = p_session_id;
  
  -- 新しい仮予約を作成（15分後に期限切れ）
  INSERT INTO temporary_slot_reservations (session_id, date, time, expires_at)
  VALUES (p_session_id, p_date, v_time_value, NOW() + INTERVAL '15 minutes')
  ON CONFLICT (session_id, date, time) 
  DO UPDATE SET expires_at = NOW() + INTERVAL '15 minutes';
  
  v_result := json_build_object(
    'success', true,
    'expires_at', (NOW() + INTERVAL '15 minutes')::TEXT
  );
  
  RETURN v_result;
END;
$$;

-- 利用可能な枠数を計算する関数（仮予約を考慮）
CREATE OR REPLACE FUNCTION get_available_capacity(
  p_date DATE,
  p_time VARCHAR,
  p_session_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
  v_temp_reservations INTEGER;
  v_orders INTEGER;
  v_time_value TIME;
  v_time_string VARCHAR;
BEGIN
  -- 期限切れの仮予約をクリーンアップ
  DELETE FROM temporary_slot_reservations
  WHERE expires_at < NOW();
  
  -- timeを統一形式に変換
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  v_time_string := p_time::VARCHAR(5); -- "12:00"形式
  
  -- スロット情報を取得
  SELECT * INTO v_slot
  FROM time_slots
  WHERE date = p_date AND time = v_time_value;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- 仮予約数をカウント（自分のセッション以外）
  SELECT COUNT(*) INTO v_temp_reservations
  FROM temporary_slot_reservations
  WHERE date = p_date 
    AND time = v_time_value
    AND expires_at > NOW()
    AND (p_session_id IS NULL OR session_id != p_session_id);
  
  -- 確定済み注文数をカウント
  SELECT COUNT(*) INTO v_orders
  FROM orders
  WHERE dispatch_date = p_date::TEXT
    AND dispatch_time = v_time_string
    AND payment_status != 'cancelled';
  
  -- 利用可能枠数 = 最大枠数 - 確定注文数 - 仮予約数
  RETURN GREATEST(0, v_slot.max_capacity - v_orders - v_temp_reservations);
END;
$$;