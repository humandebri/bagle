-- 期限切れ予約を自動的にクリーンアップする関数
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_order RECORD;
BEGIN
  -- 期限切れの注文を取得してループ処理
  FOR expired_order IN 
    SELECT id, dispatch_date, dispatch_time
    FROM orders
    WHERE payment_status = 'pending'
      AND reservation_expires_at IS NOT NULL
      AND reservation_expires_at < NOW()
  LOOP
    -- 1. 注文をキャンセル状態に更新
    UPDATE orders
    SET 
      payment_status = 'cancelled',
      shipped = false,
      updated_at = NOW()
    WHERE id = expired_order.id;

    -- 2. タイムスロットの予約数を減らす
    UPDATE time_slots
    SET 
      current_bookings = GREATEST(0, current_bookings - 1),
      is_available = CASE 
        WHEN current_bookings - 1 < max_capacity THEN true 
        ELSE false 
      END
    WHERE 
      date = expired_order.dispatch_date
      AND time = expired_order.dispatch_time;

    -- ログ出力（オプション）
    RAISE NOTICE 'Cancelled expired order %', expired_order.id;
  END LOOP;
END;
$$;

-- 定期的に実行するための拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5分ごとに期限切れチェックを実行するジョブを作成
-- 注意: pg_cronはSupabaseのProプラン以上で利用可能
SELECT cron.schedule(
  'cleanup-expired-reservations', -- ジョブ名
  '*/5 * * * *', -- 5分ごと
  'SELECT cleanup_expired_reservations();'
);

-- 代替案: トリガーベースの方法
-- 注文が作成/更新されるたびに期限切れチェックを実行
CREATE OR REPLACE FUNCTION check_and_cleanup_expired_on_action()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 期限切れ予約のクリーンアップを実行
  PERFORM cleanup_expired_reservations();
  RETURN NEW;
END;
$$;

-- トリガーを作成（orders テーブルへのINSERT時に実行）
DROP TRIGGER IF EXISTS cleanup_expired_on_order_insert ON orders;
CREATE TRIGGER cleanup_expired_on_order_insert
  AFTER INSERT ON orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION check_and_cleanup_expired_on_action();

-- time_slotsテーブルへのアクセス時にも実行（より頻繁なチェック）
DROP TRIGGER IF EXISTS cleanup_expired_on_slot_access ON time_slots;
CREATE TRIGGER cleanup_expired_on_slot_access
  AFTER UPDATE ON time_slots
  FOR EACH STATEMENT
  EXECUTE FUNCTION check_and_cleanup_expired_on_action();