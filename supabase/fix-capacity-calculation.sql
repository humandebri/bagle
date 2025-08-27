-- 管理者設定を尊重した利用可能枠数を計算する関数に修正
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
  v_time_value TIME;
BEGIN
  -- 期限切れの仮予約をクリーンアップ
  DELETE FROM temporary_slot_reservations
  WHERE expires_at < NOW();
  
  -- timeを統一形式に変換
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  -- スロット情報を取得
  SELECT * INTO v_slot
  FROM time_slots
  WHERE date = p_date AND time = v_time_value;
  
  IF NOT FOUND OR NOT v_slot.is_available THEN
    RETURN 0;
  END IF;
  
  -- 仮予約数をカウント（自分のセッション以外）
  SELECT COUNT(*) INTO v_temp_reservations
  FROM temporary_slot_reservations
  WHERE date = p_date 
    AND time = v_time_value
    AND expires_at > NOW()
    AND (p_session_id IS NULL OR session_id != p_session_id);
  
  -- 利用可能枠数 = 最大枠数 - 管理者設定の予約数 - 仮予約数
  -- current_bookingsは管理者が設定した「確定済み予約数」として扱う
  RETURN GREATEST(0, v_slot.max_capacity - v_slot.current_bookings - v_temp_reservations);
END;
$$;

-- 注文作成時にcurrent_bookingsを更新する関数
CREATE OR REPLACE FUNCTION increment_current_bookings(
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
  -- timeを統一形式に変換
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  -- current_bookingsを増やす
  UPDATE time_slots
  SET 
    current_bookings = current_bookings + 1,
    is_available = CASE 
      WHEN current_bookings + 1 >= max_capacity THEN false 
      ELSE is_available 
    END
  WHERE date = p_date AND time = v_time_value;
END;
$$;

-- 注文キャンセル時にcurrent_bookingsを減らす関数
CREATE OR REPLACE FUNCTION decrement_current_bookings(
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
  -- timeを統一形式に変換
  v_time_value := CASE 
    WHEN LENGTH(p_time) = 5 THEN (p_time || ':00')::TIME
    ELSE p_time::TIME
  END;
  
  -- current_bookingsを減らす
  UPDATE time_slots
  SET 
    current_bookings = GREATEST(0, current_bookings - 1),
    is_available = true  -- キャンセルで枠が空いたら利用可能にする
  WHERE date = p_date AND time = v_time_value;
END;
$$;

-- 以前のコメントを削除
COMMENT ON COLUMN time_slots.current_bookings IS NULL;