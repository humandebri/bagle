-- よりシンプルな解決策：
-- time_slotsを確認する際に自動的に期限切れをクリーンアップ

-- 1. time_slotsを取得する前に期限切れをクリーンアップするRPC関数
CREATE OR REPLACE FUNCTION get_available_slots_with_cleanup(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  slot_date DATE,
  slot_time TIME,
  slot_max_capacity INTEGER,
  slot_current_bookings INTEGER,
  slot_is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- まず期限切れ予約をクリーンアップ
  PERFORM cleanup_expired_reservations();
  
  -- その後、利用可能なスロットを返す
  RETURN QUERY
  SELECT 
    ts.date AS slot_date,
    ts.time AS slot_time,
    ts.max_capacity AS slot_max_capacity,
    ts.current_bookings AS slot_current_bookings,
    ts.is_available AS slot_is_available
  FROM time_slots ts
  WHERE 
    (p_start_date IS NULL OR ts.date >= p_start_date)
    AND (p_end_date IS NULL OR ts.date <= p_end_date)
  ORDER BY ts.date, ts.time;
END;
$$;

-- 2. validate-time-slotでも期限切れチェックを実行
CREATE OR REPLACE FUNCTION validate_time_slot_with_cleanup(
  p_date DATE,
  p_time VARCHAR,
  p_user_email TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
  v_has_existing_order BOOLEAN DEFAULT FALSE;
  v_result JSON;
BEGIN
  -- 期限切れ予約をクリーンアップ
  PERFORM cleanup_expired_reservations();
  
  -- スロット情報を取得
  SELECT * INTO v_slot
  FROM time_slots
  WHERE date = p_date AND time = p_time::TIME;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'この時間枠は利用できません'
    );
  END IF;
  
  -- ユーザーの既存予約をチェック
  IF p_user_email IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM orders
      WHERE customer_email = p_user_email
        AND dispatch_date = p_date
        AND dispatch_time = p_time::TEXT
        AND payment_status != 'cancelled'
    ) INTO v_has_existing_order;
  END IF;
  
  -- ユーザーが既に予約を持っている場合
  IF v_has_existing_order THEN
    RETURN json_build_object(
      'valid', true,
      'message', '既存の予約時間枠です',
      'existingBooking', true
    );
  END IF;
  
  -- スロットの利用可能性をチェック
  IF NOT v_slot.is_available OR v_slot.current_bookings >= v_slot.max_capacity THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'この時間枠は満員です'
    );
  END IF;
  
  -- 利用可能
  RETURN json_build_object(
    'valid', true,
    'message', '時間枠は利用可能です',
    'remainingCapacity', v_slot.max_capacity - v_slot.current_bookings
  );
END;
$$;