# 営業日カレンダー管理API仕様

## エンドポイント一覧

### 1. 営業日管理

#### GET /api/admin/business-calendar/days
特定期間の営業日情報を取得

**クエリパラメータ:**
- `start`: 開始日 (YYYY-MM-DD)
- `end`: 終了日 (YYYY-MM-DD)

**レスポンス:**
```json
{
  "days": [
    {
      "id": "uuid",
      "date": "2025-01-14",
      "is_open": true,
      "is_special": false,
      "notes": null
    }
  ]
}
```

#### POST /api/admin/business-calendar/days
営業日情報を作成・更新

**リクエストボディ:**
```json
{
  "date": "2025-01-14",
  "is_open": true,
  "is_special": false,
  "notes": "特別営業"
}
```

#### DELETE /api/admin/business-calendar/days/:date
特定日の営業日情報を削除（デフォルトに戻す）

### 2. 営業時間管理

#### GET /api/admin/business-calendar/hours
曜日別営業時間を取得

**レスポンス:**
```json
{
  "hours": [
    {
      "id": "uuid",
      "day_of_week": 0,
      "open_time": "11:00",
      "close_time": "13:00",
      "is_closed": false
    }
  ]
}
```

#### PUT /api/admin/business-calendar/hours/:dayOfWeek
曜日別営業時間を更新

**リクエストボディ:**
```json
{
  "open_time": "11:00",
  "close_time": "13:00",
  "is_closed": false
}
```

### 3. 定期休業日管理

#### GET /api/admin/business-calendar/recurring-holidays
定期休業日パターンを取得

**レスポンス:**
```json
{
  "holidays": [
    {
      "id": "uuid",
      "name": "第4日曜日",
      "type": "monthly",
      "pattern": {
        "week": 4,
        "dayOfWeek": 0
      },
      "is_active": true
    }
  ]
}
```

#### POST /api/admin/business-calendar/recurring-holidays
定期休業日パターンを作成

#### PUT /api/admin/business-calendar/recurring-holidays/:id
定期休業日パターンを更新

#### DELETE /api/admin/business-calendar/recurring-holidays/:id
定期休業日パターンを削除

## エラーレスポンス

```json
{
  "error": "エラーメッセージ",
  "code": "ERROR_CODE"
}
```

## 認証
すべてのエンドポイントは管理者権限が必要