-- 注文の自動キャンセル機能を削除

-- 1. トリガーを削除
DROP TRIGGER IF EXISTS cleanup_expired_on_order_insert ON orders;
DROP TRIGGER IF EXISTS cleanup_expired_on_slot_access ON time_slots;

-- 2. 関数を削除
DROP FUNCTION IF EXISTS check_and_cleanup_expired_on_action();
DROP FUNCTION IF EXISTS cleanup_expired_reservations();

-- 3. ordersテーブルからreservation_expires_atカラムを削除
ALTER TABLE orders DROP COLUMN IF EXISTS reservation_expires_at;

-- 4. インデックスも削除（存在する場合）
DROP INDEX IF EXISTS idx_orders_reservation_expires_at;