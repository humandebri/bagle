# 時間枠予約システムの簡略化移行手順

## 概要
time_slotsテーブルのみで仮予約を管理するシンプルな設計に移行します。

## 主な変更点
1. ✅ `temporary_slot_reservations`テーブルを削除
2. ✅ `time_slots`テーブルに仮予約フィールドを追加
3. ✅ 15分間の自動期限切れ機能を実装
4. ✅ APIをすべて新しいシステムに対応させる

## データベース移行手順

### Supabase Dashboardで実行する手順:

1. **Supabase Dashboard**にログイン
2. **SQL Editor**を開く
3. 以下のSQLファイルの内容をコピーして実行:
   - `/supabase/simplify-to-time-slots-only.sql`

### 移行後の確認:

1. 以下のコマンドで移行が完了したか確認:
```bash
npx tsx scripts/apply-migration.ts
```

2. すべての関数とフィールドが存在することを確認:
   - ✅ `cleanup_expired_time_slot_reservations`関数
   - ✅ `reserve_time_slot`関数  
   - ✅ `check_slot_availability`関数
   - ✅ `release_time_slot_reservation`関数
   - ✅ `time_slots.reservation_session_id`フィールド
   - ✅ `time_slots.reservation_expires_at`フィールド

## 新しいシステムの動作

### 仮予約の流れ:
1. ユーザーが時間枠を選択
2. `reserve_time_slot`関数で15分間の仮予約を作成
3. `time_slots.current_bookings = 1`で仮予約中を表示
4. 15分後に自動的に期限切れ（`cleanup_expired_time_slot_reservations`）

### 注文確定時:
1. `release_time_slot_reservation`で仮予約を解放
2. `increment_current_bookings`で実際の予約数を増やす

## APIの更新状況

| API | 状態 | 備考 |
|-----|------|------|
| `/api/update-time-slot` | ✅ 完了 | 新しい`reserve_time_slot`関数を使用 |
| `/api/validate-time-slot` | ✅ 完了 | 新しい`check_slot_availability`関数を使用（フォールバック付き） |
| `/api/create-order` | ✅ 完了 | 新しい`release_time_slot_reservation`関数を使用（フォールバック付き） |

## テスト手順

1. **仮予約のテスト**:
   - オンラインショップで時間枠を選択
   - 15分待って自動解放されることを確認

2. **注文完了のテスト**:
   - 商品をカートに追加
   - 時間枠を選択
   - 注文を完了
   - 仮予約が正しく解放されることを確認

3. **管理者設定との連動確認**:
   - `/admin/time_slots`でcurrent_bookingsを設定
   - その設定が反映されることを確認

## トラブルシューティング

### エラー: 関数が見つからない
→ SQL移行が完了していません。Supabase DashboardでSQLを実行してください。

### エラー: 時間枠が予約できない  
→ セッションIDが正しく設定されているか確認してください。

### エラー: 15分後に解放されない
→ `cleanup_expired_time_slot_reservations`関数が正しく作成されているか確認してください。